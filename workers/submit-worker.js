/**
 * Cloudflare Worker: receives tool submissions from cresoftware.tech/submit.html
 * and commits each one as a JSON file to data/submissions/pending/ in the repo.
 *
 * The repo is the database: every submission lands in git, the research
 * pipeline picks it up from there, and nothing lives in a third-party inbox.
 *
 * Deploy (one time, ~5 minutes):
 *   1. npm install -g wrangler && wrangler login
 *   2. cd workers && wrangler deploy submit-worker.js --name cre-submit
 *   3. Create a fine-grained GitHub token: repo sichuanlambda/cre-directory,
 *      permission "Contents: read and write", nothing else.
 *   4. wrangler secret put GITHUB_TOKEN   (paste the token)
 *   5. Point the form in submit.html at the worker URL (see workers/README.md).
 */

const REPO = 'sichuanlambda/cre-directory';
const ALLOWED_ORIGINS = ['https://cresoftware.tech', 'http://localhost:8763'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'unnamed';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let data;
    const ct = request.headers.get('Content-Type') || '';
    try {
      if (ct.includes('application/json')) {
        data = await request.json();
      } else {
        data = Object.fromEntries((await request.formData()).entries());
      }
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Bad request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    // Honeypot: real users never fill this hidden field.
    if (data._gotcha) {
      return new Response(JSON.stringify({ ok: true }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    const name = (data.tool_name || data.name || '').trim();
    const website = (data.website || data.url || '').trim();
    const email = (data.email || '').trim();
    if (!name || !website || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'tool name, website, and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    const submission = {
      tool_name: name,
      website,
      email,
      category: (data.category || '').trim(),
      description: (data.description || '').trim(),
      pricing: (data.pricing || '').trim(),
      submitter_name: (data.submitter_name || data.contact_name || '').trim(),
      relationship: (data.relationship || '').trim(),
      submitted_at: new Date().toISOString(),
      source: 'web-form',
      status: 'pending',
    };

    const ts = submission.submitted_at.slice(0, 19).replace(/[:T]/g, '-');
    const path = `data/submissions/pending/${ts}-${slugify(name)}.json`;
    const body = {
      message: `Submission: ${name}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify(submission, null, 2) + '\n'))),
    };

    const gh = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'cre-submit-worker',
        'Accept': 'application/vnd.github+json',
      },
      body: JSON.stringify(body),
    });

    if (!gh.ok) {
      const detail = await gh.text();
      console.log('GitHub API error', gh.status, detail.slice(0, 500));
      return new Response(JSON.stringify({ ok: false, error: 'Could not store submission, please email hello@cresoftware.tech' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    return new Response(JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  },
};
