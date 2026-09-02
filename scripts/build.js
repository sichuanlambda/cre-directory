#!/usr/bin/env node
/**
 * Static site generator for cresoftware.tech.
 *
 * Reads data/products.json + data/categories.json and renders:
 *   products/<slug>/index.html    — one indexable page per product
 *   categories/<slug>/index.html  — one indexable page per category
 *   alternatives/<slug>/ + /alternatives/, compare/<a>-vs-<b>/, integrations/<hub>/
 *   sitemap.xml (lastmod from data/lastmod.json content hashes), llms.txt
 *   Shared footer / editorial blocks injected into hand pages between marker comments.
 *
 * Zero dependencies. Run from the repo root:  node scripts/build.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'https://cresoftware.tech';
const YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().slice(0, 10);

// Listings marked unverifiable (dead/parked domains, unconfirmable products)
// stay in the data for later review but are never published.
const ALL_PRODUCTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/products.json'), 'utf8'));
const PRODUCTS = ALL_PRODUCTS.filter(p => p.status !== 'unverifiable');
const CATEGORIES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/categories.json'), 'utf8'));
const EDITORIAL = fs.existsSync(path.join(ROOT, 'data/editorial.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/editorial.json'), 'utf8'))
  : { alternatives: {}, comparisons: [] };
const productBySlug = {};

// ---------- helpers ----------
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '');

const externalUrl = u => {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
};

function slugify(str) {
  return String(str).toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').trim();
}

const COLORS = ['#4361ee','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#3498db','#e91e63','#00bcd4'];
function getColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function logoHTML(product, size = 48, lazy = true) {
  const letter = esc((product.title || '?')[0].toUpperCase());
  const color = getColor(product.title || '?');
  if (!product.logo_url) {
    return `<div class="fallback" style="display:flex;background:${color};width:${size}px;height:${size}px;font-size:${size * 0.45}px">${letter}</div>`;
  }
  return `<img src="${esc(product.logo_url)}" alt="${esc(product.title)} logo"${lazy ? ' loading="lazy"' : ''}
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    style="width:${size}px;height:${size}px;object-fit:contain">
    <div class="fallback" style="display:none;background:${color};width:${size}px;height:${size}px;font-size:${size * 0.45}px">${letter}</div>`;
}

function starsHTML(rating, size = 16) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return `<span class="stars" style="font-size:${size}px">${'★'.repeat(full)}${half ? '⯨' : ''}${'☆'.repeat(empty)}</span>`;
}

function pricingLabel(product) {
  const p = product.pricing || {};
  if (p.starting_price) return p.starting_price;
  if (p.free_tier) return 'Free';
  if (p.model === 'Free') return 'Free';
  if (p.model === 'Subscription') return 'Subscription';
  return 'Contact for pricing';
}

const productPath = slug => `/products/${slug}/`;
const badSlug = s => !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);
const alternativesPath = slug => `/alternatives/${slug}/`;
const comparePath = (a, b) => `/compare/${a}-vs-${b}/`;
const comparisonsFor = slug => (EDITORIAL.comparisons || []).filter(c => c.a === slug || c.b === slug);
const categoryPath = slug => `/categories/${slug}/`;
const categoryBySlug = slug => CATEGORIES[slug];
const categoryByName = name => Object.values(CATEGORIES).find(c => c.name === name);

// ---------- lastmod store ----------
// data/lastmod.json remembers a content hash per URL. A page's lastmod only moves when the
// content between the nav and the footer actually changes, so the sitemap stays truthful
// instead of stamping today's date on every URL at every build.
const crypto = require('crypto');
const LASTMOD_FILE = path.join(ROOT, 'data/lastmod.json');
const LASTMOD = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')) : {};
const LASTMOD_TOKEN = '{{LASTMOD}}', FIRSTMOD_TOKEN = '{{FIRSTMOD}}', LASTMOD_FMT_TOKEN = '{{LASTMOD_FMT}}';
const fmtDate = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
function contentHash(html) {
  const s = html.indexOf('</nav>'), e = html.lastIndexOf('<footer');
  const body = s !== -1 && e !== -1 && e > s ? html.slice(s, e) : html;
  return crypto.createHash('sha1').update(body).digest('hex').slice(0, 16);
}
function trackLastmod(urlPath, html, seedDate) {
  const hash = contentHash(html);
  const prev = LASTMOD[urlPath];
  const seed = (seedDate || TODAY).slice(0, 10);
  if (!prev) LASTMOD[urlPath] = { hash, date: seed, first: seed };
  else if (!prev.hash) LASTMOD[urlPath] = { hash, date: prev.date || seed, first: prev.first || prev.date || seed };
  else if (prev.hash !== hash) LASTMOD[urlPath] = { hash, date: TODAY, first: prev.first || prev.date };
  return LASTMOD[urlPath];
}
function stampDates(html, entry) {
  return html.split(LASTMOD_TOKEN).join(entry.date).split(FIRSTMOD_TOKEN).join(entry.first).split(LASTMOD_FMT_TOKEN).join(fmtDate(entry.date));
}
// Writes <ROOT><urlPath>index.html, tracking lastmod and stamping date tokens.
function writePage(urlPath, html, seedDate) {
  const entry = trackLastmod(urlPath, html, seedDate);
  const dir = path.join(ROOT, urlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), stampDates(html, entry));
  return entry;
}
function saveLastmod() {
  const keys = Object.keys(LASTMOD).sort();
  fs.writeFileSync(LASTMOD_FILE, '{\n' + keys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(LASTMOD[k])}`).join(',\n') + '\n}\n');
}

// ---------- editorial helpers ----------
const guideFiles = () => fs.existsSync(path.join(ROOT, 'guides')) ? fs.readdirSync(path.join(ROOT, 'guides')).filter(f => f.endsWith('.html')).sort() : [];
const guideFor = catSlug => fs.existsSync(path.join(ROOT, 'guides', `${catSlug}.html`)) ? `/guides/${catSlug}.html` : null;
function primaryCatOf(product) {
  if (product.primary_category && categoryBySlug(product.primary_category)) return categoryBySlug(product.primary_category);
  return categoryByName((product.categories || [])[0]) || null;
}
const altEntries = () => Object.entries(EDITORIAL.alternatives || {}).map(([slug, alt]) => ({ slug, alt, product: PRODUCTS.find(p => p.slug === slug) })).filter(x => x.product);
const altsSorted = () => altEntries().sort((a, b) => ((b.product.is_featured ? 1 : 0) - (a.product.is_featured ? 1 : 0)) || a.product.title.localeCompare(b.product.title));
const cmpEntries = () => (EDITORIAL.comparisons || []).map(c => ({ cmp: c, A: PRODUCTS.find(p => p.slug === c.a), B: PRODUCTS.find(p => p.slug === c.b) })).filter(x => x.A && x.B);
const altLink = x => `<a href="${alternativesPath(x.slug)}">Best ${esc(x.product.title)} alternatives</a>`;
const cmpLink = x => `<a href="${comparePath(x.cmp.a, x.cmp.b)}">${esc(x.A.title)} vs ${esc(x.B.title)}</a>`;
const linkList = items => items.length ? `<ul class="link-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '';
function editorialForCategory(cat) {
  const members = new Set(cat.products || []);
  return { alts: altsSorted().filter(x => members.has(x.slug)), cmps: cmpEntries().filter(x => members.has(x.cmp.a) || members.has(x.cmp.b)) };
}
const altMentions = slug => altsSorted().filter(x => x.slug !== slug && (x.alt.picks || []).some(p => p.slug === slug));
const firstSentence = (s, max = 170) => { const t = String(s || '').split(/(?<=\.)\s/)[0] || ''; return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t; };
function articleLd(headline, canonical, description) {
  return { "@context": "https://schema.org", "@type": "Article", "headline": headline, "description": description, "mainEntityOfPage": canonical,
    "datePublished": FIRSTMOD_TOKEN, "dateModified": LASTMOD_TOKEN,
    "author": { "@type": "Organization", "name": "CRE Software Directory", "url": BASE },
    "publisher": { "@type": "Organization", "name": "CRE Software Directory", "url": BASE, "logo": { "@type": "ImageObject", "url": `${BASE}/img/apple-touch-icon.png` } } };
}
const updatedLine = () => `<p class="updated-line">Updated ${LASTMOD_FMT_TOKEN}. Independent editorial; <a href="/about.html">how we research</a>.</p>`;
// Chips linking every alternatives guide (homepage + compare hub).
const altChipsHTML = () => `<div style="display:flex;flex-wrap:wrap;gap:10px">${altsSorted().map(x => `<a href="${alternativesPath(x.slug)}" class="badge badge-accent" style="font-size:13px;padding:6px 12px">${esc(x.product.title)} alternatives</a>`).join('')}</div>`;

function compactProductCard(p) {
  return `<a class="product-card product-card-compact product-card-link" href="${productPath(p.slug)}">
    <div class="card-top">
      <div class="product-logo" style="width:40px;height:40px">${logoHTML(p, 40)}</div>
      <div class="product-info">
        <h3>${esc(p.title)}</h3>
        <div class="tagline">${esc(p.short_description || p.tagline || p.headline || '')}</div>
      </div>
    </div>
  </a>`;
}

function productCard(p) {
  const cats = (p.categories || []).slice(0, 2).map(c => `<span class="badge badge-accent">${esc(c)}</span>`).join('');
  const rating = '';
  const priceText = (p.pricing || {}).starting_price || ((p.pricing || {}).free_tier ? 'Free' : '');
  const price = priceText ? `<span class="card-price">${esc(priceText)}</span>` : '';
  const badges = [];
  if (p.pricing && p.pricing.free_trial) badges.push('<span class="badge badge-green">Free Trial</span>');
  if (p.pricing && p.pricing.free_tier) badges.push('<span class="badge badge-green">Free</span>');
  if (p.is_featured) badges.push('<span class="badge badge-gold">Featured</span>');
  const features = (p.feature_groups || []).flatMap(g => g.features || []).slice(0, 3);
  const featHTML = features.length ? `<div class="card-features">${features.map(f => `<span class="card-feature">✦ ${esc(f.name)}</span>`).join('')}</div>` : '';
  const pr = p.pricing || {};
  return `<a class="product-card product-card-link" href="${productPath(p.slug)}" data-title="${esc((p.title || '').toLowerCase())}" data-trial="${pr.free_trial ? 1 : 0}" data-free="${pr.free_tier ? 1 : 0}" data-price="${pr.starting_price ? 1 : 0}" data-featured="${p.is_featured || p.featured_partner ? 1 : 0}">
    <div class="card-top">
      <div class="product-logo">${logoHTML(p)}</div>
      <div class="product-info">
        <h3>${esc(p.title)}</h3>
        <div class="tagline">${esc(p.short_description || p.tagline || p.headline || '')}</div>
        ${rating}
      </div>
    </div>
    ${featHTML}
    <div class="card-bottom">
      <div class="card-meta">${price} ${badges.join('')}</div>
      <div class="cats">${cats}</div>
    </div>
  </a>`;
}

function navHTML(active) {
  const link = (href, label, key) => `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;
  return `<nav>
    <div class="container nav-inner">
      <a href="/" class="logo"><svg class="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><rect x="9" y="9" width="2" height="2" fill="currentColor" stroke="none"/><rect x="13" y="9" width="2" height="2" fill="currentColor" stroke="none"/><rect x="9" y="13" width="2" height="2" fill="currentColor" stroke="none"/><rect x="13" y="13" width="2" height="2" fill="currentColor" stroke="none"/></svg>CRE<span>Software</span></a>
      <button class="mobile-toggle" aria-label="Toggle menu">☰</button>
      <div class="nav-links">
        ${link('/', 'Directory', 'directory')}
        ${link('/market-map.html', 'Market Map', 'map')}
        ${link('/compare.html', 'Compare', 'compare')}
        ${link('/submit.html', 'Submit a Tool', 'submit')}
        ${link('/advertise.html', 'Advertise', 'advertise')}
      </div>
      <div class="nav-search"><input type="search" id="nav-search" placeholder="Search tools…" aria-label="Search software tools" autocomplete="off"><div id="nav-search-results"></div></div>
    </div>
  </nav>`;
}

function footerHTML() {
  const catLinks = Object.values(CATEGORIES).sort((a, b) => b.product_count - a.product_count)
    .map(c => `<a href="${categoryPath(c.slug)}">${esc(c.name)}</a>`).join('');
  const guideLinks = guideFiles()
    .map(f => { const cs = f.replace('.html', ''); const c = categoryBySlug(cs); return { name: c ? c.name : cs, f }; })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => `<a href="/guides/${g.f}">${esc(g.name)}</a>`).join('');
  const altLinks = altsSorted().slice(0, 12).map(x => `<a href="${alternativesPath(x.slug)}">${esc(x.product.title)} alternatives</a>`).join('')
    + `<a href="/alternatives/"><strong>All alternatives guides →</strong></a>`;
  const cmpLinks = cmpEntries().slice(0, 8).map(x => `<a href="${comparePath(x.cmp.a, x.cmp.b)}">${esc(x.A.title)} vs ${esc(x.B.title)}</a>`).join('')
    + `<a href="/compare.html"><strong>All comparisons →</strong></a>`;
  return `<footer>
    <div class="container">
      <div class="footer-cols">
        <div class="footer-col"><h4>Categories</h4>${catLinks}</div>
        <div class="footer-col"><h4>Buyer's Guides</h4>${guideLinks}</div>
        <div class="footer-col"><h4>Alternatives</h4>${altLinks}</div>
        <div class="footer-col"><h4>Comparisons</h4>${cmpLinks}</div>
        <div class="footer-col"><h4>CRE Software Directory</h4>
          <a href="/about.html">About & methodology</a>
          <a href="/submit.html">Submit a tool</a>
          <a href="/advertise.html">Advertise</a>
          <a href="/compare.html">Compare tools</a>
          <a href="/market-map.html">Market map</a>
          <a href="/integrations/">Browse by integration</a>
          <a href="/llms.txt">llms.txt</a>
          <a href="mailto:hello@cresoftware.tech">Contact</a>
        </div>
      </div>
      <div class="footer-inner"><span>© ${YEAR} CRE Software Directory</span><span style="opacity:.6;font-size:12.5px">Independent directory of commercial real estate software.</span></div>
    </div>
  </footer>
  <button id="back-to-top" class="back-to-top" aria-label="Back to top">↑</button>`;
}

const ORG_LD = { "@context": "https://schema.org", "@type": "Organization", "name": "CRE Software Directory", "url": BASE, "logo": `${BASE}/img/apple-touch-icon.png`, "email": "hello@cresoftware.tech" };

function headHTML({ title, description, canonical, ogType = 'website', ogImage = `${BASE}/css/og-image.png`, jsonLd = [] }) {
  const ld = jsonLd.concat([ORG_LD]).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n  ');
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:site_name" content="CRE Software Directory">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/img/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZX9EKESMLP"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ZX9EKESMLP');
  </script>
  <!-- Privacy-friendly analytics by Plausible -->
  <script async src="https://plausible.io/js/pa-u69uN_qYKpZ5mUTg4gO0Z.js"></script>
  <script>
    window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
    plausible.init()
  </script>
  ${ld}`;
}

function comparisonCard(cmp) {
  const A = PRODUCTS.find(p => p.slug === cmp.a);
  const B = PRODUCTS.find(p => p.slug === cmp.b);
  if (!A || !B) return '';
  return `<a class="product-card product-card-link" href="${comparePath(cmp.a, cmp.b)}" style="display:block">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div class="product-logo" style="width:36px;height:36px">${logoHTML(A, 36)}</div>
      <span style="font-weight:700;opacity:.45;font-size:12px">VS</span>
      <div class="product-logo" style="width:36px;height:36px">${logoHTML(B, 36)}</div>
    </div>
    <h3 style="margin:0 0 6px;font-size:16px">${esc(A.title)} vs ${esc(B.title)}</h3>
    <div class="tagline">${esc(cmp.one_liner || '')}</div>
  </a>`;
}

function faqHTMLBlock(faq, heading = 'Frequently Asked Questions') {
  if (!faq || !faq.length) return '';
  return `<div class="faq-section"><h2>${esc(heading)}</h2><div class="faq-list">${faq.map(f => `<details class="faq-item"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</div></div>`;
}
function faqLd(faq) {
  return { "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faq.map(f => ({ "@type": "Question", "name": f.question, "acceptedAnswer": { "@type": "Answer", "text": f.answer } })) };
}

// ---------- product pages ----------
// "Deciding on X?" box: the product's own alternatives guide, its head-to-head pages, and
// every alternatives guide that ranks it as a pick (inbound links for those guides).
function editorialBoxHTML(product) {
  const slug = product.slug;
  const own = EDITORIAL.alternatives && EDITORIAL.alternatives[slug];
  const cmps = comparisonsFor(slug);
  const mentions = altMentions(slug);
  if (!own && !cmps.length && !mentions.length) return '';
  const items = [];
  if (own) items.push(`<li><a href="${alternativesPath(slug)}">Best ${esc(product.title)} alternatives (${YEAR})</a></li>`);
  cmps.forEach(c => {
    const other = c.a === slug ? c.b : c.a;
    const op = PRODUCTS.find(p => p.slug === other);
    if (op) items.push(`<li><a href="${comparePath(c.a, c.b)}">${esc(product.title)} vs ${esc(op.title)}: which is better?</a></li>`);
  });
  mentions.forEach(x => {
    const pos = (x.alt.picks || []).findIndex(p => p.slug === slug) + 1;
    items.push(`<li>Ranked #${pos} in <a href="${alternativesPath(x.slug)}">best ${esc(x.product.title)} alternatives</a></li>`);
  });
  return `<div class="editorial-links" style="margin:24px 0;padding:16px 20px;border-radius:10px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);">
        <strong>Deciding on ${esc(product.title)}?</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          ${items.join('\n          ')}
        </ul>
      </div>`;
}

function renderProductPage(product) {
  const slug = product.slug;
  const canonical = `${BASE}${productPath(slug)}`;
  const seo = product.seo || {};
  const isDefunct = product.status === 'defunct';
  const isEcosystem = !!product.not_software;
  const title = isDefunct
    ? `What Happened to ${product.title}? History & Alternatives | CRE Software Directory`
    : isEcosystem
      ? `${product.title} Overview: What They Do & Related CRE Software | CRE Software Directory`
      : (seo.title || `${product.title} Review ${YEAR}: Pricing, Features & Alternatives | CRE Software Directory`);
  const description = stripTags(seo.description || product.short_description || `${product.title}: ${product.headline || ''} Compare pricing, features & alternatives.`).slice(0, 300);

  const pricing = product.pricing || {};
  const company = product.company || {};
  const ta = product.target_audience || {};
  const siteUrl = externalUrl(product.url);
  const outUrl = externalUrl(product.affiliate_url || product.url);
  const outRel = product.affiliate_url ? 'sponsored noopener' : 'noopener';

  const badges = [];
  if (pricing.free_trial) badges.push('<span class="badge-hero badge-hero-free">Free Trial</span>');
  if (pricing.free_tier) badges.push('<span class="badge-hero badge-hero-free">Free Tier</span>');
  if (product.is_verified) badges.push('<span class="badge-hero badge-hero-verified">✓ Verified</span>');
  if (product.is_featured) badges.push('<span class="badge-hero badge-hero-top">⭐ Featured</span>');

  // Ratings from the old enrichment runs have no verifiable source; until the
  // directory has a real review source, neither stars nor aggregateRating ship.
  const ratingHTML = '';

  const statsItems = [
    { label: 'Starting Price', value: pricingLabel(product) },
    { label: 'Best For', value: (ta.roles || []).join(', ') || 'CRE Professionals' },
    { label: 'Company Size', value: (ta.company_sizes || []).join(', ') || 'All sizes' },
    { label: 'Deployment', value: (product.deployment || []).join(', ') || 'Cloud' },
    { label: 'Property Types', value: (ta.property_types || product.property_types || []).join(', ') || 'All types' }
  ];

  const cats = (product.categories || []).map(c => {
    const cs = categoryByName(c);
    return cs ? `<a href="${categoryPath(cs.slug)}" class="badge badge-accent">${esc(c)}</a>` : `<span class="badge badge-accent">${esc(c)}</span>`;
  }).join(' ');

  const hasPros = product.pros && product.pros.length;
  const hasCons = product.cons && product.cons.length;
  const prosConsHTML = (hasPros || hasCons) ? `<div class="proscons">
    ${hasPros ? `<div class="proscons-col"><h3 class="pros-title">✓ Pros</h3>${product.pros.map(p => `<div class="proscons-item"><span class="icon-pro">✓</span>${esc(p)}</div>`).join('')}</div>` : ''}
    ${hasCons ? `<div class="proscons-col"><h3 class="cons-title">✗ Cons</h3>${product.cons.map(c => `<div class="proscons-item"><span class="icon-con">✗</span>${esc(c)}</div>`).join('')}</div>` : ''}
  </div>` : '';

  const audienceHTML = (ta.roles && ta.roles.length) || (ta.company_sizes && ta.company_sizes.length) || (ta.property_types && ta.property_types.length) ? `
    <div class="audience-section">
      <h3>Who This Is For</h3>
      <div class="audience-grid">
        ${ta.roles && ta.roles.length ? `<div class="audience-item"><div class="audience-label">Roles</div><div class="audience-tags">${ta.roles.map(r => `<span class="badge">${esc(r)}</span>`).join('')}</div></div>` : ''}
        ${ta.company_sizes && ta.company_sizes.length ? `<div class="audience-item"><div class="audience-label">Company Size</div><div class="audience-tags">${ta.company_sizes.map(s => `<span class="badge">${esc(s)}</span>`).join('')}</div></div>` : ''}
        ${ta.property_types && ta.property_types.length ? `<div class="audience-item"><div class="audience-label">Property Types</div><div class="audience-tags">${ta.property_types.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div></div>` : ''}
      </div>
    </div>` : '';

  const fg = product.feature_groups || [];
  const featuresHTML = fg.length ? `<div class="features-section" id="sec-features">
    <h2>${esc(product.title)} Features</h2>
    ${fg.map((g, i) => `<div class="feature-group${i === 0 ? ' open' : ''}">
      <button class="feature-group-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span>${esc(g.name)}</span>
        <span class="fg-count">${(g.features || []).length} features</span>
        <span class="fg-arrow">▸</span>
      </button>
      <div class="feature-group-body">
        ${(g.features || []).map(f => `<div class="feature-row">
          <span class="feature-name">✦ ${esc(f.name)}</span>
          ${f.description ? `<span class="feature-desc">${esc(f.description)}</span>` : ''}
        </div>`).join('')}
      </div>
    </div>`).join('')}
  </div>` : '';

  const plans = pricing.plans || [];
  const hasPricingInfo = plans.length > 0 || pricing.starting_price || pricing.free_trial || pricing.free_tier;
  const pricingHTML = hasPricingInfo ? `<div class="pricing-section" id="sec-pricing">
    <h2>${esc(product.title)} Pricing</h2>
    ${product.last_updated ? `<p style="font-size:12.5px;opacity:.6;margin:-8px 0 12px;">Last verified ${esc(String(product.last_updated).slice(0, 7))}</p>` : ''}
    <div class="pricing-meta">
      <span class="pricing-model-badge">${esc(pricing.model || 'Quote-based')}</span>
      ${pricing.billing_options && pricing.billing_options.length ? `<span class="billing-options">Billing: ${esc(pricing.billing_options.join(', '))}</span>` : ''}
      ${pricing.free_trial ? '<span class="badge badge-green">Free Trial Available</span>' : ''}
      ${pricing.free_tier ? '<span class="badge badge-green">Free Tier Available</span>' : ''}
    </div>
    ${plans.length ? `<div class="pricing-cards">
      ${plans.map(plan => `<div class="pricing-card">
        <div class="plan-name">${esc(plan.name)}</div>
        <div class="plan-price">${esc(plan.price || 'Contact')}</div>
        ${plan.description ? `<div class="plan-desc">${esc(plan.description)}</div>` : ''}
        ${plan.includes && plan.includes.length ? `<ul class="plan-includes">${plan.includes.map(i => `<li>✓ ${esc(i)}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    </div>` : (pricing.starting_price ? `<div class="pricing-contact">
      <p>Starting at <strong>${esc(pricing.starting_price)}</strong></p>
    </div>` : '')}
  </div>` : '';

  const integrationsHTML = product.integrations && product.integrations.length
    ? `<div class="integrations-section"><h3>Integrations</h3><div class="integrations-list">${product.integrations.map(i => {
        const name = typeof i === 'string' ? i : i.name;
        const cat = typeof i === 'object' && i.category ? ` <small>(${esc(i.category)})</small>` : '';
        return `<span class="integration-badge">${esc(name)}${cat}</span>`;
      }).join('')}</div></div>` : '';

  const companyHTML = (company.founded || company.headquarters || company.employees) ? `<div class="company-info" id="sec-company">
    <h2>Company Info</h2>
    <div class="company-info-grid">
      ${company.name ? `<div class="company-info-item"><div class="ci-label">Company</div><div class="ci-value">${esc(company.name)}</div></div>` : ''}
      ${company.founded ? `<div class="company-info-item"><div class="ci-label">Founded</div><div class="ci-value">${esc(company.founded)}</div></div>` : ''}
      ${company.headquarters ? `<div class="company-info-item"><div class="ci-label">Headquarters</div><div class="ci-value">${esc(company.headquarters)}</div></div>` : ''}
      ${company.employees ? `<div class="company-info-item"><div class="ci-label">Employees</div><div class="ci-value">${esc(company.employees)}</div></div>` : ''}
      ${company.funding ? `<div class="company-info-item"><div class="ci-label">Funding</div><div class="ci-value">${esc(company.funding)}</div></div>` : ''}
    </div>
    <a href="${esc(outUrl)}" target="_blank" rel="${outRel}" class="company-link">Visit ${esc(product.title)} →</a>
  </div>` : '';

  // Related tools carousels + similar grid
  let relatedHTML = '';
  const usedSlugs = new Set([slug]);
  (product.categories || []).slice(0, 2).forEach(cat => {
    const related = PRODUCTS.filter(p => !usedSlugs.has(p.slug) && (p.categories || []).includes(cat));
    if (related.length === 0) return;
    const items = related.slice(0, 10);
    const id = 'carousel-' + slugify(cat);
    const cards = items.map(p => { usedSlugs.add(p.slug); return compactProductCard(p); }).join('');
    relatedHTML += `<div class="carousel-group"><h3>${esc(cat)}</h3><div class="carousel-wrapper">
      <button class="carousel-btn prev" onclick="scrollCarousel('${id}',-1)">‹</button>
      <div class="carousel-track" id="${id}">${cards}</div>
      <button class="carousel-btn next" onclick="scrollCarousel('${id}',1)">›</button>
    </div></div>`;
  });

  let similarHTML = '';
  const primaryCat = (product.categories || [])[0];
  if (primaryCat) {
    const similar = PRODUCTS.filter(p => p.slug !== slug && (p.categories || []).includes(primaryCat))
      .sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)).slice(0, 4);
    if (similar.length) {
      similarHTML = `<div class="similar-section"><h2>Similar Products</h2><div class="similar-grid">${similar.map(compactProductCard).join('')}</div></div>`;
    }
  }

  // Popular comparisons: this product's own, else top comparisons from its category
  const ownComps = comparisonsFor(slug);
  const catComps = ownComps.length ? [] : (EDITORIAL.comparisons || []).filter(c => {
    const A = PRODUCTS.find(p => p.slug === c.a);
    const B = PRODUCTS.find(p => p.slug === c.b);
    return (A && A.primary_category === product.primary_category) || (B && B.primary_category === product.primary_category);
  });
  const comps = (ownComps.length ? ownComps : catComps).slice(0, 3);
  const popularCompsHTML = comps.length ? `<div class="popular-comparisons" style="margin:32px 0 0">
        <h2 style="margin:0 0 14px">Popular Comparisons</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">
          ${comps.map(comparisonCard).join('')}
        </div>
      </div>` : '';

  const primaryCatObj = primaryCat ? categoryByName(primaryCat) : null;

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": product.title,
    "url": canonical,
    "sameAs": siteUrl,
    "description": stripTags(product.short_description || product.headline || ''),
    "applicationCategory": primaryCat || "BusinessApplication",
    "operatingSystem": (product.deployment || []).join(', ') || 'Web'
  };
  if (pricing.starting_price) {
    const num = String(pricing.starting_price).replace(/[^0-9.]/g, '');
    if (num) softwareLd.offers = { "@type": "Offer", "price": num, "priceCurrency": "USD" };
  } else if (pricing.free_tier) {
    softwareLd.offers = { "@type": "Offer", "price": "0", "priceCurrency": "USD" };
  }


  // FAQ derived strictly from structured fields
  const faqItems = [];
  if (!isDefunct && !isEcosystem) {
    if (pricing.starting_price) faqItems.push({ question: `How much does ${product.title} cost?`, answer: `${product.title} pricing starts at ${pricing.starting_price}.${pricing.free_trial ? ' A free trial is available.' : ''}${pricing.free_tier ? ' A free tier is available.' : ''}` });
    else faqItems.push({ question: `How much does ${product.title} cost?`, answer: `${product.title} does not publish pricing; it is ${(pricing.model || 'quote-based').toLowerCase()}.${pricing.free_trial ? ' A free trial is available.' : ''}${pricing.free_tier ? ' A free tier is available.' : ''} Contact the vendor for a quote.` });
    if ((ta.roles || []).length) faqItems.push({ question: `Who is ${product.title} for?`, answer: `${product.title} is built for ${ta.roles.join(', ')}${(ta.property_types || []).length ? `, working with ${ta.property_types.join(', ').toLowerCase()} properties` : ''}.` });
    if (primaryCat) faqItems.push({ question: `What are alternatives to ${product.title}?`, answer: `Popular ${primaryCat.toLowerCase()} alternatives include ${PRODUCTS.filter(p => p.slug !== slug && (p.categories || [])[0] === primaryCat).slice(0, 3).map(p => p.title).join(', ') || 'other tools in the category'}.${EDITORIAL.alternatives && EDITORIAL.alternatives[slug] ? ` See the full list of ${product.title} alternatives.` : ''}` });
  }
  const faqBlockHTML = faqItems.length ? faqHTMLBlock(faqItems, `${product.title} FAQ`) : '';

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
      ...(primaryCatObj ? [{ "@type": "ListItem", "position": 2, "name": primaryCat, "item": BASE + categoryPath(primaryCatObj.slug) }] : []),
      { "@type": "ListItem", "position": primaryCatObj ? 3 : 2, "name": product.title, "item": canonical }
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, jsonLd: faqItems.length ? [softwareLd, breadcrumbLd, faqLd(faqItems)] : [softwareLd, breadcrumbLd] })}
</head>
<body>
  ${navHTML('directory')}
  <div class="product-detail">
    <div class="container">
      <div class="breadcrumbs">
        <a href="/">Home</a> /
        ${primaryCatObj ? `<a href="${categoryPath(primaryCatObj.slug)}">${esc(primaryCat)}</a> / ` : ''}
        ${esc(product.title)}
      </div>

      <div class="product-hero">
        <div class="logo-large">${logoHTML(product, 64, false)}</div>
        <div class="hero-content">
          <h1>${esc(product.title)}</h1>
          <div class="headline">${esc(product.headline || product.short_description || '')}</div>
          ${product.status_note ? `<div class="status-note" style="margin:10px 0;padding:8px 14px;border-radius:8px;background:rgba(243,156,18,.12);border:1px solid rgba(243,156,18,.35);font-size:14px;">ℹ️ ${esc(product.status_note)}</div>` : ''}
          ${isEcosystem ? `<div class="ecosystem-note" style="margin:10px 0;padding:8px 14px;border-radius:8px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.35);font-size:14px;">🏛️ Ecosystem listing: ${esc(product.title)} is ${esc(product.entity_type || 'a company in the CRE ecosystem')}, not a software product.</div>` : ''}
          ${ratingHTML}
          <div class="hero-badges">${badges.join('')} ${cats}</div>
          <div class="hero-actions">
            ${isDefunct
              ? `<a href="#sec-alternatives" class="cta-btn">See Alternatives →</a>`
              : `<a href="${esc(outUrl)}" target="_blank" rel="${outRel}" class="cta-btn">Visit Website →</a>
            <a href="/compare.html" class="cta-btn cta-btn-outline">Compare</a>`}
          </div>
        </div>
      </div>

      <div class="stats-bar">
        ${statsItems.map(s => `<div class="stat-item"><div class="stat-label">${esc(s.label)}</div><div class="stat-value">${esc(s.value)}</div></div>`).join('')}
      </div>

      <div class="description-section" id="sec-overview">
        <h2>About ${esc(product.title)}</h2>
        <div class="product-description">${esc(product.description || '').replace(/\n/g, '<br>')}</div>
      </div>
      ${prosConsHTML}
      ${audienceHTML}
      ${featuresHTML}
      ${pricingHTML}
      ${integrationsHTML}
      ${companyHTML}
      ${faqBlockHTML}

      ${editorialBoxHTML(product)}
      <div class="bottom-cta">
        ${isDefunct ? '' : `<a href="${esc(outUrl)}" target="_blank" rel="${outRel}" class="cta-btn">Visit ${esc(product.title)} →</a>`}
        <a href="mailto:hello@cresoftware.tech?subject=${encodeURIComponent('Listing update: ' + product.title)}" class="claim-link">Submit a correction or claim this listing</a>
      </div>
      ${product.affiliate_url ? `<p style="font-size:12.5px;opacity:.65;margin:8px 0 0;">Disclosure: outbound links for this product are partner links. Partner relationships never change how a product is described.</p>` : ''}

      ${similarHTML}
      ${popularCompsHTML}
      ${relatedHTML ? `<div class="related-section" id="sec-alternatives"><h2>${esc(product.title)} Alternatives &amp; Related Tools</h2>${relatedHTML}</div>` : ''}

      ${isDefunct || isEcosystem || product.status === 'unverifiable' ? '' : `<details class="badge-embed" style="margin:36px 0 0;font-size:13.5px;">
        <summary style="cursor:pointer;opacity:.7;">Work at ${esc(product.title)}? Get your "Listed on" badge</summary>
        <div style="margin:12px 0 0;padding:14px 16px;border:1px dashed rgba(128,128,160,.4);border-radius:10px;">
          <p style="margin:0 0 8px;">Add this badge to your website. It links straight to your listing here.</p>
          <p style="margin:0 0 8px;"><img src="/img/badge.svg" alt="Listed on CRE Software Directory" height="32"></p>
          <pre style="overflow-x:auto;background:rgba(128,128,160,.12);padding:10px 12px;border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-all;">${esc(`<a href="${BASE}${productPath(slug)}"><img src="${BASE}/img/badge.svg" alt="Listed on CRE Software Directory" height="36"></a>`)}</pre>
          <p style="margin:8px 0 0;font-size:13px;"><a href="/advertise.html">Want more visibility? See Featured placement →</a></p>
        </div>
      </details>`}
    </div>
  </div>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

// ---------- category pages ----------
function renderCategoryPage(slug, cat) {
  const canonical = `${BASE}${categoryPath(slug)}`;
  const title = cat.seo_title || `Best ${cat.name} Software for Commercial Real Estate (${YEAR}) | CRE Software Directory`;
  const description = stripTags(cat.seo_description || `${cat.description} Browse and compare ${cat.product_count} ${cat.name.toLowerCase()} tools for CRE.`).slice(0, 300);
  const ed = cat.editorial || {};

  const products = PRODUCTS.filter(p => (cat.products || []).includes(p.slug))
    .sort((a, b) => ((b.featured_partner ? 2 : 0) + (b.is_featured ? 1 : 0)) - ((a.featured_partner ? 2 : 0) + (a.is_featured ? 1 : 0)) || a.title.localeCompare(b.title));
  const guideFile = path.join(ROOT, 'guides', `${slug}.html`);
  const guideLink = fs.existsSync(guideFile) ? `/guides/${slug}.html` : null;

  const editorialHTML = ed.intro ? `<div class="container"><div class="editorial-intro">${ed.intro.split('\n').filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('')}</div>
    ${ed.what_to_look_for && ed.what_to_look_for.length ? `<div class="editorial-criteria"><h2>What to Look For in ${esc(cat.name)} Software</h2><div class="criteria-grid">${ed.what_to_look_for.map(c => `<div class="criteria-card"><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p></div>`).join('')}</div></div>` : ''}</div>` : '';

  const faqHTML = ed.faq && ed.faq.length ? `<section class="section"><div class="container"><h2>Frequently Asked Questions</h2><div class="faq-list">${ed.faq.map(f => `<details class="faq-item"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</div>${ed.buyer_tip ? `<div class="buyer-tip"><strong>💡 Buyer Tip:</strong> ${esc(ed.buyer_tip)}</div>` : ''}</div></section>` : '';

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${cat.name} Software`,
      "description": cat.description,
      "numberOfItems": products.length,
      "itemListElement": products.slice(0, 25).map((p, i) => ({
        "@type": "ListItem", "position": i + 1, "url": BASE + productPath(p.slug), "name": p.title
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
        { "@type": "ListItem", "position": 2, "name": cat.name, "item": canonical }
      ]
    }
  ];
  if (ed.faq && ed.faq.length) {
    jsonLd.push({ "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": ed.faq.map(f => ({ "@type": "Question", "name": f.question, "acceptedAnswer": { "@type": "Answer", "text": f.answer } })) });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, jsonLd })}
</head>
<body>
  ${navHTML('directory')}
  <section class="category-header">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / ${esc(cat.name)}</div>
      <div class="category-hero-row">
        <div>
          <h1>${esc(cat.name)} Software for Commercial Real Estate</h1>
          <p>${esc(cat.description)}</p>
          <div class="cat-stats"><strong>${products.length}</strong> tools in this category${guideLink ? ` · <a href="${guideLink}">Read the buyer's guide →</a>` : ''}</div>
        </div>
      </div>
    </div>
  </section>
  ${editorialHTML}
  ${(() => {
    const partners = products.filter(p => p.featured_partner);
    if (!partners.length) return '';
    return `<section class="section" style="padding-bottom:0">
    <div class="container">
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:12px;">
        <h2 style="margin:0;font-size:18px;">Featured</h2>
        <span style="font-size:12px;opacity:.6;">Paid placement</span>
      </div>
      <div class="product-grid">
        ${partners.map(productCard).join('\n')}
      </div>
    </div>
  </section>`;
  })()}
  <section class="section">
    <div class="container">
      <div class="filter-bar" data-filter-bar>
        <span class="filter-label">Filter:</span>
        <button class="filter-chip" data-filter="trial">Free trial</button>
        <button class="filter-chip" data-filter="free">Free tier</button>
        <button class="filter-chip" data-filter="price">Published pricing</button>
        <span class="filter-count" data-filter-count></span>
        <label class="sort-label">Sort:
          <select data-sort><option value="prominence">Most known</option><option value="az">A–Z</option></select>
        </label>
      </div>
      <div class="product-grid" data-filterable-grid>
        ${products.map(productCard).join('\n')}
      </div>
    </div>
  </section>
  ${faqHTML}
  ${(() => {
    const ce = editorialForCategory(cat);
    if (!ce.alts.length && !ce.cmps.length) return '';
    return `<section class="section section-alt">
    <div class="container">
      <h2>Switching or shortlisting ${esc(cat.name)} tools?</h2>
      <p style="opacity:.75;margin:-8px 0 20px">Editorial guides for the tools buyers in this category compare most.</p>
      <div class="editorial-grid">
        ${ce.alts.length ? `<div><h3>Alternatives guides</h3>${linkList(ce.alts.map(altLink))}</div>` : ''}
        ${ce.cmps.length ? `<div><h3>Head-to-head comparisons</h3>${linkList(ce.cmps.map(cmpLink))}</div>` : ''}
      </div>
    </div>
  </section>`;
  })()}
  <section class="section">
    <div class="container">
      <h2>Browse Other Categories</h2>
      <div class="footer-cat-links" style="display:flex;flex-wrap:wrap;gap:12px">
        ${Object.values(CATEGORIES).filter(c => c.slug !== slug).map(c => `<a href="${categoryPath(c.slug)}" class="badge badge-accent">${esc(c.name)}</a>`).join('')}
      </div>
    </div>
  </section>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

// ---------- alternatives pages ----------
function altRelatedHTML(slug, product) {
  const cat = primaryCatOf(product);
  const own = cmpEntries().filter(x => x.cmp.a === slug || x.cmp.b === slug);
  const pickSlugs = new Set(((EDITORIAL.alternatives[slug] || {}).picks || []).map(p => p.slug));
  const amongPicks = cmpEntries().filter(x => !own.includes(x) && pickSlugs.has(x.cmp.a) && pickSlugs.has(x.cmp.b));
  const cmps = own.concat(amongPicks).slice(0, 8);
  let siblings = cat ? altsSorted().filter(x => x.slug !== slug && (cat.products || []).includes(x.slug)) : [];
  if (siblings.length < 3) siblings = siblings.concat(altsSorted().filter(x => x.slug !== slug && !siblings.includes(x)).slice(0, 6 - siblings.length));
  siblings = siblings.slice(0, 8);
  const guide = cat ? guideFor(cat.slug) : null;
  return `<div class="related-editorial">
        ${cmps.length ? `<h2>Head-to-head comparisons</h2>${linkList(cmps.map(cmpLink))}` : ''}
        ${siblings.length ? `<h2>More alternatives guides</h2>${linkList(siblings.map(altLink))}<p style="font-size:14px;margin:8px 0 0"><a href="/alternatives/">All alternatives guides →</a></p>` : ''}
        <h2>Keep browsing</h2>
        <ul class="link-list">
          ${cat ? `<li><a href="${categoryPath(cat.slug)}">All ${esc(cat.name)} software</a></li>` : ''}
          ${guide && cat ? `<li><a href="${guide}">${esc(cat.name)} buyer's guide</a></li>` : ''}
          <li><a href="/compare.html">Compare any two tools side by side</a></li>
        </ul>
      </div>`;
}

function renderAlternativesPage(slug, alt) {
  const product = PRODUCTS.find(p => p.slug === slug);
  if (!product) return null;
  const canonical = `${BASE}${alternativesPath(slug)}`;
  const cat = primaryCatOf(product);
  const picks = (alt.picks || []).map(x => ({ ...x, product: PRODUCTS.find(p => p.slug === x.slug) })).filter(x => x.product);
  const title = `Best ${product.title} Alternatives & Competitors (${YEAR}) | CRE Software Directory`;
  const description = `Looking for an alternative to ${product.title}? We compare ${picks.length} competitors on pricing, features, and fit so you can pick the right replacement.`;
  const jsonLd = [
    articleLd(`Best ${product.title} Alternatives (${YEAR})`, canonical, description),
    { "@context": "https://schema.org", "@type": "ItemList",
      "name": `Best ${product.title} Alternatives`, "numberOfItems": picks.length,
      "itemListElement": picks.map((x, i) => ({ "@type": "ListItem", "position": i + 1, "url": BASE + productPath(x.slug), "name": x.product.title })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
      ...(cat ? [{ "@type": "ListItem", "position": 2, "name": cat.name, "item": BASE + categoryPath(cat.slug) }] : []),
      { "@type": "ListItem", "position": cat ? 3 : 2, "name": product.title, "item": BASE + productPath(slug) },
      { "@type": "ListItem", "position": cat ? 4 : 3, "name": `${product.title} Alternatives`, "item": canonical }] }
  ];
  if (alt.faq && alt.faq.length) jsonLd.push(faqLd(alt.faq));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, ogType: 'article', jsonLd })}
</head>
<body>
  ${navHTML('directory')}
  <div class="product-detail">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / ${cat ? `<a href="${categoryPath(cat.slug)}">${esc(cat.name)}</a> / ` : ''}<a href="${productPath(slug)}">${esc(product.title)}</a> / Alternatives</div>
      <h1>Best ${esc(product.title)} Alternatives (${YEAR})</h1>
      ${updatedLine()}
      <div class="description-section">${(alt.intro || '').split('\n\n').map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="similar-section"><h2>Top ${esc(product.title)} Alternatives</h2>
        ${picks.map((x, i) => `<div style="margin:0 0 18px;padding:18px 20px;border:1px solid rgba(128,128,160,.25);border-radius:12px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <span style="font-weight:700;opacity:.5;">${i + 1}.</span>
            <div class="product-logo" style="width:40px;height:40px">${logoHTML(x.product, 40)}</div>
            <h3 style="margin:0;"><a href="${productPath(x.slug)}">${esc(x.product.title)}</a></h3>
          </div>
          <p style="margin:0 0 8px;">${esc(x.product.short_description || x.product.headline || '')}</p>
          <p style="margin:0;"><strong>Why pick it over ${esc(product.title)}:</strong> ${esc(x.reason)}</p>
          ${EDITORIAL.alternatives[x.slug] ? `<p style="margin:8px 0 0;font-size:13.5px;"><a href="${alternativesPath(x.slug)}">Not sold on ${esc(x.product.title)} either? See its alternatives →</a></p>` : ''}
        </div>`).join('')}
      </div>
      ${faqHTMLBlock(alt.faq)}
      ${altRelatedHTML(slug, product)}
      <div class="bottom-cta">
        <a href="${productPath(slug)}" class="cta-btn cta-btn-outline">Read our ${esc(product.title)} review</a>
        <a href="/compare.html" class="claim-link">Compare any two tools side by side</a>
      </div>
    </div>
  </div>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

// ---------- alternatives hub ----------
function renderAlternativesIndex() {
  const entries = altsSorted();
  const canonical = `${BASE}/alternatives/`;
  const title = `Best Alternatives to Popular CRE Software (${YEAR}) | CRE Software Directory`;
  const description = `Ranked alternatives to ${entries.length} widely used commercial real estate platforms, including ${entries.slice(0, 4).map(e => e.product.title).join(', ')}. Independent picks with reasons and caveats.`;
  const groups = {};
  for (const e of entries) { const c = primaryCatOf(e.product); const k = c ? c.name : 'Other'; (groups[k] = groups[k] || { cat: c, items: [] }).items.push(e); }
  const ordered = Object.entries(groups).sort((x, y) => y[1].items.length - x[1].items.length || x[0].localeCompare(y[0]));
  const card = e => `<a class="product-card product-card-link" href="${alternativesPath(e.slug)}" style="display:block">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div class="product-logo" style="width:36px;height:36px">${logoHTML(e.product, 36)}</div><h3 style="margin:0;font-size:16px">Best ${esc(e.product.title)} alternatives</h3></div>
          <div class="tagline">${(e.alt.picks || []).length} alternatives compared. ${esc(firstSentence(e.alt.intro, 140))}</div>
        </a>`;
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "ItemList", "name": "Alternatives guides for CRE software", "numberOfItems": entries.length,
      "itemListElement": entries.map((e, i) => ({ "@type": "ListItem", "position": i + 1, "url": BASE + alternativesPath(e.slug), "name": `Best ${e.product.title} alternatives` })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
      { "@type": "ListItem", "position": 2, "name": "Alternatives guides", "item": canonical }] }
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, jsonLd })}
</head>
<body>
  ${navHTML('directory')}
  <section class="category-header">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / Alternatives guides</div>
      <h1>Best Alternatives to Popular CRE Software</h1>
      <p>Outgrowing a platform, or priced out of one? Each guide ranks the strongest replacements for a widely used tool, explains who each pick suits, and names the trade-off. Independent editorial; no vendor pays for a ranking.</p>
      <div class="cat-stats"><strong>${entries.length}</strong> guides</div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      ${ordered.map(([name, g]) => `<h2 style="margin:0 0 14px;font-size:20px">${esc(name)}${g.cat ? ` <a href="${categoryPath(g.cat.slug)}" style="font-size:13px;font-weight:400">Browse all ${esc(name)} tools →</a>` : ''}</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:36px">
        ${g.items.map(card).join('\n        ')}
      </div>`).join('\n      ')}
      <p style="font-size:14.5px">Want a head-to-head instead? See <a href="/compare.html">all comparisons</a>, or <a href="/compare.html">compare any two tools</a> yourself.</p>
    </div>
  </section>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

// ---------- comparison pages ----------
function renderComparisonPage(cmp) {
  const A = PRODUCTS.find(p => p.slug === cmp.a);
  const B = PRODUCTS.find(p => p.slug === cmp.b);
  if (!A || !B) return null;
  const canonical = `${BASE}${comparePath(cmp.a, cmp.b)}`;
  const title = `${A.title} vs ${B.title} (${YEAR}): Which Is Better? | CRE Software Directory`;
  const description = cmp.one_liner || `${A.title} vs ${B.title}: side-by-side comparison of pricing, features, and fit for commercial real estate teams.`;
  const row = (label, va, vb) => (!va && !vb) ? '' : `<tr><th style="text-align:left;padding:10px 12px;">${esc(label)}</th><td style="padding:10px 12px;">${esc(va || '—')}</td><td style="padding:10px 12px;">${esc(vb || '—')}</td></tr>`;
  const pm = p => (p.pricing || {});
  const ta = p => (p.target_audience || {});
  const prosCons = p => `<div class="proscons-col"><h3>${esc(p.title)}</h3>
    ${(p.pros || []).slice(0, 4).map(x => `<div class="proscons-item"><span class="icon-pro">✓</span>${esc(x)}</div>`).join('')}
    ${(p.cons || []).slice(0, 3).map(x => `<div class="proscons-item"><span class="icon-con">✗</span>${esc(x)}</div>`).join('')}</div>`;
  const cat = primaryCatOf(A);
  const jsonLd = [
    articleLd(`${A.title} vs ${B.title} (${YEAR})`, canonical, description),
    { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
      { "@type": "ListItem", "position": 2, "name": "Compare", "item": BASE + '/compare.html' },
      { "@type": "ListItem", "position": 3, "name": `${A.title} vs ${B.title}`, "item": canonical }]
    }
  ];
  if (cmp.faq && cmp.faq.length) jsonLd.push(faqLd(cmp.faq));
  const relatedHTML = (() => {
    const alts = [A, B].filter(p => EDITORIAL.alternatives && EDITORIAL.alternatives[p.slug]).map(p => `<a href="${alternativesPath(p.slug)}">Best ${esc(p.title)} alternatives</a>`);
    const others = cmpEntries().filter(x => x.cmp !== cmp && (x.cmp.a === A.slug || x.cmp.b === A.slug || x.cmp.a === B.slug || x.cmp.b === B.slug)).slice(0, 8);
    const guide = cat ? guideFor(cat.slug) : null;
    return `<div class="related-editorial">
        ${alts.length ? `<h2>Still deciding?</h2>${linkList(alts)}` : ''}
        ${others.length ? `<h2>Related comparisons</h2>${linkList(others.map(cmpLink))}` : ''}
        <h2>Keep browsing</h2>
        <ul class="link-list">
          ${cat ? `<li><a href="${categoryPath(cat.slug)}">All ${esc(cat.name)} software</a></li>` : ''}
          ${guide && cat ? `<li><a href="${guide}">${esc(cat.name)} buyer's guide</a></li>` : ''}
          <li><a href="/alternatives/">All alternatives guides</a></li>
          <li><a href="/compare.html">All comparisons</a></li>
        </ul>
      </div>`;
  })();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, ogType: 'article', jsonLd })}
</head>
<body>
  ${navHTML('compare')}
  <div class="product-detail">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / <a href="/compare.html">Compare</a> / ${esc(A.title)} vs ${esc(B.title)}</div>
      <h1>${esc(A.title)} vs ${esc(B.title)}: Which Is Better in ${YEAR}?</h1>
      ${updatedLine()}
      <p style="font-size:18px;">${esc(cmp.one_liner || '')}</p>
      <div style="display:flex;gap:24px;align-items:center;margin:20px 0;">
        <div style="display:flex;align-items:center;gap:10px;"><div class="product-logo">${logoHTML(A)}</div><a href="${productPath(A.slug)}"><strong>${esc(A.title)}</strong></a></div>
        <span style="opacity:.5;font-weight:700;">VS</span>
        <div style="display:flex;align-items:center;gap:10px;"><div class="product-logo">${logoHTML(B)}</div><a href="${productPath(B.slug)}"><strong>${esc(B.title)}</strong></a></div>
      </div>
      <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead><tr><th style="text-align:left;padding:10px 12px;"></th><th style="text-align:left;padding:10px 12px;">${esc(A.title)}</th><th style="text-align:left;padding:10px 12px;">${esc(B.title)}</th></tr></thead>
        <tbody>
          ${row('Starting price', pricingLabel(A), pricingLabel(B))}
          ${row('Pricing model', pm(A).model, pm(B).model)}
          ${row('Free trial', pm(A).free_trial ? 'Yes' : 'No', pm(B).free_trial ? 'Yes' : 'No')}
          ${row('Best for', (ta(A).roles || []).slice(0, 3).join(', '), (ta(B).roles || []).slice(0, 3).join(', '))}
          ${row('Company size', (ta(A).company_sizes || []).join(', '), (ta(B).company_sizes || []).join(', '))}
          ${row('Deployment', (A.deployment || []).join(', '), (B.deployment || []).join(', '))}
          ${row('Primary category', A.primary_category && categoryBySlug(A.primary_category) ? categoryBySlug(A.primary_category).name : '', B.primary_category && categoryBySlug(B.primary_category) ? categoryBySlug(B.primary_category).name : '')}
        </tbody>
      </table></div>
      <p style="font-size:13.5px"><a href="/compare.html?a=${cmp.a}&b=${cmp.b}">Customize this comparison →</a></p>
      <div class="description-section"><h2>Our Verdict</h2>${(cmp.verdict || '').split('\n\n').map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="proscons">${prosCons(A)}${prosCons(B)}</div>
      ${faqHTMLBlock(cmp.faq)}
      ${relatedHTML}
      <div class="bottom-cta">
        <a href="${productPath(A.slug)}" class="cta-btn cta-btn-outline">${esc(A.title)} review</a>
        <a href="${productPath(B.slug)}" class="cta-btn cta-btn-outline">${esc(B.title)} review</a>
      </div>
    </div>
  </div>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();initCategoryFilters();</script>
</body>
</html>`;
}

// ---------- integration hubs ----------
const INTEGRATION_DISPLAY = { 'yardi': 'Yardi', 'zillow': 'Zillow', 'docusign': 'DocuSign', 'salesforce': 'Salesforce', 'mri software': 'MRI Software', 'transunion': 'TransUnion', 'quickbooks': 'QuickBooks', 'sap': 'SAP', 'realpage': 'RealPage', 'realtor.com': 'Realtor.com', 'apartments.com': 'Apartments.com', 'excel': 'Excel', 'plaid': 'Plaid', 'vts': 'VTS', 'argus': 'ARGUS', 'costar': 'CoStar', 'power bi': 'Power BI', 'stripe': 'Stripe', 'google maps': 'Google Maps', 'microsoft 365': 'Microsoft 365', 'snowflake': 'Snowflake', 'oracle': 'Oracle', 'workday': 'Workday', 'microsoft dynamics': 'Microsoft Dynamics' };

function collectIntegrationHubs(minCount = 4) {
  const map = {};
  for (const p of PRODUCTS) {
    for (const i of (p.integrations || [])) {
      const raw = (typeof i === 'string' ? i : (i && i.name) || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      (map[key] = map[key] || { key, products: new Set() }).products.add(p.slug);
    }
  }
  return Object.values(map)
    .filter(h => h.products.size >= minCount)
    .map(h => ({ key: h.key, display: INTEGRATION_DISPLAY[h.key] || h.key.replace(/\b\w/g, c => c.toUpperCase()), slug: h.key.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), products: [...h.products].map(s => PRODUCTS.find(p => p.slug === s)).filter(Boolean) }))
    .sort((a, b) => b.products.length - a.products.length);
}

function renderIntegrationHub(hub) {
  const canonical = `${BASE}/integrations/${hub.slug}/`;
  const title = `CRE Software That Integrates With ${hub.display} (${YEAR}) | CRE Software Directory`;
  const description = `${hub.products.length} commercial real estate software tools with a ${hub.display} integration: what they do, who they're for, and how they're priced.`;
  const jsonLd = [{ "@context": "https://schema.org", "@type": "ItemList", "name": `CRE software that integrates with ${hub.display}`, "numberOfItems": hub.products.length, "itemListElement": hub.products.slice(0, 25).map((p, i) => ({ "@type": "ListItem", "position": i + 1, "url": BASE + productPath(p.slug), "name": p.title })) },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE + '/' },
    { "@type": "ListItem", "position": 2, "name": `Integrates with ${hub.display}`, "item": canonical }] }];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, jsonLd })}
</head>
<body>
  ${navHTML('directory')}
  <section class="category-header">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / <a href="/integrations/">Integrations</a> / ${esc(hub.display)}</div>
      <h1>CRE Software That Integrates With ${esc(hub.display)}</h1>
      <p>Tools in the directory whose vendors list a ${esc(hub.display)} integration. Always confirm integration depth with the vendor: "integrates with" can mean anything from a certified two-way sync to a CSV import.</p>
      <div class="cat-stats"><strong>${hub.products.length}</strong> tools</div>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="product-grid">
        ${hub.products.map(productCard).join('\n')}
      </div>
    </div>
  </section>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

function renderIntegrationsIndex(hubs) {
  const canonical = `${BASE}/integrations/`;
  const title = `CRE Software by Integration (${YEAR}) | CRE Software Directory`;
  const description = 'Browse commercial real estate software by what it integrates with: Yardi, QuickBooks, Salesforce, DocuSign, and more.';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${headHTML({ title, description, canonical, jsonLd: [] })}
</head>
<body>
  ${navHTML('directory')}
  <section class="category-header">
    <div class="container">
      <div class="breadcrumbs"><a href="/">Home</a> / Integrations</div>
      <h1>Browse CRE Software by Integration</h1>
      <p>Buying software that has to work with your existing stack? Start from the system you already run.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
        ${hubs.map(h => `<a class="product-card product-card-link" href="/integrations/${h.slug}/" style="display:block"><h3 style="margin:0 0 4px">${esc(h.display)}</h3><div class="tagline">${h.products.length} tools with this integration</div></a>`).join('\n        ')}
      </div>
    </div>
  </section>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();initNavSearch();</script>
</body>
</html>`;
}

// ---------- sitemap ----------
function renderSitemap() {
  const urls = [];
  const lm = p => (LASTMOD[p] && LASTMOD[p].date) || TODAY;
  const add = (p, priority) => urls.push({ loc: BASE + p, priority, lastmod: lm(p) });
  add('/', '1.0');
  Object.values(CATEGORIES).forEach(c => add(categoryPath(c.slug), '0.9'));
  PRODUCTS.filter(p => !badSlug(p.slug)).forEach(p => add(productPath(p.slug), '0.8'));
  guideFiles().forEach(f => add(`/guides/${f}`, '0.8'));
  add('/alternatives/', '0.7');
  altEntries().forEach(x => add(alternativesPath(x.slug), '0.7'));
  cmpEntries().forEach(x => add(comparePath(x.cmp.a, x.cmp.b), '0.7'));
  add('/market-map.html', '0.6');
  add('/compare.html', '0.6');
  add('/integrations/', '0.6');
  collectIntegrationHubs().forEach(h => add(`/integrations/${h.slug}/`, '0.6'));
  add('/submit.html', '0.5');
  add('/advertise.html', '0.5');
  add('/about.html', '0.5');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

// ---------- llms.txt (for AI assistants and answer engines) ----------
function renderLlmsTxt() {
  const cats = Object.values(CATEGORIES).sort((a, b) => b.product_count - a.product_count);
  const latest = Object.values(LASTMOD).map(e => e.date).filter(Boolean).sort().pop() || TODAY;
  const line = (label, p, extra) => `- [${label}](${BASE}${p})${extra ? `: ${extra}` : ''}`;
  return `# CRE Software Directory

> Independent, editorially maintained directory of ${PRODUCTS.length} commercial real estate (CRE) software tools across ${cats.length} categories, with buyer's guides, ranked alternatives guides, and head-to-head comparisons. Listings are researched from vendor documentation and public sources. Featured placements are labeled as paid and never change editorial content. No star ratings or user reviews are published.

Site: ${BASE}
Contact: hello@cresoftware.tech
Last content update: ${latest}

## Categories
${cats.map(c => line(`${c.name} software`, categoryPath(c.slug), `${c.product_count} tools. ${stripTags(c.description || '')}`)).join('\n')}

## Buyer's guides
${guideFiles().map(f => { const cs = f.replace('.html', ''); const c = categoryBySlug(cs); return line(`Best ${c ? c.name : cs} software for CRE`, `/guides/${f}`); }).join('\n')}

## Alternatives guides
${line('All alternatives guides', '/alternatives/')}
${altsSorted().map(x => line(`Best ${x.product.title} alternatives`, alternativesPath(x.slug), firstSentence(x.alt.intro, 200))).join('\n')}

## Head-to-head comparisons
${line('All comparisons', '/compare.html')}
${cmpEntries().map(x => line(`${x.A.title} vs ${x.B.title}`, comparePath(x.cmp.a, x.cmp.b), x.cmp.one_liner || '')).join('\n')}

## Browse by integration
${line('All integration hubs', '/integrations/')}
${collectIntegrationHubs().map(h => line(`CRE software that integrates with ${h.display}`, `/integrations/${h.slug}/`, `${h.products.length} tools`)).join('\n')}

## Product pages
Every listed product has a page at ${BASE}/products/<slug>/ with an overview, pricing model, pros and cons, target audience, integrations, and FAQ. The full URL list is in ${BASE}/sitemap.xml.

## About
${line('About and methodology', '/about.html')}
${line('Submit a tool', '/submit.html')}
${line('Advertise (Featured listings)', '/advertise.html')}
`;
}

// ---------- run ----------
let productCount = 0, categoryCount = 0;

for (const product of PRODUCTS) {
  if (badSlug(product.slug)) { console.warn(`SKIP invalid slug: ${JSON.stringify(product.slug)}`); continue; }
  writePage(productPath(product.slug), renderProductPage(product), product.enrichedAt || product.last_updated);
  productCount++;
}

for (const [slug, cat] of Object.entries(CATEGORIES)) {
  if (badSlug(slug)) { console.warn(`SKIP invalid category slug: ${JSON.stringify(slug)}`); continue; }
  writePage(categoryPath(slug), renderCategoryPage(slug, cat));
  categoryCount++;
}

const HUBS = collectIntegrationHubs();
for (const hub of HUBS) writePage(`/integrations/${hub.slug}/`, renderIntegrationHub(hub));
writePage('/integrations/', renderIntegrationsIndex(HUBS));

let altCount = 0, cmpCount = 0;
for (const [slug, alt] of Object.entries(EDITORIAL.alternatives || {})) {
  const html = renderAlternativesPage(slug, alt);
  if (!html) { console.warn(`SKIP alternatives (unknown slug): ${slug}`); continue; }
  writePage(alternativesPath(slug), html);
  altCount++;
}
writePage('/alternatives/', renderAlternativesIndex());
for (const cmp of EDITORIAL.comparisons || []) {
  const html = renderComparisonPage(cmp);
  if (!html) { console.warn(`SKIP comparison (unknown slug): ${cmp.a} vs ${cmp.b}`); continue; }
  writePage(comparePath(cmp.a, cmp.b), html);
  cmpCount++;
}

// ---------- hand-maintained pages: injected blocks between marker comments ----------
function injectBetween(file, START, END, inner) {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return false;
  let html = fs.readFileSync(abs, 'utf8');
  const si = html.indexOf(START), ei = html.indexOf(END);
  if (si === -1 || ei === -1) { console.warn(`SKIP ${file}: markers ${START} missing`); return false; }
  html = html.slice(0, si + START.length) + inner + html.slice(ei);
  fs.writeFileSync(abs, html);
  return true;
}
const HAND_PAGES = [['index.html', '/'], ['compare.html', '/compare.html'], ['about.html', '/about.html'], ['submit.html', '/submit.html'], ['advertise.html', '/advertise.html'], ['market-map.html', '/market-map.html'], ['404.html', null]]
  .concat(guideFiles().map(f => [`guides/${f}`, `/guides/${f}`]));

// ---------- popular comparisons on compare.html ----------
function injectPopularComparisons() {
  const file = path.join(ROOT, 'compare.html');
  const START = '<!-- POPULAR-COMPARISONS:START (generated by scripts/build.js — do not edit by hand) -->';
  const END = '<!-- POPULAR-COMPARISONS:END -->';
  let html = fs.readFileSync(file, 'utf8');
  const si = html.indexOf(START), ei = html.indexOf(END);
  if (si === -1 || ei === -1) { console.warn('SKIP popular comparisons: markers missing in compare.html'); return 0; }

  const groups = {};
  for (const cmp of EDITORIAL.comparisons || []) {
    const A = PRODUCTS.find(p => p.slug === cmp.a);
    const B = PRODUCTS.find(p => p.slug === cmp.b);
    if (!A || !B) continue;
    const cat = (A.primary_category && categoryBySlug(A.primary_category)) ? categoryBySlug(A.primary_category).name : 'Other';
    (groups[cat] = groups[cat] || []).push({ cmp, A, B });
  }
  const ordered = Object.entries(groups).sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));

  const card = ({ cmp, A, B }) => `<a class="product-card product-card-link" href="${comparePath(cmp.a, cmp.b)}" style="display:block">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div class="product-logo" style="width:36px;height:36px">${logoHTML(A, 36)}</div>
          <span style="font-weight:700;opacity:.45;font-size:12px">VS</span>
          <div class="product-logo" style="width:36px;height:36px">${logoHTML(B, 36)}</div>
        </div>
        <h3 style="margin:0 0 6px;font-size:16px">${esc(A.title)} vs ${esc(B.title)}</h3>
        <div class="tagline">${esc(cmp.one_liner || '')}</div>
      </a>`;

  let section = `
      <div style="margin-top:48px">
        <h2 class="section-title" style="font-size:22px;margin-bottom:4px">Popular Comparisons</h2>
        <p style="color:var(--gray-600);margin-bottom:24px">Head-to-head verdicts for the tools buyers compare most, by category.</p>
        ${ordered.map(([cat, items]) => {
          const catObj = categoryByName(cat);
          const catLink = catObj ? ` <a href="${categoryPath(catObj.slug)}" style="font-size:13px;font-weight:400">Browse all ${esc(cat)} tools →</a>` : '';
          return `<h3 style="margin:28px 0 14px;font-size:17px">${esc(cat)}${catLink}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
          ${items.map(card).join('\n          ')}
        </div>`;
        }).join('\n        ')}
      </div>
      <div style="margin-top:48px">
        <h2 class="section-title" style="font-size:22px;margin-bottom:4px">Looking to Switch? Alternatives Guides</h2>
        <p style="color:var(--gray-600);margin-bottom:16px">Ranked replacements for the platforms CRE teams most often outgrow.</p>
        ${altChipsHTML()}
        <p style="margin:16px 0 0;font-size:14px"><a href="/alternatives/">See all alternatives guides →</a></p>
      </div>
      `;

  html = html.slice(0, si + START.length) + section + html.slice(ei);
  fs.writeFileSync(file, html);
  return (EDITORIAL.comparisons || []).length;
}
const popCount = injectPopularComparisons();

function injectHomeComparisons() {
  const picks = (EDITORIAL.comparisons || []).slice(0, 3);
  return injectBetween('index.html', '<!-- HOME-COMPARISONS:START -->', '<!-- HOME-COMPARISONS:END -->', `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${picks.map(comparisonCard).join('\n        ')}
      </div>
      <p style="margin:16px 0 0;font-size:14px"><a href="/compare.html">See all comparisons →</a></p>
      `) ? picks.length : 0;
}
injectHomeComparisons();

function injectHomeAlternatives() {
  return injectBetween('index.html', '<!-- HOME-ALTERNATIVES:START -->', '<!-- HOME-ALTERNATIVES:END -->', `
      ${altChipsHTML()}
      <p style="margin:16px 0 0;font-size:14px"><a href="/alternatives/">See all alternatives guides →</a></p>
      `);
}
injectHomeAlternatives();

// Related editorial block at the bottom of each buyer's guide (alternatives + comparisons in its category).
function guideRelatedHTML(catSlug) {
  const cat = categoryBySlug(catSlug);
  if (!cat) return '';
  const ce = editorialForCategory(cat);
  const browse = `<p style="font-size:14px;margin:12px 0 0"><a href="${categoryPath(cat.slug)}">Browse all ${esc(cat.name)} software →</a> · <a href="/alternatives/">All alternatives guides</a> · <a href="/compare.html">All comparisons</a></p>`;
  return `
<div style="max-width:800px;margin:0 auto;padding:0 20px 32px">
  <div class="related-editorial">
    <h2 style="margin-top:0">Related reading</h2>
    <div class="editorial-grid">
      ${ce.alts.length ? `<div><h3>Alternatives guides</h3>${linkList(ce.alts.map(altLink))}</div>` : ''}
      ${ce.cmps.length ? `<div><h3>Head-to-head comparisons</h3>${linkList(ce.cmps.map(cmpLink))}</div>` : ''}
    </div>
    ${browse}
  </div>
</div>
`;
}
for (const f of guideFiles()) injectBetween(`guides/${f}`, '<!-- GUIDE-RELATED:START -->', '<!-- GUIDE-RELATED:END -->', guideRelatedHTML(f.replace('.html', '')));

// Shared site footer on every hand-maintained page.
let footerCount = 0;
for (const [file] of HAND_PAGES) if (injectBetween(file, '<!-- SITE-FOOTER:START -->', '<!-- SITE-FOOTER:END -->', '\n' + footerHTML() + '\n')) footerCount++;

// Track lastmod for hand pages (hash of the content between nav and footer, like generated pages).
for (const [file, urlPath] of HAND_PAGES) if (urlPath && fs.existsSync(path.join(ROOT, file))) trackLastmod(urlPath, fs.readFileSync(path.join(ROOT, file), 'utf8'));

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), renderSitemap());
fs.writeFileSync(path.join(ROOT, 'llms.txt'), renderLlmsTxt());
saveLastmod();

console.log(`Built ${productCount} product pages, ${categoryCount} category pages, ${altCount} alternatives pages + hub, ${cmpCount} comparison pages, ${HUBS.length} integration hubs, ${popCount} popular comparisons on compare.html, ${footerCount} shared footers, sitemap.xml, llms.txt`);
