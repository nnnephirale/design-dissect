#!/usr/bin/env node
// design-dissect headless runner: measures a site at desktop + mobile widths and
// saves full-page screenshots, so you don't have to paste extract.js by hand.
//
//   node run.mjs <url> <outDir> [--dark] [--wait=ms]
//
// Writes <outDir>/measure-desktop.json, measure-mobile.json (and -dark variants
// with --dark), plus shot-*.png. Needs the `playwright` package; if it isn't
// installed, run once:  cd "<this scripts dir>" && npm i playwright && npx playwright install chromium
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const [url, outDir = './design-dissect-out', ...flags] = process.argv.slice(2);
if (!url) { console.error('usage: node run.mjs <url> <outDir> [--dark] [--wait=ms]'); process.exit(1); }
const dark = flags.includes('--dark');
const wait = +(flags.find((f) => f.startsWith('--wait='))?.split('=')[1] || 1500);

let chromium;
for (const base of [process.cwd() + '/', here + '/']) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch {}
}
if (!chromium) {
  console.error(`playwright not found. Install once:\n  cd "${here}" && npm i playwright && npx playwright install chromium`);
  process.exit(2);
}

const script = readFileSync(join(here, 'extract.js'), 'utf8');
const composeScript = readFileSync(join(here, 'compose.js'), 'utf8');

// Abstract block map: bands and panels drawn with their real fills at their real
// proportions, text as grey bars. It makes ratios, asymmetry and layering visible at a glance.
const blockmapHTML = (c) => {
  const S = 680 / +c.page.viewport.split('x')[0];
  const fillCss = (f, kind) => kind === 'gradient' || kind === 'pattern' ? f.replace(/^\w+( on #[0-9a-f]+)?: /, '') : kind === 'image' || kind === 'video' || kind === 'canvas' || kind === 'svg' ? 'repeating-linear-gradient(135deg,#9a9a9a 0 2px,#bdbdbd 2px 8px)' : f;
  const box = (p, ox, oy, depth) => {
    const kind = p.fillKind;
    const lab = kind === 'image' || kind === 'video' ? `<b>${kind}</b>` : p.ui ? '<b>UI</b>' : '';
    const text = p.text ? `<i style="left:${p.text.column.x0 * 100}%;width:${(p.text.column.x1 - p.text.column.x0) * 100}%"></i>` : '';
    const kids = (p.children || []).map((k) => box(k, p.x, p.y, depth + 1)).join('');
    return `<div class="p" style="left:${(p.x - ox) * S}px;top:${(p.y - oy) * S}px;width:${p.w * S}px;height:${p.h * S}px;background:${fillCss(p.fill, kind)};border-radius:${p.radius.includes('full') ? '999px' : (parseFloat(p.radius) || 0) * S + 'px'};${p.clips ? 'overflow:hidden;' : ''}${p.shadow ? 'box-shadow:0 2px 6px #0003;' : ''}">${lab}${text}${kids}</div>`;
  };
  const bands = c.bands.map((b) => `<div class="b" style="top:${b.y * S}px;height:${b.h * S}px;background:${fillCss(b.fill, /^(gradient|pattern)/.test(b.fill) ? 'gradient' : /^(image|video|canvas|svg)/.test(b.fill) ? 'image' : 'flat')}"><span>${b.i} · ${b.h}px · ${b.fill.slice(0, 34)}</span></div>`).join('');
  const panels = c.panels.map((p) => box(p, 0, 0, 1)).join('');
  const texts = c.bands.flatMap((b) => (b.text || []).map((t) => `<em style="left:${t.x * 680}px;top:${t.y * S}px;width:${Math.max(t.w, 0.02) * 680}px;height:${Math.max(t.size * S * 0.8, 1.5)}px;background:${t.color || '#888'}"></em>`)).join('');
  return `<!doctype html><style>body{margin:20px;font:10px ui-monospace,monospace;background:#fff}.m{position:relative;width:680px;height:${c.page.height * S}px}.b{position:absolute;left:0;width:680px}.b span{position:absolute;left:4px;top:2px;color:#fff;mix-blend-mode:difference}.p{position:absolute;outline:1px solid #0002}.p b{position:absolute;right:3px;top:2px;font-weight:600;color:#fff;mix-blend-mode:difference}.m em{position:absolute;opacity:.85;border-radius:1px}.p i{position:absolute;top:20%;height:40%;background:repeating-linear-gradient(#0000 0 3px,#0005 3px 5px);opacity:.7}</style><div class="m">${bands}${panels}${texts}</div>`;
};
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];
const schemes = dark ? ['light', 'dark'] : ['light'];

// Prefer Playwright's own browser; fall back to installed Chrome so a version
// mismatch never forces a 150MB download mid-task.
const launch = async () => {
  try { return await chromium.launch(); } catch (e1) {
    try { return await chromium.launch({ channel: 'chrome' }); } catch {
      console.error(`${e1.message.split('\n')[0]}\nNo usable browser. Run: cd "${here}" && npx playwright install chromium`);
      process.exit(3);
    }
  }
};
const browser = await launch();
try {
  for (const scheme of schemes) for (const vp of viewports) {
    const tag = vp.name + (scheme === 'dark' ? '-dark' : '');
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.isMobile,
      deviceScaleFactor: vp.isMobile ? 2 : 1, colorScheme: scheme,
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // Scroll through so lazy sections, scroll-triggered reveals and images mount.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.7) {
        scrollTo(0, y); await new Promise((r) => setTimeout(r, 200));
      }
      scrollTo(0, 0);
    });
    // Hide consent banners / chat widgets for clean screenshots (never click accept).
    await page.addStyleTag({ content: '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i],[class*=onetrust i],[id*=intercom i],[class*=intercom i],[id*=hubspot i]{display:none!important}' }).catch(() => {});
    await page.waitForTimeout(wait);
    const data = await page.evaluate(script);
    writeFileSync(join(outDir, `measure-${tag}.json`), JSON.stringify(data, null, 1));
    await page.screenshot({ path: join(outDir, `shot-${tag}-fold.png`) });
    await page.screenshot({ path: join(outDir, `shot-${tag}-full.png`), fullPage: true }).catch(() => {});
    if (tag === 'desktop') {
      // Composition: band sequence, splits, layering. Plus a close-up of every band (the
      // full-page shot is too small to read proportions and texture from) and a block map.
      const comp = await page.evaluate(composeScript);
      writeFileSync(join(outDir, 'compose-desktop.json'), JSON.stringify(comp, null, 1));
      let n = 0;
      for (const b of comp.bands) {
        if (b.h < 160 || n >= 14) continue;
        n++;
        await page.screenshot({ path: join(outDir, `band-${String(n).padStart(2, '0')}.png`), fullPage: true, clip: { x: 0, y: b.y, width: vp.width, height: Math.min(b.h, 2400) } }).catch(() => {});
        b.shot = `band-${String(n).padStart(2, '0')}.png`;
      }
      writeFileSync(join(outDir, 'compose-desktop.json'), JSON.stringify(comp, null, 1));
      const map = await browser.newPage({ viewport: { width: 720, height: 800 } });
      await map.setContent(blockmapHTML(comp));
      await map.screenshot({ path: join(outDir, 'blockmap.png'), fullPage: true });
      await map.close();
      console.log(`composition: ${comp.bands.length} bands, ${comp.panels.length} panels, ${n} band close-ups, blockmap.png`);
    }
    console.log(`${tag}: ${data.page.elements} elements, ${Object.values(data.authoredTokens).reduce((n, g) => n + Object.keys(g).length, 0)} authored tokens, sheets ${JSON.stringify(data.page.sheets)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`saved to ${outDir}`);
