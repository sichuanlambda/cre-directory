/* CRE Software Directory - Main JS */
let PRODUCTS = [];
let CATEGORIES = {};

const COLORS = ['#4361ee','#e74c3c','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#3498db','#e91e63','#00bcd4'];

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

function productCard(p) {
  const cats = p.categories.slice(0, 2).map(c => `<span class="badge badge-accent">${c}</span>`).join('');
  return `<div class="product-card">
    <div class="product-logo">${logoHTML(p)}</div>
    <div class="product-info">
      <h3><a href="product.html#${p.slug}">${p.title}</a></h3>
      <div class="tagline">${p.tagline}</div>
      <div class="cats">${cats}${p.is_free ? '<span class="badge badge-green">Free</span>' : ''}</div>
    </div>
  </div>`;
}

function categoryCard(cat) {
  return `<a class="cat-card" href="category.html#${cat.slug}">
    <h3>${cat.name}</h3>
    <div class="count">${cat.product_count} tools</div>
  </a>`;
}

async function loadData() {
  const base = '';
  const [pRes, cRes] = await Promise.all([
    fetch(base + 'data/products.json'),
    fetch(base + 'data/categories.json')
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

// Homepage
async function initHome() {
  await loadData();
  initNav();
  
  // Categories
  const catGrid = document.getElementById('cat-grid');
  if (catGrid) {
    catGrid.innerHTML = Object.values(CATEGORIES)
      .sort((a, b) => b.product_count - a.product_count)
      .map(categoryCard).join('');
  }
  
  // Featured products
  const featured = document.getElementById('featured-products');
  if (featured) {
    const top = PRODUCTS.filter(p => p.is_top_rated).slice(0, 6);
    const items = top.length >= 6 ? top : PRODUCTS.slice(0, 6);
    featured.innerHTML = items.map(productCard).join('');
  }
  
  // All products
  const allGrid = document.getElementById('all-products');
  if (allGrid) {
    allGrid.innerHTML = PRODUCTS.map(productCard).join('');
  }
  
  // Search
  const search = document.getElementById('search-input');
  if (search) {
    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!allGrid) return;
      const filtered = q ? PRODUCTS.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.categories.some(c => c.toLowerCase().includes(q))
      ) : PRODUCTS;
      allGrid.innerHTML = filtered.map(productCard).join('');
      // Show/hide sections
      document.querySelectorAll('.hide-on-search').forEach(el => {
        el.style.display = q ? 'none' : '';
      });
    });
  }
}

// Product page
async function initProduct() {
  await loadData();
  initNav();
  
  const slug = location.hash.slice(1);
  const product = PRODUCTS.find(p => p.slug === slug);
  const el = document.getElementById('product-content');
  
  if (!product || !el) {
    if (el) el.innerHTML = '<p>Product not found. <a href="index.html">Browse all tools</a></p>';
    return;
  }
  
  document.title = `${product.title} - CRE Software Directory`;
  
  setMeta('description', `${product.title}: ${product.tagline}. Compare CRE software tools.`);
  setMeta('og:title', `${product.title} - CRE Software Directory`);
  setMeta('og:description', product.tagline);
  
  // Badges
  const badges = [];
  if (product.is_free) badges.push('<span class="badge-hero badge-hero-free">Free</span>');
  if (product.is_top_rated) badges.push('<span class="badge-hero badge-hero-top">⭐ Top Rated</span>');
  if (product.is_verified) badges.push('<span class="badge-hero badge-hero-verified">✓ Verified</span>');

  // Rating
  const ratingHTML = product.rating ? `<div class="rating-display">
    <span class="rating-stars">${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}</span>
    <span class="rating-text">${product.rating}/5${product.review_count ? ` (${product.review_count} reviews)` : ''}</span>
  </div>` : '';

  // Screenshots
  const screenshotsHTML = product.screenshots && product.screenshots.length
    ? `<div class="screenshot-gallery"><h2>Screenshots</h2><div class="screenshot-scroll">${product.screenshots.map(s => `<img src="${s}" alt="Screenshot" onclick="openLightbox(this.src)">`).join('')}</div></div>`
    : '<div class="screenshot-gallery"><div class="screenshot-placeholder">📷 No screenshots available yet</div></div>';

  // Features
  const featuresHTML = product.features && product.features.length
    ? `<div class="features-section"><h2>Features</h2><div class="features-grid">${product.features.map(f => `<div class="feature-item">${f}</div>`).join('')}</div></div>` : '';

  // Pros & Cons
  const hasProsCons = (product.pros && product.pros.length) || (product.cons && product.cons.length);
  const prosConsHTML = hasProsCons ? `<div class="proscons">
    <div class="proscons-col">${product.pros && product.pros.length ? `<h2 class="pros-title">✓ Pros</h2>${product.pros.map(p => `<div class="proscons-item"><span class="icon-pro">✓</span>${p}</div>`).join('')}` : ''}</div>
    <div class="proscons-col">${product.cons && product.cons.length ? `<h2 class="cons-title">✗ Cons</h2>${product.cons.map(c => `<div class="proscons-item"><span class="icon-con">✗</span>${c}</div>`).join('')}` : ''}</div>
  </div>` : '';

  // Pricing details
  const pd = product.pricing_details || {};
  const hasPricingDetails = pd.starting_price || pd.free_trial || (pd.tiers && pd.tiers.length);
  const pricingDetailsHTML = hasPricingDetails ? `<div class="pricing-section"><h2>Pricing Details</h2>
    ${pd.starting_price ? `<div class="pricing-detail"><strong>Starting at:</strong> ${pd.starting_price}</div>` : ''}
    ${pd.free_trial ? '<div class="pricing-detail">✓ Free trial available</div>' : ''}
    ${pd.tiers && pd.tiers.length ? `<div class="pricing-detail"><strong>Plans:</strong> ${pd.tiers.join(', ')}</div>` : ''}
  </div>` : '';

  // Integrations
  const integrationsHTML = product.integrations && product.integrations.length
    ? `<div class="integrations-section"><h2>Integrations</h2><div class="integrations-list">${product.integrations.map(i => `<span class="integration-badge">${i}</span>`).join('')}</div></div>` : '';

  // Company info
  const hasCompanyInfo = product.founded || product.headquarters || product.company_size;
  const companyHTML = hasCompanyInfo ? `<div class="company-info"><h2>Company Info</h2><div class="company-info-grid">
    ${product.founded ? `<div class="company-info-item"><div class="ci-label">Founded</div><div class="ci-value">${product.founded}</div></div>` : ''}
    ${product.headquarters ? `<div class="company-info-item"><div class="ci-label">Headquarters</div><div class="ci-value">${product.headquarters}</div></div>` : ''}
    ${product.company_size ? `<div class="company-info-item"><div class="ci-label">Company Size</div><div class="ci-value">${product.company_size}</div></div>` : ''}
  </div></div>` : '';

  // Stats bar
  const stats = [
    { label: 'Pricing', value: product.pricing_model + (product.is_free ? ' · Free' : '') },
    { label: 'Deployment', value: product.deployment.join(', ') },
    { label: 'Property Types', value: product.property_types.join(', ') },
  ];
  if (product.founded) stats.push({ label: 'Founded', value: product.founded });

  // Categories with links
  const cats = product.categories.map(c => {
    const cs = Object.values(CATEGORIES).find(cat => cat.name === c);
    return cs ? `<a href="category.html#${cs.slug}" class="badge badge-accent">${c}</a>` : `<span class="badge badge-accent">${c}</span>`;
  }).join(' ');

  // Related tools by category — carousel per category
  let relatedHTML = '';
  const usedSlugs = new Set([slug]);
  const carousels = [];
  product.categories.forEach(cat => {
    const related = PRODUCTS.filter(p => !usedSlugs.has(p.slug) && p.categories.includes(cat));
    if (related.length === 0) return;
    const items = related.slice(0, 10);
    const id = 'carousel-' + slugify(cat);
    carousels.push(id);
    const cards = items.map(p => { usedSlugs.add(p.slug); return productCard(p); }).join('');
    relatedHTML += `<div class="carousel-group"><h3>${cat}</h3><div class="carousel-wrapper">
      <button class="carousel-btn prev" onclick="scrollCarousel('${id}',-1)">‹</button>
      <div class="carousel-track" id="${id}">${cards}</div>
      <button class="carousel-btn next" onclick="scrollCarousel('${id}',1)">›</button>
    </div></div>`;
  });

  el.innerHTML = `
    <div class="breadcrumbs">
      <a href="index.html">Home</a> / 
      ${product.categories[0] ? `<a href="category.html#${slugify(product.categories[0])}">${product.categories[0]}</a> / ` : ''}
      ${product.title}
    </div>
    <div class="product-hero">
      <div class="logo-large">${logoHTML(product, 96)}</div>
      <div>
        <h1>${product.title}</h1>
        <div class="tagline">${product.tagline}</div>
        ${ratingHTML}
        <div class="hero-badges">${badges.join('')} ${cats}</div>
        <a href="${product.url}" target="_blank" rel="noopener" class="cta-btn">Visit Website →</a>
      </div>
    </div>
    <div class="stats-bar">
      ${stats.map(s => `<div class="stat-item"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`).join('')}
    </div>
    ${screenshotsHTML}
    <div class="description-section"><h2>About ${product.title}</h2><div class="product-description">${product.description.replace(/\n/g, '<br>')}</div></div>
    ${featuresHTML}
    ${prosConsHTML}
    ${pricingDetailsHTML}
    ${integrationsHTML}
    ${companyHTML}
    <div class="bottom-cta">
      <a href="${product.url}" target="_blank" rel="noopener" class="cta-btn">Visit ${product.title} Website →</a>
      <a href="submit.html" class="claim-link">Is this your product? Claim it or suggest edits</a>
    </div>
    ${relatedHTML ? `<div class="related-section"><h2>Related Tools</h2>${relatedHTML}</div>` : ''}
  `;
  
  // JSON-LD
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": product.title,
    "url": product.url,
    "description": product.tagline,
    "applicationCategory": product.categories[0] || "BusinessApplication",
    "operatingSystem": product.deployment.join(', '),
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  };
  if (product.rating) { ld.aggregateRating = { "@type": "AggregateRating", "ratingValue": product.rating, "bestRating": 5, "reviewCount": product.review_count || 1 }; }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
}

function scrollCarousel(id, dir) {
  const track = document.getElementById(id);
  if (!track) return;
  track.scrollBy({ left: dir * 320, behavior: 'smooth' });
}

function openLightbox(src) {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = `<img src="${src}" alt="Screenshot">`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

// Category page
async function initCategory() {
  await loadData();
  initNav();
  
  const slug = location.hash.slice(1);
  const cat = CATEGORIES[slug];
  const header = document.getElementById('category-header');
  const grid = document.getElementById('category-products');
  
  if (!cat) {
    if (grid) grid.innerHTML = '<p>Category not found. <a href="index.html">Browse all</a></p>';
    return;
  }
  
  document.title = `${cat.name} Software - CRE Software Directory`;
  setMeta('description', `${cat.description} Browse ${cat.product_count} tools.`);
  
  if (header) {
    header.innerHTML = `
      <div class="container">
        <div class="breadcrumbs"><a href="index.html">Home</a> / ${cat.name}</div>
        <h1>${cat.name} Software</h1>
        <p>${cat.description} <strong>${cat.product_count} tools</strong></p>
      </div>`;
  }
  
  const products = PRODUCTS.filter(p => cat.products.includes(p.slug));
  if (grid) {
    grid.innerHTML = products.map(productCard).join('');
  }
}

// Compare page
async function initCompare() {
  await loadData();
  initNav();
  
  const selects = document.querySelectorAll('.compare-product-select');
  const options = '<option value="">Select a product...</option>' + 
    PRODUCTS.map(p => `<option value="${p.slug}">${p.title}</option>`).join('');
  selects.forEach(s => { s.innerHTML = options; s.addEventListener('change', renderCompare); });
}

function renderCompare() {
  const slugs = [...document.querySelectorAll('.compare-product-select')].map(s => s.value);
  const products = slugs.map(s => PRODUCTS.find(p => p.slug === s)).filter(Boolean);
  
  products.forEach((p, i) => {
    const el = document.getElementById(`compare-detail-${i}`);
    if (!el) return;
    el.innerHTML = p ? `
      <div style="text-align:center;margin-bottom:16px">
        <div class="product-logo" style="margin:0 auto">${logoHTML(p)}</div>
        <h3 style="margin-top:8px">${p.title}</h3>
        <div class="tagline" style="font-size:13px;color:var(--gray-600)">${p.tagline}</div>
      </div>
      <div class="meta-item"><label>Categories</label><span>${p.categories.join(', ')}</span></div>
      <div class="meta-item"><label>Property Types</label><span>${p.property_types.join(', ')}</span></div>
      <div class="meta-item"><label>Deployment</label><span>${p.deployment.join(', ')}</span></div>
      <div class="meta-item"><label>Pricing</label><span>${p.pricing_model}</span></div>
      <div style="margin-top:12px"><a href="${p.url}" target="_blank" class="cta-btn" style="width:100%;justify-content:center">Visit Website →</a></div>
    ` : '';
  });
}

// Helpers
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
