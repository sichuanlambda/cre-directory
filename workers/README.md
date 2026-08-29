# Submission worker

`submit-worker.js` is a Cloudflare Worker that receives the submit-a-tool form
and commits each submission to `data/submissions/pending/` in this repo.
Free tier is far more than enough (100k requests/day vs ~2 submissions/week).

## Deploy (~5 minutes, needs a free Cloudflare account)

```bash
npm install -g wrangler
wrangler login
cd workers
wrangler deploy submit-worker.js --name cre-submit
```

Then give it a GitHub token so it can write to the repo:

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
   Repository access: only `sichuanlambda/cre-directory`.
   Permissions: **Contents: Read and write**. Nothing else. No expiry sooner than a year.
2. `wrangler secret put GITHUB_TOKEN` and paste it.

The deploy prints a URL like `https://cre-submit.<account>.workers.dev`.

## Switch the form over

In `submit.html`, change the form action from the Formspree URL to the worker
URL. The worker accepts both normal form posts and JSON, answers
`{"ok": true}` on success, and silently accepts (but discards) anything that
fills the hidden `_gotcha` honeypot field.

## Notifications

The worker's commits show up like any other commit (email/GitHub notifications
for the repo). For a heads-up per submission, watch the repo or rely on the
processing loop that reviews `data/submissions/pending/`.
