/* CRE Software Directory - Main JS */
let PRODUCTS = [];
let CATEGORIES = {};

const COLORS = ['#4361ee','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#3498db','#e91e63','#00bcd4'];
const BASE_URL = 'https://cresoftware.tech';

function getColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function logoHTML(product, size = 48) {
  const letter = (product.title || '?')[0].toUpperCase();
  const color = getColor(product.title);
  return `<img src="${product.logo_url}" alt="${product.title}" 
    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    style="width:${size}px;height:${size}px;object-fit:contain">
    <div class="fallback" style="display:none;background:${color};width:${size}px;height:${size}px;font-size:${size*0.45}px">${letter}</div>`;
}

function starsHTML(rating, size = 16) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return `<span class="stars" style="font-size:${size}px">${'★'.repeat(full)}${half ? '⯨' : ''}${'☆'.repeat(empty)}</span>`;
}

function pricingLabel(product, forCard = false) {
  const p = product.pricing || {};
  if (p.starting_price) return p.starting_price;
  if (p.free_tier) return 'Free';
  if (p.model === 'Free') return 'Free';
  if (forCard) return '';
  if (p.model === 'Subscription') return 'Subscription';
  return 'Contact for pricing';
}

function compactProductCard(p) {
  return `<a class="product-card product-card-compact product-card-link" href="product.html#${p.slug}">
    <div class="card-top">
      <div class="product-logo" style="width:40px;height:40px">${logoHTML(p, 40)}</div>
      <div class="product-info">
        <h3>${p.title}</h3>
        <div class="tagline">${p.short_description || p.tagline || p.headline || ''}</div>
      </div>
    </div>
  </a>`;
}

function getComparisonBadges(p) {
  const badges = [];
  if (p._badge_popular) badges.push('<span class="comparison-badge badge-popular">🔥 Most Popular</span>');
  if (p._badge_value) badges.push('<span class="comparison-badge badge-value">💰 Best Value</span>');
  if (p._badge_small) badges.push('<span class="comparison-badge badge-small-teams">👥 Best for Small Teams</span>');
  return badges.join('');
}

function assignComparisonBadges() {
  // Most Popular: featured + highest rating
  const rated = PRODUCTS.filter(p => p.rating && p.is_featured).sort((a, b) => b.rating - a.rating);
  rated.slice(0, 5).forEach(p => p._badge_popular = true);
  // Best Value: has free tier or free trial + good rating
  const valuePicks = PRODUCTS.filter(p => (p.pricing && (p.pricing.free_tier || p.pricing.free_trial)) && (p.rating || 0) >= 4).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  valuePicks.slice(0, 5).forEach(p => p._badge_value = true);
  // Best for Small Teams
  const smallTeam = PRODUCTS.filter(p => {
    const sizes = (p.target_audience || {}).company_sizes || [];
    return sizes.some(s => /small|startup|1-|individual/i.test(s));
  }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  smallTeam.slice(0, 5).forEach(p => p._badge_small = true);
}

function productCard(p) {
  const cats = (p.categories || []).slice(0, 2).map(c => `<span class="badge badge-accent">${c}</span>`).join('');
  const rating = p.rating ? `<div class="card-rating">${starsHTML(p.rating, 13)} <span class="rating-num">${p.rating}</span></div>` : '';
  const priceText = pricingLabel(p, true);
  const price = priceText ? `<span class="card-price">${priceText}</span>` : '';
  const compBadges = getComparisonBadges(p);
  const badges = [];
  if (p.pricing && p.pricing.free_trial) badges.push('<span class="badge badge-green">Free Trial</span>');
  if (p.pricing && p.pricing.free_tier) badges.push('<span class="badge badge-green">Free</span>');
  if (p.is_featured) badges.push('<span class="badge badge-gold">Featured</span>');
  
  // Top features
  const features = (p.feature_groups || []).flatMap(g => g.features || []).slice(0, 3);
  const featHTML = features.length ? `<div class="card-features">${features.map(f => `<span class="card-feature">✦ ${f.name}</span>`).join('')}</div>` : '';
  
  return `<a class="product-card product-card-link" href="product.html#${p.slug}">
    <div class="card-top">
      <div class="product-logo">${logoHTML(p)}</div>
      <div class="product-info">
        <h3>${p.title}</h3>
        <div class="tagline">${p.short_description || p.tagline || p.headline || ''}</div>
        ${rating}
      </div>
    </div>
    ${compBadges ? `<div class="card-badges-row">${compBadges}</div>` : ''}
    ${featHTML}
    <div class="card-bottom">
      <div class="card-meta">${price} ${badges.join('')}</div>
      <div class="cats">${cats}</div>
    </div>
  </a>`;
}

const CATEGORY_ICONS = {
  'property-management': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-4h6v4"/><path d="M9 9h1"/><path d="M14 9h1"/><path d="M9 13h1"/><path d="M14 13h1"/></svg>',
  'crm-marketing': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  'investment-valuation': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  'construction-development': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h20"/><path d="M6 18V8l6-4 6 4v10"/><path d="M10 18v-6h4v6"/><path d="M2 8l4-2"/><path d="M22 8l-4-2"/><rect x="3" y="14" width="3" height="4"/><rect x="18" y="14" width="3" height="4"/></svg>',
  'data-analytics': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>',
  'broker-tools': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v1"/></svg>',
  'site-selection': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  'tenant-experience': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H9a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M7 7v3a5 5 0 0 0 10 0V7"/><circle cx="12" cy="17" r="1"/><path d="M12 18v4"/></svg>',
  'accounting-finance': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="14" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="14" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="16" y2="18"/></svg>',
  'ai-automation': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M1 9h3"/><path d="M1 15h3"/><path d="M20 9h3"/><path d="M20 15h3"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>',
  'listing-services': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  'crowdfunding-investing': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><circle cx="16" cy="16" r="6"/><path d="M7 6v4"/><path d="M5.5 8h3"/><path d="M14 16h4"/></svg>',
  'legal-compliance': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"/><path d="M5.5 9l6.5-3 6.5 3"/><path d="M3 15l3-6h0"/><path d="M21 15l-3-6h0"/><circle cx="6" cy="15" r="3"/><circle cx="18" cy="15" r="3"/><path d="M3 21h18"/></svg>',
  'workplace-space-management': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>'
};

function categoryCard(cat) {
  const icon = CATEGORY_ICONS[cat.slug] || '';
  return `<a class="cat-card" href="category.html#${cat.slug}">
    <span class="cat-icon">${icon}</span>
    <h3>${cat.name}</h3>
    <div class="count">${cat.product_count} tools</div>
  </a>`;
}

async function loadData() {
  const [pRes, cRes] = await Promise.all([
    fetch('data/products.json'),
    fetch('data/categories.json')
  ]);
  PRODUCTS = await pRes.json();
  CATEGORIES = await cRes.json();
}

function initNav() {
  const toggle = document.querySelector('.mobile-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }
}

function featuredCard(p) {
  const cat = (p.categories || [])[0];
  const catBadge = cat ? `<span class="badge badge-accent">${cat}</span>` : '';
  return `<a class="product-card product-card-link featured-card" href="product.html#${p.slug}">
    <div class="card-top">
      <div class="product-logo" style="width:56px;height:56px">${logoHTML(p, 56)}</div>
      <div class="product-info">
        <h3>${p.title}</h3>
        <div class="tagline">${p.short_description || p.tagline || p.headline || ''}</div>
      </div>
    </div>
    <div class="card-bottom">
      <div class="card-meta">${catBadge}</div>
    </div>
  </a>`;
}

function recentCard(p) {
  return `<a class="product-card product-card-link product-card-compact" href="product.html#${p.slug}">
    <div class="card-top">
      <div class="product-logo" style="width:40px;height:40px">${logoHTML(p, 40)}</div>
      <div class="product-info">
        <h3>${p.title}</h3>
        <div class="tagline">${p.short_description || p.tagline || p.headline || ''}</div>
      </div>
    </div>
  </a>`;
}

// ====== HOMEPAGE ======
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function animateCounters() {
  const counters = document.querySelectorAll('.counter-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-target'));
      if (!target) return;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 60));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = current;
      }, 20);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

async function initHome() {
  await loadData();
  initNav();
  initBackToTop();
  assignComparisonBadges();
  
  const catCount = Object.keys(CATEGORIES).length;
  
  // Update stats
  const countEl = document.getElementById('hero-count');
  const catsEl = document.getElementById('hero-cats');
  if (countEl) countEl.textContent = PRODUCTS.length + '+';
  if (catsEl) catsEl.textContent = catCount;

  // Social proof bar
  const proofTools = document.getElementById('proof-tools');
  const proofCats = document.getElementById('proof-cats');
  if (proofTools) proofTools.textContent = `${PRODUCTS.length} tools reviewed`;
  if (proofCats) proofCats.textContent = `${catCount} categories`;

  // Hero pills (top 6 categories)
  const pillsEl = document.getElementById('hero-pills');
  if (pillsEl) {
    const topCats = Object.values(CATEGORIES).sort((a, b) => b.product_count - a.product_count).slice(0, 6);
    pillsEl.innerHTML = topCats.map(c => `<a href="category.html#${c.slug}" class="hero-pill">${c.name}</a>`).join('');
  }

  // Categories
  const catGrid = document.getElementById('cat-grid');
  if (catGrid) {
    catGrid.innerHTML = Object.values(CATEGORIES)
      .sort((a, b) => b.product_count - a.product_count)
      .slice(0, 10)
      .map(categoryCard).join('');
  }
  
  // Featured (no stars, no ratings)
  const featured = document.getElementById('featured-products');
  if (featured) {
    const top = PRODUCTS.filter(p => p.is_featured);
    const items = top.length >= 8 ? top.slice(0, 8) : PRODUCTS.slice(0, 8);
    featured.innerHTML = items.map(featuredCard).join('');
  }
  
  // Recently updated (compact row)
  const recent = document.getElementById('recent-products');
  if (recent) {
    const sorted = [...PRODUCTS].sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || '')).slice(0, 6);
    recent.innerHTML = sorted.map(recentCard).join('');
  }
  
  // Footer category links
  const footerCats = document.getElementById('footer-cat-links');
  if (footerCats) {
    const topCats = Object.values(CATEGORIES).sort((a, b) => b.product_count - a.product_count).slice(0, 8);
    footerCats.innerHTML = topCats.map(c => `<a href="category.html#${c.slug}">${c.name}</a>`).join('');
  }
  
  // Stats counters
  const enrichedCount = PRODUCTS.filter(p => p.feature_groups && p.feature_groups.length > 0).length;
  const counterProducts = document.getElementById('counter-products');
  const counterCats = document.getElementById('counter-categories');
  const counterEnriched = document.getElementById('counter-enriched');
  if (counterProducts) counterProducts.setAttribute('data-target', PRODUCTS.length);
  if (counterCats) counterCats.setAttribute('data-target', catCount);
  if (counterEnriched) counterEnriched.setAttribute('data-target', enrichedCount);
  animateCounters();

  // Quick filters
  const quickFiltersEl = document.getElementById('quick-filters');
  if (quickFiltersEl) {
    const propTypes = [...new Set(PRODUCTS.flatMap(p => (p.target_audience || {}).property_types || p.property_types || []))].sort().slice(0, 5);
    const filterDefs = [
      { label: 'Free Trial', key: 'free_trial' },
      { label: 'Free Tier', key: 'free_tier' },
      { label: 'Has Pricing', key: 'has_pricing' },
      ...propTypes.map(t => ({ label: t, key: 'pt:' + t }))
    ];
    quickFiltersEl.innerHTML = filterDefs.map(f => `<span class="filter-pill" data-filter="${f.key}">${f.label}</span>`).join('');
    quickFiltersEl.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      pill.classList.toggle('active');
      runHomeSearch();
    });
  }

  // Search — enhanced with features, description matching + quick filters
  const search = document.getElementById('search-input');
  const allGrid = document.getElementById('all-products');
  const searchSection = document.getElementById('search-results-section');

  function getActiveFilters() {
    return [...document.querySelectorAll('.filter-pill.active')].map(p => p.getAttribute('data-filter'));
  }

  window.runHomeSearch = function() {
    const q = (search ? search.value : '').toLowerCase().trim();
    const activeFilters = getActiveFilters();
    const hasQuery = q.length > 0;
    const hasFilters = activeFilters.length > 0;

    if (hasQuery || hasFilters) {
      let filtered = PRODUCTS;
      if (hasQuery) {
        filtered = filtered.filter(p => {
          const featureText = (p.feature_groups || []).flatMap(g => (g.features || []).map(f => f.name + ' ' + (f.description || ''))).join(' ').toLowerCase();
          return p.title.toLowerCase().includes(q) ||
            (p.short_description || p.tagline || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            featureText.includes(q) ||
            (p.categories || []).some(c => c.toLowerCase().includes(q));
        });
      }
      activeFilters.forEach(f => {
        if (f === 'free_trial') filtered = filtered.filter(p => p.pricing && p.pricing.free_trial);
        else if (f === 'free_tier') filtered = filtered.filter(p => p.pricing && p.pricing.free_tier);
        else if (f === 'has_pricing') filtered = filtered.filter(p => p.pricing && p.pricing.starting_price);
        else if (f.startsWith('pt:')) {
          const pt = f.slice(3);
          filtered = filtered.filter(p => ((p.target_audience || {}).property_types || p.property_types || []).includes(pt));
        }
      });
      const allTitle = document.getElementById('all-title');
      if (filtered.length === 0) {
        if (allGrid) allGrid.innerHTML = `<div class="search-no-results"><div class="no-results-icon">🔍</div><h3>No results found</h3><p>Try different keywords or remove some filters</p></div>`;
        if (allTitle) allTitle.textContent = 'Results (0)';
      } else {
        if (allGrid) allGrid.innerHTML = filtered.map(productCard).join('');
        if (allTitle) allTitle.textContent = `Results (${filtered.length})`;
      }
      if (searchSection) searchSection.style.display = '';
      document.querySelectorAll('.hide-on-search').forEach(el => el.style.display = 'none');
    } else {
      if (searchSection) searchSection.style.display = 'none';
      document.querySelectorAll('.hide-on-search').forEach(el => el.style.display = '');
    }
  };

  if (search) {
    search.addEventListener('input', runHomeSearch);
  }

  // Keyboard shortcut: "/" to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      if (search) search.focus();
    }
  });
  
  // JSON-LD
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "CRE Software Directory",
    "url": BASE_URL,
    "description": "Find and compare " + PRODUCTS.length + "+ commercial real estate software tools",
    "potentialAction": {
      "@type": "SearchAction",
      "target": BASE_URL + "/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });
}

// ====== PRODUCT PAGE ======
async function initProduct() {
  await loadData();
  initNav();
  initBackToTop();
  
  const slug = location.hash.slice(1);
  const product = PRODUCTS.find(p => p.slug === slug);
  const el = document.getElementById('product-content');
  
  if (!product || !el) {
    if (el) el.innerHTML = '<p>Product not found. <a href="index.html">Browse all tools</a></p>';
    return;
  }
  
  const seo = product.seo || {};
  document.title = seo.title || `${product.title} Review 2026 | CRE Software Directory`;
  setMeta('description', seo.description || `${product.title}: ${product.headline}. Compare pricing, features & alternatives.`);
  setMeta('og:title', document.title);
  setMeta('og:description', seo.description || product.headline);
  setMeta('og:url', `${BASE_URL}/product.html#${slug}`);
  setMeta('og:type', 'website');
  setCanonical(`${BASE_URL}/product.html#${slug}`);

  const pricing = product.pricing || {};
  const company = product.company || {};
  const ta = product.target_audience || {};

  // Badges
  const badges = [];
  if (pricing.free_trial) badges.push('<span class="badge-hero badge-hero-free">Free Trial</span>');
  if (pricing.free_tier) badges.push('<span class="badge-hero badge-hero-free">Free Tier</span>');
  if (product.is_verified) badges.push('<span class="badge-hero badge-hero-verified">✓ Verified</span>');
  if (product.is_featured) badges.push('<span class="badge-hero badge-hero-top">⭐ Featured</span>');

  // Rating
  const ratingHTML = product.rating ? `<div class="rating-display">
    ${starsHTML(product.rating, 20)}
    <span class="rating-text">${product.rating}/5${product.review_count ? ` (${product.review_count} reviews)` : ''}</span>
  </div>` : '';

  // Tab navigation — built later after content sections are determined

  // Quick stats
  const statsItems = [
    { label: 'Starting Price', value: pricingLabel(product) },
    { label: 'Best For', value: (ta.roles || []).join(', ') || 'CRE Professionals' },
    { label: 'Company Size', value: (ta.company_sizes || []).join(', ') || 'All sizes' },
    { label: 'Deployment', value: (product.deployment || []).join(', ') || 'Cloud' },
    { label: 'Property Types', value: (ta.property_types || product.property_types || []).join(', ') || 'All types' }
  ];

  // Categories with links
  const cats = (product.categories || []).map(c => {
    const cs = Object.values(CATEGORIES).find(cat => cat.name === c);
    return cs ? `<a href="category.html#${cs.slug}" class="badge badge-accent">${c}</a>` : `<span class="badge badge-accent">${c}</span>`;
  }).join(' ');

  // Overview - Pros & Cons
  const hasPros = product.pros && product.pros.length;
  const hasCons = product.cons && product.cons.length;
  const prosConsHTML = (hasPros || hasCons) ? `<div class="proscons">
    ${hasPros ? `<div class="proscons-col"><h3 class="pros-title">✓ Pros</h3>${product.pros.map(p => `<div class="proscons-item"><span class="icon-pro">✓</span>${p}</div>`).join('')}</div>` : ''}
    ${hasCons ? `<div class="proscons-col"><h3 class="cons-title">✗ Cons</h3>${product.cons.map(c => `<div class="proscons-item"><span class="icon-con">✗</span>${c}</div>`).join('')}</div>` : ''}
  </div>` : '';

  // Target audience
  const audienceHTML = (ta.roles && ta.roles.length) || (ta.company_sizes && ta.company_sizes.length) || (ta.property_types && ta.property_types.length) ? `
    <div class="audience-section">
      <h3>Who This Is For</h3>
      <div class="audience-grid">
        ${ta.roles && ta.roles.length ? `<div class="audience-item"><div class="audience-label">Roles</div><div class="audience-tags">${ta.roles.map(r => `<span class="badge">${r}</span>`).join('')}</div></div>` : ''}
        ${ta.company_sizes && ta.company_sizes.length ? `<div class="audience-item"><div class="audience-label">Company Size</div><div class="audience-tags">${ta.company_sizes.map(s => `<span class="badge">${s}</span>`).join('')}</div></div>` : ''}
        ${ta.property_types && ta.property_types.length ? `<div class="audience-item"><div class="audience-label">Property Types</div><div class="audience-tags">${ta.property_types.map(t => `<span class="badge">${t}</span>`).join('')}</div></div>` : ''}
      </div>
    </div>` : '';

  // Features - collapsible groups
  const fg = product.feature_groups || [];
  const featuresHTML = fg.length ? `<div class="features-section" id="sec-features">
    <h2>Features</h2>
    ${fg.map((g, i) => `<div class="feature-group">
      <button class="feature-group-toggle" onclick="this.parentElement.classList.toggle('open')">
        <span>${g.name}</span>
        <span class="fg-count">${(g.features || []).length} features</span>
        <span class="fg-arrow">▸</span>
      </button>
      <div class="feature-group-body">
        ${(g.features || []).map(f => `<div class="feature-row">
          <span class="feature-name">✦ ${f.name}</span>
          ${f.description ? `<span class="feature-desc">${f.description}</span>` : ''}
        </div>`).join('')}
      </div>
    </div>`).join('')}
  </div>` : '';

  // Pricing cards — only show if we have real pricing info
  const plans = pricing.plans || [];
  const hasPricingInfo = plans.length > 0 || pricing.starting_price || pricing.free_trial || pricing.free_tier;
  const pricingHTML = hasPricingInfo ? `<div class="pricing-section" id="sec-pricing">
    <h2>Pricing</h2>
    <div class="pricing-meta">
      <span class="pricing-model-badge">${pricing.model || 'Quote-based'}</span>
      ${pricing.billing_options && pricing.billing_options.length ? `<span class="billing-options">Billing: ${pricing.billing_options.join(', ')}</span>` : ''}
      ${pricing.free_trial ? '<span class="badge badge-green">Free Trial Available</span>' : ''}
      ${pricing.free_tier ? '<span class="badge badge-green">Free Tier Available</span>' : ''}
    </div>
    ${plans.length ? `<div class="pricing-cards">
      ${plans.map(plan => `<div class="pricing-card">
        <div class="plan-name">${plan.name}</div>
        <div class="plan-price">${plan.price || 'Contact'}</div>
        ${plan.description ? `<div class="plan-desc">${plan.description}</div>` : ''}
        ${plan.includes && plan.includes.length ? `<ul class="plan-includes">${plan.includes.map(i => `<li>✓ ${i}</li>`).join('')}</ul>` : ''}
      </div>`).join('')}
    </div>` : `<div class="pricing-contact">
      <p>Starting at <strong>${pricing.starting_price}</strong></p>
    </div>`}
  </div>` : '';

  // Screenshots — only show section if we have screenshots or a video
  const hasScreenshots = product.screenshots && product.screenshots.length;
  const hasVideo = product.video_url;
  const screenshotsHTML = (hasScreenshots || hasVideo) ? `<div class="screenshot-gallery" id="sec-screenshots">
    <h2>Screenshots</h2>
    ${hasScreenshots ? `<div class="screenshot-scroll">${product.screenshots.map(s => `<img src="${s}" alt="${product.title} screenshot" onclick="openLightbox(this.src)">`).join('')}</div>` : ''}
    ${hasVideo ? `<div class="video-embed"><iframe src="${product.video_url}" allowfullscreen></iframe></div>` : ''}
  </div>` : '';

  // Integrations
  const integrationsHTML = product.integrations && product.integrations.length
    ? `<div class="integrations-section"><h3>Integrations</h3><div class="integrations-list">${product.integrations.map(i => {
        const name = typeof i === 'string' ? i : i.name;
        const cat = typeof i === 'object' && i.category ? ` <small>(${i.category})</small>` : '';
        return `<span class="integration-badge">${name}${cat}</span>`;
      }).join('')}</div></div>` : '';

  // Company info
  const companyHTML = (company.founded || company.headquarters || company.employees) ? `<div class="company-info" id="sec-company">
    <h2>Company Info</h2>
    <div class="company-info-grid">
      ${company.name ? `<div class="company-info-item"><div class="ci-label">Company</div><div class="ci-value">${company.name}</div></div>` : ''}
      ${company.founded ? `<div class="company-info-item"><div class="ci-label">Founded</div><div class="ci-value">${company.founded}</div></div>` : ''}
      ${company.headquarters ? `<div class="company-info-item"><div class="ci-label">Headquarters</div><div class="ci-value">${company.headquarters}</div></div>` : ''}
      ${company.employees ? `<div class="company-info-item"><div class="ci-label">Employees</div><div class="ci-value">${company.employees}</div></div>` : ''}
      ${company.funding ? `<div class="company-info-item"><div class="ci-label">Funding</div><div class="ci-value">${company.funding}</div></div>` : ''}
    </div>
    <a href="${product.url}" target="_blank" rel="noopener" class="company-link">Visit ${product.title} →</a>
  </div>` : '';

  // Tab navigation — built after content sections are determined
  const tabs = ['Overview'];
  if (fg.length) tabs.push('Features');
  if (hasPricingInfo) tabs.push('Pricing');
  if (hasScreenshots || hasVideo) tabs.push('Screenshots');
  if (company.founded || company.headquarters || company.employees) tabs.push('Company');
  tabs.push('Alternatives');

  // Related tools carousels
  let relatedHTML = '';
  const usedSlugs = new Set([slug]);
  (product.categories || []).forEach(cat => {
    const related = PRODUCTS.filter(p => !usedSlugs.has(p.slug) && (p.categories || []).includes(cat));
    if (related.length === 0) return;
    const items = related.slice(0, 10);
    const id = 'carousel-' + slugify(cat);
    const cards = items.map(p => { usedSlugs.add(p.slug); return compactProductCard(p); }).join('');
    relatedHTML += `<div class="carousel-group"><h3>${cat}</h3><div class="carousel-wrapper">
      <button class="carousel-btn prev" onclick="scrollCarousel('${id}',-1)">‹</button>
      <div class="carousel-track" id="${id}">${cards}</div>
      <button class="carousel-btn next" onclick="scrollCarousel('${id}',1)">›</button>
    </div></div>`;
  });

  el.innerHTML = `
    <div class="breadcrumbs">
      <a href="index.html">Home</a> / 
      ${product.categories && product.categories[0] ? `<a href="category.html#${slugify(product.categories[0])}">${product.categories[0]}</a> / ` : ''}
      ${product.title}
    </div>
    
    <div class="product-hero">
      <div class="logo-large">${logoHTML(product, 64)}</div>
      <div class="hero-content">
        <h1>${product.title}</h1>
        <div class="headline">${product.headline || product.short_description || ''}</div>
        ${ratingHTML}
        <div class="hero-badges">${badges.join('')} ${cats}</div>
        <div class="hero-actions">
          <a href="${product.url}" target="_blank" rel="noopener" class="cta-btn">Visit Website →</a>
          <a href="compare.html" class="cta-btn cta-btn-outline">Compare</a>
        </div>
      </div>
    </div>
    
    <div class="stats-bar">
      ${statsItems.map(s => `<div class="stat-item"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('')}
    </div>
    
    <div class="product-tabs">
      ${tabs.map(t => `<a href="#sec-${t.toLowerCase()}" class="tab-link" onclick="scrollToSection(event, 'sec-${t.toLowerCase()}')">${t}</a>`).join('')}
    </div>
    
    <div class="description-section" id="sec-overview">
      <h2>About ${product.title}</h2>
      <div class="product-description">${(product.description || '').replace(/\n/g, '<br>')}</div>
    </div>
    ${prosConsHTML}
    ${audienceHTML}
    ${featuresHTML}
    ${pricingHTML}
    ${screenshotsHTML}
    ${integrationsHTML}
    ${companyHTML}
    
    <div class="bottom-cta">
      <a href="${product.url}" target="_blank" rel="noopener" class="cta-btn">Visit ${product.title} →</a>
      <a href="submit.html" class="claim-link">Submit a correction or claim this listing</a>
    </div>
    
    ${relatedHTML ? `<div class="related-section" id="sec-alternatives"><h2>Alternatives & Related Tools</h2>${relatedHTML}</div>` : ''}
    <div class="similar-section" id="sec-similar"></div>
  `;

  // Auto-open first feature group
  const firstFg = el.querySelector('.feature-group');
  if (firstFg) firstFg.classList.add('open');

  // Similar Products (from same categories, not already in related)
  const similarEl = document.getElementById('sec-similar');
  if (similarEl) {
    const primaryCat = (product.categories || [])[0];
    if (primaryCat) {
      const similar = PRODUCTS.filter(p => p.slug !== slug && !usedSlugs.has(p.slug) && (p.categories || []).includes(primaryCat))
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 4);
      if (similar.length) {
        similarEl.innerHTML = `<h2>Similar Products</h2><div class="similar-grid">${similar.map(compactProductCard).join('')}</div>`;
      }
    }
  }

  // JSON-LD
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": product.title,
    "url": product.url,
    "description": product.short_description || product.headline,
    "applicationCategory": (product.categories || [])[0] || "BusinessApplication",
    "operatingSystem": (product.deployment || []).join(', '),
    "offers": pricing.starting_price ? {
      "@type": "Offer",
      "price": pricing.starting_price.replace(/[^0-9.]/g, '') || "0",
      "priceCurrency": "USD"
    } : { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  };
  if (product.rating) {
    ld.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "bestRating": 5, "reviewCount": product.review_count || 1 };
  }
  addJsonLd(ld);

  // Breadcrumb JSON-LD
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      ...(product.categories && product.categories[0] ? [{ "@type": "ListItem", "position": 2, "name": product.categories[0], "item": `${BASE_URL}/category.html#${slugify(product.categories[0])}` }] : []),
      { "@type": "ListItem", "position": product.categories && product.categories[0] ? 3 : 2, "name": product.title }
    ]
  });
}

function scrollToSection(e, id) {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollCarousel(id, dir) {
  const track = document.getElementById(id);
  if (!track) return;
  track.scrollBy({ left: dir * 340, behavior: 'smooth' });
}

function openLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<img src="${src}" alt="Screenshot"><button class="lightbox-close">✕</button>`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// ====== CATEGORY PAGE ======
async function initCategory() {
  await loadData();
  initNav();
  
  const slug = location.hash.slice(1);
  const cat = CATEGORIES[slug];
  const header = document.getElementById('category-header');
  const grid = document.getElementById('category-products');
  const sidebar = document.getElementById('filter-sidebar');
  const sortBar = document.getElementById('sort-bar');
  
  if (!cat) {
    if (grid) grid.innerHTML = '<p>Category not found. <a href="index.html">Browse all</a></p>';
    return;
  }
  
  const seoTitle = cat.seo_title || `${cat.name} Software - CRE Software Directory`;
  const seoDesc = cat.seo_description || `${cat.description} Browse and compare ${cat.product_count} ${cat.name.toLowerCase()} tools.`;
  document.title = seoTitle;
  setMeta('description', seoDesc);
  setMeta('og:title', seoTitle);
  setMeta('og:description', seoDesc);
  setMeta('og:url', `${BASE_URL}/category.html#${slug}`);
  setMeta('og:type', 'website');
  setCanonical(`${BASE_URL}/category.html#${slug}`);

  const ed = cat.editorial || {};
  
  if (header) {
    const icon = typeof CATEGORY_ICONS !== 'undefined' ? (CATEGORY_ICONS[slug] || '') : '';
    header.innerHTML = `<div class="container">
      <div class="breadcrumbs"><a href="index.html">Home</a> / ${cat.name}</div>
      <div class="category-hero-row">
        ${icon ? `<span class="category-hero-icon">${icon}</span>` : ''}
        <div>
          <h1>${cat.name} Software</h1>
          <p>${cat.description}</p>
          <div class="cat-stats"><strong>${cat.product_count}</strong> tools in this category</div>
        </div>
      </div>
    </div>`;
  }

  // Editorial intro
  const editorialContainer = document.getElementById('editorial-content');
  if (editorialContainer && ed.intro) {
    let editorialHTML = '';
    // Intro
    editorialHTML += `<div class="editorial-intro">${ed.intro.split('\n').filter(p=>p.trim()).map(p => `<p>${p}</p>`).join('')}</div>`;
    // What to look for
    if (ed.what_to_look_for && ed.what_to_look_for.length) {
      editorialHTML += `<div class="editorial-criteria"><h2>What to Look For in ${cat.name} Software</h2><div class="criteria-grid">${ed.what_to_look_for.map(c => `<div class="criteria-card"><h3>${c.title}</h3><p>${c.description}</p></div>`).join('')}</div></div>`;
    }
    editorialContainer.innerHTML = editorialHTML;
    editorialContainer.style.display = '';
  }

  // FAQ section
  const faqContainer = document.getElementById('faq-section');
  if (faqContainer && ed.faq && ed.faq.length) {
    faqContainer.innerHTML = `<div class="container"><h2>Frequently Asked Questions</h2><div class="faq-list">${ed.faq.map(f => `<details class="faq-item"><summary>${f.question}</summary><p>${f.answer}</p></details>`).join('')}</div>${ed.buyer_tip ? `<div class="buyer-tip"><strong>💡 Buyer Tip:</strong> ${ed.buyer_tip}</div>` : ''}</div>`;
    faqContainer.style.display = '';
    // FAQ JSON-LD
    addJsonLd({"@context":"https://schema.org","@type":"FAQPage","mainEntity":ed.faq.map(f=>({"@type":"Question","name":f.question,"acceptedAnswer":{"@type":"Answer","text":f.answer}}))});
  }
  
  let products = PRODUCTS.filter(p => cat.products.includes(p.slug));
  let currentSort = 'name';
  let filters = { propertyType: '', pricingModel: '', deployment: '' };

  // Collect filter options
  const propertyTypes = [...new Set(products.flatMap(p => (p.target_audience || {}).property_types || p.property_types || []))].sort();
  const pricingModels = [...new Set(products.map(p => (p.pricing || {}).model || p.pricing_model || 'Quote-based'))].sort();
  const deployments = [...new Set(products.flatMap(p => p.deployment || []))].sort();

  if (sidebar) {
    sidebar.innerHTML = `
      <h3>Filters</h3>
      ${propertyTypes.length ? `<div class="filter-group">
        <label>Property Type</label>
        <select id="filter-pt"><option value="">All</option>${propertyTypes.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
      </div>` : ''}
      <div class="filter-group">
        <label>Pricing Model</label>
        <select id="filter-pricing"><option value="">All</option>${pricingModels.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
      </div>
      ${deployments.length ? `<div class="filter-group">
        <label>Deployment</label>
        <select id="filter-deploy"><option value="">All</option>${deployments.map(d => `<option value="${d}">${d}</option>`).join('')}</select>
      </div>` : ''}
      <button class="filter-reset" onclick="resetFilters()">Reset Filters</button>
    `;
    sidebar.querySelectorAll('select').forEach(s => s.addEventListener('change', applyFilters));
  }

  if (sortBar) {
    sortBar.innerHTML = `<span id="result-count">${products.length} tools</span>
      <div class="sort-controls">
        <label>Sort by:</label>
        <select id="sort-select">
          <option value="name">Name</option>
          <option value="rating">Rating</option>
          <option value="updated">Recently Updated</option>
        </select>
      </div>`;
    document.getElementById('sort-select').addEventListener('change', (e) => { currentSort = e.target.value; render(); });
  }

  function applyFilters() {
    const ptEl = document.getElementById('filter-pt');
    const prEl = document.getElementById('filter-pricing');
    const dpEl = document.getElementById('filter-deploy');
    filters.propertyType = ptEl ? ptEl.value : '';
    filters.pricingModel = prEl ? prEl.value : '';
    filters.deployment = dpEl ? dpEl.value : '';
    render();
  }

  window.resetFilters = function() {
    sidebar.querySelectorAll('select').forEach(s => s.value = '');
    filters = { propertyType: '', pricingModel: '', deployment: '' };
    render();
  };

  function render() {
    let filtered = products;
    if (filters.propertyType) filtered = filtered.filter(p => ((p.target_audience || {}).property_types || p.property_types || []).includes(filters.propertyType));
    if (filters.pricingModel) filtered = filtered.filter(p => ((p.pricing || {}).model || p.pricing_model) === filters.pricingModel);
    if (filters.deployment) filtered = filtered.filter(p => (p.deployment || []).includes(filters.deployment));
    
    if (currentSort === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (currentSort === 'updated') filtered.sort((a, b) => (b.last_updated || '').localeCompare(a.last_updated || ''));
    else filtered.sort((a, b) => a.title.localeCompare(b.title));
    
    const countEl = document.getElementById('result-count');
    if (countEl) countEl.textContent = `${filtered.length} tools`;
    if (grid) grid.innerHTML = filtered.length ? filtered.map(productCard).join('') : '<p class="no-results">No tools match your filters. Try adjusting your criteria.</p>';
  }

  render();

  // JSON-LD
  addJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${cat.name} Software`,
    "description": cat.description,
    "numberOfItems": products.length,
    "itemListElement": products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE_URL}/product.html#${p.slug}`,
      "name": p.title
    }))
  });

  addJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": cat.name }
    ]
  });
}

// ====== COMPARE PAGE ======
async function initCompare() {
  await loadData();
  initNav();
  
  const selects = document.querySelectorAll('.compare-product-select');
  const options = '<option value="">Select a product...</option>' + 
    PRODUCTS.sort((a, b) => a.title.localeCompare(b.title)).map(p => `<option value="${p.slug}">${p.title}</option>`).join('');
  selects.forEach(s => { s.innerHTML = options; s.addEventListener('change', renderCompare); });
}

function renderCompare() {
  const slugs = [...document.querySelectorAll('.compare-product-select')].map(s => s.value);
  const products = slugs.map(s => PRODUCTS.find(p => p.slug === s)).filter(Boolean);
  
  products.forEach((p, i) => {
    const el = document.getElementById(`compare-detail-${i}`);
    if (!el) return;
    const pricing = p.pricing || {};
    const company = p.company || {};
    el.innerHTML = p ? `
      <div class="compare-product-header">
        <div class="product-logo" style="margin:0 auto">${logoHTML(p)}</div>
        <h3>${p.title}</h3>
        <div class="tagline">${p.short_description || p.tagline || p.headline || ''}</div>
        ${p.rating ? `<div class="card-rating">${starsHTML(p.rating, 14)} <span class="rating-num">${p.rating}</span></div>` : ''}
      </div>
      <div class="compare-details">
        <div class="meta-item"><label>Categories</label><span>${(p.categories || []).join(', ')}</span></div>
        <div class="meta-item"><label>Property Types</label><span>${((p.target_audience || {}).property_types || p.property_types || []).join(', ')}</span></div>
        <div class="meta-item"><label>Deployment</label><span>${(p.deployment || []).join(', ')}</span></div>
        <div class="meta-item"><label>Pricing</label><span>${pricingLabel(p)}</span></div>
        <div class="meta-item"><label>Free Trial</label><span>${pricing.free_trial ? '✓ Yes' : '✗ No'}</span></div>
        <div class="meta-item"><label>Free Tier</label><span>${pricing.free_tier ? '✓ Yes' : '✗ No'}</span></div>
        ${company.founded ? `<div class="meta-item"><label>Founded</label><span>${company.founded}</span></div>` : ''}
        ${company.employees ? `<div class="meta-item"><label>Employees</label><span>${company.employees}</span></div>` : ''}
      </div>
      <div style="margin-top:16px;text-align:center">
        <a href="product.html#${p.slug}" class="cta-btn cta-btn-sm">View Details</a>
        <a href="${p.url}" target="_blank" class="cta-btn cta-btn-outline cta-btn-sm">Visit Website →</a>
      </div>
    ` : '';
  });
}

// ====== HELPERS ======
function slugify(str) {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').trim();
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function addJsonLd(data) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
