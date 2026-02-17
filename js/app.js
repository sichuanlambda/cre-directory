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
  
  // Meta tags
  setMeta('description', `${product.title}: ${product.tagline}. Compare CRE software tools.`);
  setMeta('og:title', `${product.title} - CRE Software Directory`);
  setMeta('og:description', product.tagline);
  
  const cats = product.categories.map(c => {
    const cs = Object.values(CATEGORIES).find(cat => cat.name === c);
    return cs ? `<a href="category.html#${cs.slug}" class="badge badge-accent">${c}</a>` : `<span class="badge badge-accent">${c}</span>`;
  }).join(' ');
  
  const related = PRODUCTS.filter(p => p.slug !== slug && p.categories.some(c => product.categories.includes(c))).slice(0, 4);
  
  el.innerHTML = `
    <div class="breadcrumbs">
      <a href="index.html">Home</a> / 
      ${product.categories[0] ? `<a href="category.html#${slugify(product.categories[0])}">${product.categories[0]}</a> / ` : ''}
      ${product.title}
    </div>
    <div class="product-header">
      <div class="logo-large">${logoHTML(product, 72)}</div>
      <div>
        <h1>${product.title}</h1>
        <div class="tagline">${product.tagline}</div>
      </div>
    </div>
    <div class="product-meta">
      <div class="meta-item"><label>Categories</label><span>${cats}</span></div>
      <div class="meta-item"><label>Property Types</label><span>${product.property_types.join(', ')}</span></div>
      <div class="meta-item"><label>Deployment</label><span>${product.deployment.join(', ')}</span></div>
      <div class="meta-item"><label>Pricing</label><span>${product.pricing_model}${product.is_free ? ' · Free' : ''}</span></div>
    </div>
    <div class="product-description">${product.description.replace(/\n/g, '<br>')}</div>
    <a href="${product.url}" target="_blank" rel="noopener" class="cta-btn">Visit Website →</a>
    <a href="submit.html" class="claim-link">Is this your product? Claim it or suggest edits</a>
    ${related.length ? `<div class="section"><h2 class="section-title">Related Tools</h2><div class="product-grid">${related.map(productCard).join('')}</div></div>` : ''}
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
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(ld);
  document.head.appendChild(script);
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
