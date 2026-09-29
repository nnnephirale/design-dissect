#!/usr/bin/env node
// design-dissect validation: screenshots <outDir>/validation/screen.html at desktop and mobile
// widths and writes validation/compare.html, which puts the screen beside the reference's fold
// and band close-ups. That's the evidence for "do these rules actually produce the design?".
//
//   node validate.mjs <outDir>
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] || './design-dissect-out');
const vdir = join(out, 'validation');
const screen = join(vdir, 'screen.html');
if (!existsSync(screen)) { console.error(`write ${screen} first (a representative app screen built from DESIGN.md + tokens.css)`); process.exit(1); }
let chromium;
for (const base of [process.cwd() + '/', here + '/']) { try { ({ chromium } = createRequire(base)('playwright')); break; } catch {} }
if (!chromium) { console.error(`playwright not found: cd "${here}" && npm i`); process.exit(2); }

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const errors = [];
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['mobile', 390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await page.goto('file://' + screen, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(vdir, `screen-${name}.png`), fullPage: true });
  await page.close();
}
await browser.close();

// Reference images: fold shot plus band close-ups, relative to validation/.
const refs = ['shot-desktop-fold.png', ...readdirSync(out).filter((f) => /^band-\d+\.png$/.test(f)).slice(0, 6)].filter((f) => existsSync(join(out, f)));
const html = `<!doctype html><meta charset="utf-8"><title>Validation · compare</title>
<style>body{margin:0;font:13px/1.5 ui-monospace,monospace;background:#f4f4f4;color:#333}
.g{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}
h2{font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:#777;margin:0 0 10px}
img{width:100%;display:block;border-radius:12px;box-shadow:0 0 0 1px #0001;margin-bottom:16px;background:#fff}
.m{max-width:390px}</style>
<div class="g"><div><h2>Built from DESIGN.md: desktop</h2><img src="screen-desktop.png"><h2>Mobile</h2><img class="m" src="screen-mobile.png"></div>
<div><h2>Reference</h2>${refs.map((r) => `<img src="../${r}" alt="${r}">`).join('')}</div></div>`;
writeFileSync(join(vdir, 'compare.html'), html);
console.log(`wrote validation/screen-desktop.png, screen-mobile.png, compare.html${errors.length ? '\nconsole errors:\n' + errors.join('\n') : ''}`);
