# Monetization

Goal: steady, low-effort MRR growth (+$50-200/mo added per month) without
compromising the directory's honesty. Two revenue lines, in order of effort:

## 1. Featured listings ($49/mo or $470/yr) — sell to inbound vendors

The product: clearly labeled paid placement. Sold on [/advertise.html](../advertise.html).

- Pinned card at the top of the vendor's category page (labeled "Featured · Paid placement")
- First position in the homepage Featured Tools section
- Featured badge, priority updates
- Cap: 3 Featured slots per category
- Hard rule, stated publicly: paying never changes listing content, pros/cons,
  guide inclusion, or comparison verdicts. Placement only.

### Fulfillment (when someone buys)

1. Set `"featured_partner": true` on their record in `data/products.json`
   (add `"featured_until": "YYYY-MM-DD"` matching their billing period).
2. `node scripts/build.js`, commit, push. Their category page and the homepage
   pick it up automatically.
3. On cancellation/lapse: remove the flag, rebuild.

### Billing

Stripe Payment Links (no backend needed): create two links in the Stripe
dashboard (Products → Payment Links), one $49/mo recurring, one $470/yr
recurring, then replace the `STRIPE_LINK` mailto placeholder in
`advertise.html`. Until then the CTA is email.

### Pipeline

- Every accepted submission gets the "listing live" email (docs/OUTREACH.md)
  which includes the Featured option. ~2 submissions/week inbound.
- Warm list: past submitters whose listings are live (contact emails are kept
  OFF this public repo; they exist in Formspree/Gmail).
- Conversion math: 1 Featured sale/mo = +$49 MRR/mo, right in the target band.

## 2. Affiliate/partner links — passive, grows with traffic

Many SMB-priced listed tools run affiliate programs (see docs/AFFILIATES.md
for the researched list). Once signed up:

1. Add `"affiliate_url": "https://..."` to the product's record in
   `data/products.json`. Keep `url` as the canonical site.
2. Rebuild. All outbound CTAs on that product's page switch to the affiliate
   link with `rel="sponsored"`, and a disclosure line appears on the page.
3. Never let affiliate status affect descriptions, categories, guides, or
   comparison verdicts. The disclosure line says so; make it stay true.

## Principles (why this doesn't break the site)

- Paid placement is always labeled. Editorial content is never for sale.
- Affiliate links are disclosed per-page and use rel="sponsored" (also the
  correct SEO signal).
- The trust section copy on the homepage was deliberately rewritten to remain
  true under this model: it promises independence and clear labeling, not
  "no money changes hands."

## Later (once traffic is real)

- Category sponsorship / market-map sponsorship (single sponsor, higher price)
- Newsletter with sponsor slot
- Lead-gen ("get pricing" forms) — needs backend, revisit after worker exists
