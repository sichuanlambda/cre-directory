# CRE Software Directory

Source for [cresoftware.tech](https://cresoftware.tech), a directory of commercial real estate software. Static site hosted on GitHub Pages (deploys from `main`).

## How the site is built

All product and category pages are **generated** from the data files. Do not edit files under `products/` or `categories/` by hand; edit the data and rebuild.

```
data/products.json     # 208 product records (the source of truth)
data/categories.json   # 14 categories: membership, descriptions, editorial, FAQ
scripts/build.js       # static site generator (zero dependencies)
```

Rebuild after any data change:

```bash
node scripts/build.js
```

This regenerates:

- `products/<slug>/index.html` — one page per product
- `categories/<slug>/index.html` — one page per category
- `sitemap.xml` — real URLs with lastmod

Commit the regenerated output along with the data change.

## Hand-maintained pages

- `index.html` (homepage), `market-map.html`, `compare.html`, `submit.html`
- `guides/*.html` — editorial buyer's guides
- `css/style.css`, `js/app.js` (homepage/compare interactivity + shared helpers)

## Legacy URLs

The old hash-based routes (`product.html#slug`, `category.html#slug`) are redirect
shells that forward to `/products/<slug>/` and `/categories/<slug>/`. Keep them.

## Adding a product

1. Add a record to `data/products.json` (copy an existing well-filled record as a template; `slug` must be URL-safe: letters, digits, hyphens).
2. Add the slug to the right category's `products` array in `data/categories.json` (one primary category; at most two).
3. Run `node scripts/build.js` and commit.
