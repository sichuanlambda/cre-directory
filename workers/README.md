# Submission worker

`submit-worker.js` is a Cloudflare Worker that receives the submit-a-tool form
and commits each submission to `data/submissions/pending/` in this repo.
Free tier is far more than enough (100k requests/day vs ~2 submissions/week).

## Deploy

Live at `https://cre-submit.nathaninproduct.workers.dev` (deployed 2026-10-03).
Config is in `wrangler.toml`. To redeploy after editing the worker:

```bash
cd workers
npx wrangler login      # once per machine
npx wrangler deploy
```

The worker needs a GitHub token so it can write to the repo:

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
   Repository access: only `sichuanlambda/cre-directory`.
   Permissions: **Contents: Read and write**. Nothing else.
2. `npx wrangler secret put GITHUB_TOKEN` and paste it. When the token
   expires, generate a new one and run this again.

## Where submissions go

`submit.html` posts each submission to this worker and nowhere else. The worker:

1. inserts the full record, email included, into the private Cloudflare D1
   database `cre-submissions` (table `submissions`, schema in `schema.sql`);
2. commits a copy with the email redacted to `data/submissions/pending/`
   (the repo is public). This step is best effort: if the GitHub token has
   expired the submission is still safe in the database.

The worker answers `{"ok": true}` once the database insert succeeds and
silently accepts (but discards) anything that fills the hidden `_gotcha`
honeypot field. The form shows an error if the worker does not answer ok.

## Reading the database

```bash
cd workers
npx wrangler d1 execute cre-submissions --remote --json \
  --command "SELECT * FROM submissions WHERE status = 'pending' ORDER BY submitted_at"
```

After a submission is handled, record it so the queue stays accurate:

```bash
npx wrangler d1 execute cre-submissions --remote --command \
  "UPDATE submissions SET status = 'processed', product_slug = '<slug>', processed_at = date('now') WHERE id = '<id>'"
```

Use `status = 'rejected'` with `rejected_reason` for spam, duplicates and
non-CRE tools. The row `id` matches the pending file name without `.json`.

## Notifications

The worker's commits show up like any other commit (email/GitHub notifications
for the repo). For a heads-up per submission, watch the repo or rely on the
processing loop that reviews `data/submissions/pending/`.
