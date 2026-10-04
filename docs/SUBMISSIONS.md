# Submission pipeline

The repo is the database. `data/products.json` is the canonical product record;
submissions flow into `data/submissions/` and graduate into `products.json`
through a research + review step.

## Flow

```
submit.html form
   → Cloudflare Worker (workers/submit-worker.js)
   → row in the private D1 database cre-submissions (full record, with email)
   → commits data/submissions/pending/<timestamp>-<slug>.json (email redacted)
   → research pass (agent): verify the company, draft the full product record
   → draft lands as a PR adding the record to data/products.json
     (and moving the submission file to data/submissions/processed/)
   → merge = the GitHub Action rebuilds and the page deploys
   → submitter gets their live URL + the listing badge snippet
```

## Directories

- `data/submissions/pending/` — raw submissions awaiting research. One JSON
  file each: `tool_name`, `website`, `email`, `category`, `description`,
  `pricing`, `submitter_name`, `relationship`, `notes`, `screenshot_urls`,
  `submitted_at`, `source`, `status`. `email` is always redacted.
- `data/submissions/processed/` — submissions that became listings (file gains
  `product_slug` and `processed_at`).
- `data/submissions/rejected/` — spam, duplicates, non-CRE, unverifiable
  (file gains `rejected_reason`).

## Quality bar for a drafted listing

A submission only becomes a listing when research can confirm:

1. The company exists and the website is live (fetch it — never publish
   "the site was blocked" text; that's an automatic reject-and-retry).
2. What the product actually does, in the drafter's own words, from the
   company's site plus at least one independent source.
3. Real pricing info where published; "quote-based" where not. Never invent
   numbers, ratings, review counts, or customer counts.
4. One primary category + at most two secondaries from the 14-category taxonomy.
5. It is software a CRE buyer can purchase (services/media/VC firms get
   `not_software: true` and an ecosystem label instead).

## Extra scrutiny for new companies and prototype-looking URLs

Default to skeptical when a submission shows any of these signals. One signal
means look harder; two or more means reject unless the evidence below is strong.

- Domain registered in the last 12 months, or a company founded this year.
- Hosted on a throwaway or builder subdomain (github.io, netlify.app,
  vercel.app, here.now, chatgpt.site, pazi.dev and similar) instead of its own
  domain.
- No identifiable legal entity, address or named people on the site.
- Waitlist, "request access", "opening soon" or demo-labelled content in place
  of a product someone can sign up for or buy today.
- No independent source at all (no registry record, press, review listing or
  app store entry that the vendor did not write).
- Self-reported scale (study counts, ratings, customer numbers) that the age of
  the domain makes implausible, or testimonials that cannot be traced.
- Repeat submissions, campaign-tagged URLs, or a vendor posing as a third party
  ("Just suggesting" from the vendor's own domain).

To pass anyway, a new product needs a working sign-up or checkout on its own
domain, published pricing or a clear quote path, an identifiable company, and
at least one independent source. Check the domain age (WHOIS) for every
submission and record it in the research notes. When a new product is listed,
its cons must say plainly that it is new and has a thin track record.

## Contact emails and the private database

The repo is public, so the worker redacts the submitter's email before it
commits. The full record, email included, is in the private Cloudflare D1
database `cre-submissions`; `workers/README.md` shows how to query it and how
to mark a row processed or rejected. That is where the contact address comes
from when it is time to send the submitter their live URL. No email inbox is
involved.
