#!/usr/bin/env node
/**
 * Pings IndexNow (Bing, Yandex, Seznam, Naver; Bing feeds ChatGPT search) with URLs that are new
 * or changed in sitemap.xml between two commits.
 *
 *   node scripts/indexnow.js            # diff sitemap.xml HEAD^1..HEAD
 *   node scripts/indexnow.js --all      # submit every sitemap URL
 *   node scripts/indexnow.js --dry-run  # print, do not send
 *
 * The key file <key>.txt lives at the site root; the key is read from the first 32-hex .txt there.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'cresoftware.tech';
const args = new Set(process.argv.slice(2));
const keyFile = fs.readdirSync(ROOT).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error('No IndexNow key file at the site root'); process.exit(1); }
const key = keyFile.replace('.txt', '');

const entries = xml => new Map([...String(xml).matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)].map(m => [m[1], m[2]]));
const now = entries(fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8'));
let urls;
if (args.has('--all')) urls = [...now.keys()];
else {
  let before = new Map();
  try { before = entries(execFileSync('git', ['show', 'HEAD^1:sitemap.xml'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })); } catch {}
  urls = [...now].filter(([u, lm]) => before.get(u) !== lm).map(([u]) => u);
}
if (!urls.length) { console.log('IndexNow: nothing new or changed'); process.exit(0); }
console.log(`IndexNow: ${urls.length} URL(s)`);
if (args.has('--dry-run')) { console.log(urls.join('\n')); process.exit(0); }

(async () => {
  for (let i = 0; i < urls.length; i += 10000) {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: urls.slice(i, i + 10000) }),
    });
    console.log(`IndexNow batch ${i / 10000 + 1}: HTTP ${res.status} ${await res.text()}`);
    if (res.status >= 400) process.exitCode = 1;
  }
})();
