#!/usr/bin/env bash
# Builds 1200x630 JPEG social cards (og:image / twitter:image) from the editorial photos and the
# first screenshot of each product. JPEG because some networks (LinkedIn) do not render WebP previews.
# Needs ImageMagick. Re-run after adding photos or screenshots, then commit img/og/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p img/og/products
for f in img/photos/*.webp; do
  k=$(basename "$f" .webp); [[ "$k" == *-800 ]] && continue
  out="img/og/$k.jpg"; [[ -s "$out" && "$out" -nt "$f" ]] && continue
  magick "$f" -resize 1200x675^ -gravity center -extent 1200x630 -strip -quality 70 -interlace Plane "$out"
done
for d in img/screenshots/*/; do
  s=$(basename "$d"); f="$d/1.webp"; [[ -f "$f" ]] || continue
  out="img/og/products/$s.jpg"; [[ -s "$out" && "$out" -nt "$f" ]] && continue
  magick "$f" -resize 1200x^ -gravity north -extent 1200x630 -strip -quality 66 -interlace Plane "$out"
done
echo "OG cards: $(ls img/og/*.jpg | wc -l) photos, $(ls img/og/products/*.jpg 2>/dev/null | wc -l) products"
