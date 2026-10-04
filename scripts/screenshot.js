#!/usr/bin/env node
/**
 * Capture product screenshots with local headless Chrome (no npm dependencies, Node 22+).
 *
 *   node scripts/screenshot.js <slug> <url> [<url> ...]
 *
 * Writes img/screenshots/<slug>/<n>.webp (1440x900 viewport, saved 1280 wide) and prints the
 * JSON to paste into the product's "screenshots" array in data/products.json. Review every
 * image before committing: cookie banners, login walls and bot-check pages must not ship.
 * Requires Google Chrome and cwebp (brew install webp).
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [slug, ...urls] = process.argv.slice(2);
if (!slug || !urls.length) { console.error('usage: node scripts/screenshot.js <slug> <url> [<url> ...]'); process.exit(1); }
const WAIT_MS = Number(process.env.WAIT_MS || 6000);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Best-effort removal of consent banners and chat widgets so they do not cover the product.
const CLEANUP = `(() => {
  const sel = ['#onetrust-consent-sdk', '#onetrust-banner-sdk', '[id*="cookie" i]', '[class*="cookie" i]', '[id*="consent" i]', '[class*="consent" i]',
    '#hubspot-messages-iframe-container', '[id*="intercom" i]', '[class*="intercom" i]', '#drift-widget', '[id*="drift" i]', 'iframe[title*="chat" i]', '[aria-label*="cookie" i]'];
  let n = 0;
  for (const s of sel) for (const el of document.querySelectorAll(s)) {
    const r = el.getBoundingClientRect();
    if (el === document.body || el === document.documentElement || r.height > innerHeight * 0.9 && r.width > innerWidth * 0.9 && getComputedStyle(el).position !== 'fixed') continue;
    el.remove(); n++;
  }
  document.documentElement.style.overflow = ''; document.body.style.overflow = '';
  return n;
})()`;

(async () => {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cre-shot-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--window-size=1440,900', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  try {
    let target;
    for (let i = 0; i < 40 && !target; i++) {
      await sleep(250);
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
    }
    if (!target) throw new Error('Chrome did not start');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map();
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); } };
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const outDir = path.join(ROOT, 'img/screenshots', slug);
    fs.mkdirSync(outDir, { recursive: true });
    const out = [];
    for (const [i, url] of urls.entries()) {
      await send('Page.navigate', { url });
      await sleep(WAIT_MS);
      const status = (await send('Runtime.evaluate', { expression: "(performance.getEntriesByType('navigation')[0] || {}).responseStatus || 0", returnByValue: true })).result?.value || 0;
      const removed = (await send('Runtime.evaluate', { expression: CLEANUP, returnByValue: true })).result?.value;
      await sleep(400);
      const title = (await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result?.value;
      // Never ship (or try to get past) a bot-check or access-denied page: skip it and source the image another way.
      if (/just a moment|access denied|attention required|are you a robot|verify you are human|404|not found/i.test(title || '') || status >= 400) { console.error(`${slug} ${i + 1}: SKIPPED ${url} (blocked or missing: HTTP ${status} "${title}")`); continue; }
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const png = path.join(profile, `${i + 1}.png`), webp = path.join(outDir, `${out.length + 1}.webp`);
      fs.writeFileSync(png, Buffer.from(shot.data, 'base64'));
      execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', '1280', '0', png, '-o', webp]);
      console.error(`${slug} ${i + 1}: ${url} "${title}" (${removed} overlays removed, ${(fs.statSync(webp).size / 1024).toFixed(0)} KB)`);
      out.push({ src: `/img/screenshots/${slug}/${out.length + 1}.webp`, caption: '', source_url: url, captured: new Date().toISOString().slice(0, 10) });
    }
    ws.close();
    console.log(JSON.stringify(out, null, 2));
  } finally {
    chrome.kill();
    await sleep(500);
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
  }
})().catch(e => { console.error(e.message); process.exit(1); });
