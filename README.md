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
- `alternatives/<slug>/index.html` + `alternatives/index.html` — alternatives guides and hub (from `data/editorial.json`)
- `compare/<a>-vs-<b>/index.html` — comparison pages (from `data/editorial.json`)
- `integrations/<hub>/index.html` + `integrations/index.html` — integration hubs
- `sitemap.xml` — real URLs with lastmod
- `llms.txt` — site map for AI assistants and answer engines
- Blocks inside hand-maintained pages between marker comments (`SITE-FOOTER`, `HOME-COMPARISONS`, `HOME-ALTERNATIVES`, `POPULAR-COMPARISONS`, `GUIDE-RELATED`). Never edit between markers; the build overwrites them.

`data/lastmod.json` stores a content hash per URL. A page's sitemap `lastmod` (and the visible "Updated" date on editorial pages) only moves when the content between the nav and the footer changes, so leave that file alone and commit it with the rest of the build output.

Commit the regenerated output along with the data change.

## Hand-maintained pages

- `index.html` (homepage), `market-map.html`, `compare.html`, `submit.html`
- `guides/*.html` — editorial buyer's guides (nav, related-reading block and footer are injected by the build)
- `css/style.css`, `js/app.js` (homepage/compare interactivity + shared helpers)

## Legacy URLs

The old hash-based routes (`product.html#slug`, `category.html#slug`) are redirect
shells that forward to `/products/<slug>/` and `/categories/<slug>/`. Keep them.

## Adding a product

1. Add a record to `data/products.json` (copy an existing well-filled record as a template; `slug` must be URL-safe: letters, digits, hyphens).
2. Add the slug to the right category's `products` array in `data/categories.json` (one primary category; at most two).
3. Run `node scripts/build.js` and commit.
