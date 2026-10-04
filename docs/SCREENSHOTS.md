# Product screenshots

Product pages render a "Screenshots" gallery when the product has a `screenshots` array in
`data/products.json`. Each entry is `{ src, caption, source_url, captured }` (a bare path string
also works). The build also adds the images to the page's SoftwareApplication schema.

## Capture

    node scripts/screenshot.js <slug> <url> [<url> ...]

Uses local headless Chrome (1440x900 viewport, saved as 1280 wide WebP, about 30 to 50 KB each)
and writes `img/screenshots/<slug>/<n>.webp`. It prints the JSON to paste into the product
record; add a caption to each entry, then run `node scripts/build.js`.

## Rules

- Capture only public vendor pages. Prefer pages that show the product UI (platform, features,
  product tour) over a plain marketing hero. Two images per product is enough.
- Look at every image before committing. Reject cookie walls, login pages, popups and anything
  with personal data.
- If the vendor site shows a bot check or blocks access, the script skips it. Do not work around
  the block. Use images the vendor supplies instead (press kit, or ask on the claim/submit flow).
- Captions describe what is shown. No claims the image does not support.
- Recapture when a vendor redesigns; `captured` is shown on the page as the image date.
- A vendor can ask for removal or replacement at hello@cresoftware.tech.
