#!/usr/bin/env node
/**
 * Static site generator for cresoftware.tech.
 *
 * Reads data/products.json + data/categories.json and renders:
 *   products/<slug>/index.html    — one indexable page per product
 *   categories/<slug>/index.html  — one indexable page per category
 *   sitemap.xml                   — real URLs only (no #fragments)
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
const categoryPath = slug => `/categories/${slug}/`;
const categoryBySlug = slug => CATEGORIES[slug];
const categoryByName = name => Object.values(CATEGORIES).find(c => c.name === name);

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
  const rating = p.rating ? `<div class="card-rating">${starsHTML(p.rating, 13)} <span class="rating-num">${p.rating}</span></div>` : '';
  const priceText = (p.pricing || {}).starting_price || ((p.pricing || {}).free_tier ? 'Free' : '');
  const price = priceText ? `<span class="card-price">${esc(priceText)}</span>` : '';
  const badges = [];
  if (p.pricing && p.pricing.free_trial) badges.push('<span class="badge badge-green">Free Trial</span>');
  if (p.pricing && p.pricing.free_tier) badges.push('<span class="badge badge-green">Free</span>');
  if (p.is_featured) badges.push('<span class="badge badge-gold">Featured</span>');
  const features = (p.feature_groups || []).flatMap(g => g.features || []).slice(0, 3);
  const featHTML = features.length ? `<div class="card-features">${features.map(f => `<span class="card-feature">✦ ${esc(f.name)}</span>`).join('')}</div>` : '';
  return `<a class="product-card product-card-link" href="${productPath(p.slug)}">
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
      </div>
    </div>
  </nav>`;
}

function footerHTML() {
  return `<footer>
    <div class="container footer-inner">
      <span>© ${YEAR} CRE Software Directory</span>
      <div><a href="/submit.html">Submit a Tool</a> · <a href="/compare.html">Compare Tools</a> · <a href="mailto:hello@cresoftware.tech">Contact</a></div>
    </div>
  </footer>
  <button id="back-to-top" class="back-to-top" aria-label="Back to top">↑</button>`;
}

function headHTML({ title, description, canonical, ogType = 'website', ogImage = `${BASE}/css/og-image.png`, jsonLd = [] }) {
  const ld = jsonLd.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n  ');
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
  ${ld}`;
}

// ---------- product pages ----------
function renderProductPage(product) {
  const slug = product.slug;
  const canonical = `${BASE}${productPath(slug)}`;
  const seo = product.seo || {};
  const isDefunct = product.status === 'defunct';
  const title = isDefunct
    ? `What Happened to ${product.title}? History & Alternatives | CRE Software Directory`
    : (seo.title || `${product.title} Review ${YEAR}: Pricing, Features & Alternatives | CRE Software Directory`);
  const description = stripTags(seo.description || product.short_description || `${product.title}: ${product.headline || ''} Compare pricing, features & alternatives.`).slice(0, 300);

  const pricing = product.pricing || {};
  const company = product.company || {};
  const ta = product.target_audience || {};
  const siteUrl = externalUrl(product.url);

  const badges = [];
  if (pricing.free_trial) badges.push('<span class="badge-hero badge-hero-free">Free Trial</span>');
  if (pricing.free_tier) badges.push('<span class="badge-hero badge-hero-free">Free Tier</span>');
  if (product.is_verified) badges.push('<span class="badge-hero badge-hero-verified">✓ Verified</span>');
  if (product.is_featured) badges.push('<span class="badge-hero badge-hero-top">⭐ Featured</span>');

  const ratingHTML = product.rating ? `<div class="rating-display">
    ${starsHTML(product.rating, 20)}
    <span class="rating-text">${product.rating}/5${product.review_count ? ` (${product.review_count} reviews)` : ''}</span>
  </div>` : '';

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
    <a href="${esc(siteUrl)}" target="_blank" rel="noopener" class="company-link">Visit ${esc(product.title)} →</a>
  </div>` : '';

  // Related tools carousels + similar grid
  let relatedHTML = '';
  const usedSlugs = new Set([slug]);
  (product.categories || []).forEach(cat => {
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
    const similar = PRODUCTS.filter(p => p.slug !== slug && !usedSlugs.has(p.slug) && (p.categories || []).includes(primaryCat))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
    if (similar.length) {
      similarHTML = `<div class="similar-section"><h2>Similar Products</h2><div class="similar-grid">${similar.map(compactProductCard).join('')}</div></div>`;
    }
  }

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
  if (product.rating) {
    softwareLd.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "bestRating": 5, "reviewCount": product.review_count || 1 };
  }

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
  ${headHTML({ title, description, canonical, jsonLd: [softwareLd, breadcrumbLd] })}
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
          ${ratingHTML}
          <div class="hero-badges">${badges.join('')} ${cats}</div>
          <div class="hero-actions">
            ${isDefunct
              ? `<a href="#sec-alternatives" class="cta-btn">See Alternatives →</a>`
              : `<a href="${esc(siteUrl)}" target="_blank" rel="noopener" class="cta-btn">Visit Website →</a>
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

      <div class="bottom-cta">
        ${isDefunct ? '' : `<a href="${esc(siteUrl)}" target="_blank" rel="noopener" class="cta-btn">Visit ${esc(product.title)} →</a>`}
        <a href="/submit.html" class="claim-link">Submit a correction or claim this listing</a>
      </div>

      ${relatedHTML ? `<div class="related-section" id="sec-alternatives"><h2>${esc(product.title)} Alternatives &amp; Related Tools</h2>${relatedHTML}</div>` : ''}
      ${similarHTML}
    </div>
  </div>
  ${footerHTML()}
  <script src="/js/app.js"></script>
  <script>initNav();initBackToTop();</script>
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
    .sort((a, b) => a.title.localeCompare(b.title));

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
          <div class="cat-stats"><strong>${products.length}</strong> tools in this category</div>
        </div>
      </div>
    </div>
  </section>
  ${editorialHTML}
  <section class="section">
    <div class="container">
      <div class="product-grid">
        ${products.map(productCard).join('\n')}
      </div>
    </div>
  </section>
  ${faqHTML}
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
  <script>initNav();initBackToTop();</script>
</body>
</html>`;
}

// ---------- sitemap ----------
function renderSitemap() {
  const urls = [];
  const add = (loc, priority, lastmod) => urls.push({ loc, priority, lastmod });

  add(`${BASE}/`, '1.0', TODAY);
  Object.values(CATEGORIES).forEach(c => add(`${BASE}${categoryPath(c.slug)}`, '0.9', TODAY));
  PRODUCTS.forEach(p => {
    const lastmod = (p.enrichedAt || p.last_updated || TODAY).slice(0, 10);
    add(`${BASE}${productPath(p.slug)}`, '0.8', lastmod);
  });
  const guidesDir = path.join(ROOT, 'guides');
  if (fs.existsSync(guidesDir)) {
    fs.readdirSync(guidesDir).filter(f => f.endsWith('.html')).forEach(f => add(`${BASE}/guides/${f}`, '0.8', TODAY));
  }
  add(`${BASE}/market-map.html`, '0.6', TODAY);
  add(`${BASE}/compare.html`, '0.5', TODAY);
  add(`${BASE}/submit.html`, '0.5', TODAY);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

// ---------- run ----------
let productCount = 0, categoryCount = 0;
const badSlug = s => !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s);

for (const product of PRODUCTS) {
  if (badSlug(product.slug)) { console.warn(`SKIP invalid slug: ${JSON.stringify(product.slug)}`); continue; }
  const dir = path.join(ROOT, 'products', product.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderProductPage(product));
  productCount++;
}

for (const [slug, cat] of Object.entries(CATEGORIES)) {
  if (badSlug(slug)) { console.warn(`SKIP invalid category slug: ${JSON.stringify(slug)}`); continue; }
  const dir = path.join(ROOT, 'categories', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderCategoryPage(slug, cat));
  categoryCount++;
}

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), renderSitemap());

console.log(`Built ${productCount} product pages, ${categoryCount} category pages, sitemap.xml`);
