/**
 * Cloudflare Worker: receives tool submissions from cresoftware.tech/submit.html
 * and commits each one as a JSON file to data/submissions/pending/ in the repo.
 *
 * Every submission is stored in the private D1 database "cre-submissions"
 * (full record, email included) and mirrored without the email to
 * data/submissions/pending/ in the public repo for the research pipeline.
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
        const form = await request.formData();
        data = Object.fromEntries(form.entries());
        // Checkbox groups post one entry per ticked box; keep all of them.
        data.categories = form.getAll('categories');
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

    const field = (...keys) => {
      for (const k of keys) {
        const v = data[k];
        if (Array.isArray(v) && v.length) return v.join(', ').trim().slice(0, 4000);
        if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 4000);
      }
      return '';
    };

    // Field names match submit.html; the shorter aliases are kept for JSON callers.
    const name = field('tool_name', 'name');
    const website = field('website_url', 'website', 'url');
    const email = field('email');
    if (!name || !website || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'tool name, website, and email are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    const submission = {
      tool_name: name,
      website,
      email,
      category: field('categories', 'category'),
      description: field('short_description', 'description'),
      pricing: field('pricing_info', 'pricing'),
      submitter_name: field('submitter_name', 'contact_name'),
      relationship: field('relationship'),
      notes: field('notes'),
      screenshot_urls: field('screenshot_urls'),
      submitted_at: new Date().toISOString(),
      source: 'web-form',
      status: 'pending',
    };
    const id = `${submission.submitted_at.slice(0, 19).replace(/[:T]/g, '-')}-${slugify(name)}`;

    // 1. The private database is the record of truth, email included.
    try {
      await env.DB.prepare(
        `INSERT INTO submissions (id, tool_name, website, email, category, description, pricing,
           submitter_name, relationship, notes, screenshot_urls, submitted_at, source, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, submission.tool_name, submission.website, submission.email, submission.category,
        submission.description, submission.pricing, submission.submitter_name, submission.relationship,
        submission.notes, submission.screenshot_urls, submission.submitted_at, submission.source,
        submission.status).run();
    } catch (err) {
      console.log('D1 insert failed', String(err).slice(0, 500));
      return new Response(JSON.stringify({ ok: false, error: 'Could not store submission, please email hello@cresoftware.tech' }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
    }

    // 2. A copy without the email goes to the public repo for the research pipeline.
    //    Best effort: the submission is already safe in the database if this fails.
    const path = `data/submissions/pending/${id}.json`;
    const publicCopy = { ...submission, email: '[redacted - contact info kept off the public repo]' };
    try {
      const gh = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'cre-submit-worker',
          'Accept': 'application/vnd.github+json',
        },
        body: JSON.stringify({
          message: `Submission: ${name}`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(publicCopy, null, 2) + '\n'))),
        }),
      });
      if (!gh.ok) console.log('GitHub API error', gh.status, (await gh.text()).slice(0, 500));
    } catch (err) {
      console.log('GitHub commit failed', String(err).slice(0, 500));
    }

    return new Response(JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  },
};
