#!/usr/bin/env node
/**
 * Sanity check for the starter stacks (data/stacks.json and the pages build.js makes from it).
 * Recomputes every lean and fuller total independently of build.js and compares them with the
 * generated role pages and the hub table, then checks the data itself: product slugs exist and are
 * published, every cost has a basis, checked dates are real dates, and no em or en dashes.
 *
 *   node scripts/build.js && node scripts/check-stacks.js
 *
 * Exits non-zero on any problem.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const STACKS = JSON.parse(read('data/stacks.json'));
const PRODUCTS = new Map(JSON.parse(read('data/products.json')).map(p => [p.slug, p]));
const problems = [];
const fail = msg => problems.push(msg);

// Plain-integer cents avoid floating point drift when adding prices like 16.67 + 1684.5.
const toCents = n => Math.round(n * 100);
const cost = it => (it.cost && typeof it.cost.monthly_usd === 'number') ? it.cost.monthly_usd : null;

function recompute(role) {
  const start = role.tiers.start || [];
  const add = role.tiers.add || [];
  let lean = 0, full = 0, leanFrom = false, fullFrom = false;
  for (const it of start) if (cost(it) !== null) { lean += toCents(cost(it)); leanFrom = leanFrom || !!it.cost.from; }
  const replaced = add.map(it => it.replaces).filter(Boolean);
  for (const slug of replaced) if (!start.some(s => s.slug === slug)) fail(`${role.slug}: add item replaces "${slug}", which is not in the start tier`);
  for (const it of start) if (!replaced.includes(it.slug) && cost(it) !== null) { full += toCents(cost(it)); fullFrom = fullFrom || !!it.cost.from; }
  for (const it of add) if (cost(it) !== null) { full += toCents(cost(it)); fullFrom = fullFrom || !!it.cost.from; }
  return { lean: lean / 100, full: full / 100, leanFrom, fullFrom };
}

const DASHES = /[–—]/;
const raw = read('data/stacks.json');
if (DASHES.test(raw)) fail('data/stacks.json contains an em or en dash');

const hubHtml = fs.existsSync(path.join(ROOT, 'starter-stacks/index.html')) ? read('starter-stacks/index.html') : '';
if (!hubHtml) fail('starter-stacks/index.html missing (run node scripts/build.js first)');

const report = [];
for (const role of STACKS.roles) {
  const tiers = role.tiers || {};
  for (const t of ['start', 'add', 'skip']) for (const it of tiers[t] || []) {
    const p = PRODUCTS.get(it.slug);
    if (!p) fail(`${role.slug}/${t}: unknown product slug ${it.slug}`);
    else if (p.status === 'unverifiable') fail(`${role.slug}/${t}: ${it.slug} is unpublished (unverifiable)`);
    for (const a of it.alternatives || []) {
      const s = typeof a === 'string' ? a : a.slug;
      if (!PRODUCTS.get(s) || PRODUCTS.get(s).status === 'unverifiable') fail(`${role.slug}/${t}/${it.slug}: alternative ${s} missing or unpublished`);
    }
    const c = it.cost || {};
    if (!('monthly_usd' in c)) fail(`${role.slug}/${t}/${it.slug}: cost.monthly_usd missing (use null for no published price)`);
    if (c.monthly_usd !== null && c.monthly_usd !== undefined && (typeof c.monthly_usd !== 'number' || c.monthly_usd < 0)) fail(`${role.slug}/${t}/${it.slug}: bad monthly_usd`);
    if (!c.basis) fail(`${role.slug}/${t}/${it.slug}: cost.basis missing`);
    if (c.checked !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(c.checked))) fail(`${role.slug}/${t}/${it.slug}: checked must be YYYY-MM-DD or null`);
    if (c.checked && !/^https?:\/\//.test(c.source || '')) fail(`${role.slug}/${t}/${it.slug}: a checked price needs the vendor URL in cost.source`);
    if (typeof c.monthly_usd === 'number' && c.monthly_usd > 0 && !c.checked && c.source !== 'listing') fail(`${role.slug}/${t}/${it.slug}: unverified price must say source "listing"`);
    if (t === 'add' && !it.trigger) fail(`${role.slug}/add/${it.slug}: trigger missing`);
    if (t === 'skip' && !it.reason) fail(`${role.slug}/skip/${it.slug}: reason missing`);
  }

  const want = recompute(role);
  const file = `starter-stacks/${role.slug}/index.html`;
  if (!fs.existsSync(path.join(ROOT, file))) { fail(`${file} missing`); continue; }
  const html = read(file);
  const attr = kind => { const m = new RegExp(`data-total="${kind}" data-usd="([0-9.]+)"`).exec(html); return m ? Number(m[1]) : NaN; };
  if (attr('lean') !== want.lean) fail(`${role.slug}: page lean ${attr('lean')} != recomputed ${want.lean}`);
  if (attr('full') !== want.full) fail(`${role.slug}: page fuller ${attr('full')} != recomputed ${want.full}`);
  const row = new RegExp(`data-role="${role.slug}" data-lean="([0-9.]+)" data-full="([0-9.]+)"`).exec(hubHtml);
  if (!row) fail(`${role.slug}: no row in the hub table`);
  else if (Number(row[1]) !== want.lean || Number(row[2]) !== want.full) fail(`${role.slug}: hub row ${row[1]}/${row[2]} != recomputed ${want.lean}/${want.full}`);
  const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<footer[\s\S]*$/, '').replace(/<[^>]+>/g, ' ');
  if (DASHES.test(visible)) fail(`${file}: visible text contains an em or en dash`);
  if (/\{\{(lean|full)/.test(html)) fail(`${file}: unreplaced total token`);
  const fmt = (n, from) => `${from ? 'from ' : ''}$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
  report.push(`${role.slug.padEnd(30)} lean ${fmt(want.lean, want.leanFrom).padStart(14)}/mo   fuller ${fmt(want.full, want.fullFrom).padStart(14)}/mo`);
}
if (hubHtml && /\{\{(lean|full)/.test(hubHtml)) fail('starter-stacks/index.html: unreplaced total token');

console.log(report.join('\n'));
if (problems.length) { console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log(`\nOK: ${STACKS.roles.length} roles, totals match the generated pages and the hub table.`);
