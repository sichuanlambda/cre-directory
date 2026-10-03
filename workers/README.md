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

## What the form sends

`submit.html` posts every submission to two places:

- this worker, which commits the listing details to `data/submissions/pending/`
  with the email redacted (the repo is public);
- Formspree, which emails the full submission, so the contact address stays in
  Gmail and off the repo.

The worker answers `{"ok": true}` on success and silently accepts (but
discards) anything that fills the hidden `_gotcha` honeypot field. The form
shows an error only when both posts fail.

## Notifications

The worker's commits show up like any other commit (email/GitHub notifications
for the repo). For a heads-up per submission, watch the repo or rely on the
processing loop that reviews `data/submissions/pending/`.
