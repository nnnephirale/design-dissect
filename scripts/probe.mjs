#!/usr/bin/env node
// design-dissect interaction probe: hovers representative elements and reports what
// changes, on the element, its siblings (spotlight/dim effects) and elsewhere on the page
// (previews, tooltips, cursor-followers), plus before/after crops. Static measurement
// can't see any of this, and it's often where a site's signature lives.
//
//   node probe.mjs <url> <outDir> [extra CSS selectors…]
//
// Writes <outDir>/probe.md and probe-<n>-{before,after}.png.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const [url, outDir = './design-dissect-out', ...extra] = process.argv.slice(2);
if (!url) { console.error('usage: node probe.mjs <url> <outDir> [selectors…]'); process.exit(1); }
let chromium;
for (const base of [process.cwd() + '/', here + '/']) { try { ({ chromium } = createRequire(base)('playwright')); break; } catch {} }
if (!chromium) { console.error(`playwright not found: cd "${here}" && npm i playwright`); process.exit(2); }
mkdirSync(outDir, { recursive: true });

// Candidates: a mid-list row, a card, a primary-looking button, a nav link, an inline link,
// a hero image/link. Chosen in-page so it adapts to any markup.
const PICK = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8 && getComputedStyle(e).visibility !== 'hidden'; };
  const tag = (e, why) => { e.setAttribute('data-dd-probe', why); return why; };
  const out = [];
  // repeated siblings = a list/grid; hover the 3rd so siblings on both sides exist
  const groups = new Map();
  for (const e of document.querySelectorAll('a, li, article, [role=listitem], [class*=card], [class*=row], [class*=item]')) {
    if (!vis(e) || !e.parentElement) continue;
    const k = e.parentElement; groups.set(k, (groups.get(k) || []).concat(e));
  }
  const lists = [...groups.values()].filter((g) => g.length >= 5).sort((a, b) => b.length - a.length);
  if (lists[0]) out.push(tag(lists[0][Math.min(2, lists[0].length - 1)], 'list-item'));
  if (lists[1] && lists[1][0].parentElement !== lists[0][0].parentElement) out.push(tag(lists[1][Math.min(2, lists[1].length - 1)], 'list-item-2'));
  const btn = [...document.querySelectorAll('button, [role=button], a[class*=btn], a[class*=button]')].find((e) => vis(e) && e.textContent.trim().length > 1);
  if (btn) out.push(tag(btn, 'button'));
  const nav = [...document.querySelectorAll('nav a, header a')].find(vis); if (nav) out.push(tag(nav, 'nav-link'));
  const link = [...document.querySelectorAll('p a, main a')].find((e) => vis(e) && !e.hasAttribute('data-dd-probe')); if (link) out.push(tag(link, 'inline-link'));
  const hero = [...document.querySelectorAll('main img, main picture, main video, main a:has(img)')].find(vis);
  if (hero) out.push(tag(hero.closest('a') || hero, 'media'));
  return out;
})()`;

const SNAP = `(() => {
  const props = ['opacity', 'color', 'backgroundColor', 'transform', 'scale', 'translate', 'boxShadow', 'filter', 'textDecorationLine', 'textDecorationThickness', 'borderColor', 'outlineStyle', 'clipPath'];
  const one = (e) => { const c = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, c[p]])); };
  const t = document.querySelector('[data-dd-probe-active]');
  const kids = t ? [...t.querySelectorAll('*')].slice(0, 12).map(one) : [];
  // Effects often land one level down (li > a), so read each sibling and its first child.
  const withChild = (s) => { const o = one(s); if (s.firstElementChild) for (const [k, v] of Object.entries(one(s.firstElementChild))) o['child.' + k] = v; return o; };
  const sibs = t && t.parentElement ? [...t.parentElement.children].filter((s) => s !== t).slice(0, 4).map(withChild) : [];
  const floating = [...document.querySelectorAll('body *')].filter((e) => { const c = getComputedStyle(e); return (c.position === 'fixed' || c.position === 'absolute') && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05; })
    .map((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20 ? (e.className?.baseVal ?? e.className ?? e.tagName).toString().slice(0, 90) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) : null; }).filter(Boolean);
  return { self: t ? one(t) : null, kids, sibs, floating, cursor: t ? getComputedStyle(t).cursor : null };
})()`;

const diff = (a, b) => Object.keys(a || {}).filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k]} → ${b[k]}`);

const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.addStyleTag({ content: '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i]{display:none!important}' }).catch(() => {});
await page.waitForTimeout(1000);
const picked = await page.evaluate(PICK);
extra.forEach((sel, i) => picked.push(`extra-${i}`) && page.evaluate(([s, w]) => document.querySelector(s)?.setAttribute('data-dd-probe', w), [sel, `extra-${i}`]));

const lines = [`# Interaction probe — ${url}`, ''];
let n = 0;
for (const why of picked) {
  const loc = page.locator(`[data-dd-probe="${why}"]`).first();
  if (!(await loc.count())) continue;
  n++;
  await page.mouse.move(2, 2); await page.waitForTimeout(300);
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate((w) => { document.querySelectorAll('[data-dd-probe-active]').forEach((e) => e.removeAttribute('data-dd-probe-active')); document.querySelector(`[data-dd-probe="${w}"]`)?.setAttribute('data-dd-probe-active', ''); }, why);
  const box = await loc.boundingBox();
  if (!box) continue;
  const clip = { x: Math.max(0, box.x - 120), y: Math.max(0, box.y - 160), width: Math.min(1440, box.width + 240 + 320), height: Math.min(900, box.height + 320) };
  const before = await page.evaluate(SNAP);
  await page.screenshot({ path: join(outDir, `probe-${n}-before.png`), clip }).catch(() => {});
  await loc.hover({ force: true }).catch(() => {});
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(700);
  const after = await page.evaluate(SNAP);
  await page.screenshot({ path: join(outDir, `probe-${n}-after.png`), clip }).catch(() => {});
  const label = await loc.evaluate((e) => `${e.tagName.toLowerCase()}.${(e.className?.baseVal ?? e.className ?? '').toString().split(/\s+/).slice(0, 3).join('.')} "${(e.innerText || e.alt || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`);
  lines.push(`## ${n}. ${why}: ${label}`, `cursor: ${after.cursor}`);
  const self = diff(before.self, after.self); lines.push('- self: ' + (self.join(' · ') || 'no change'));
  const kidChanges = before.kids.map((k, i) => diff(k, after.kids[i])).filter((d) => d.length).slice(0, 4);
  if (kidChanges.length) kidChanges.forEach((d, i) => lines.push(`- child ${i + 1}: ${d.join(' · ')}`));
  const sib = before.sibs.map((s, i) => diff(s, after.sibs[i])).filter((d) => d.length);
  lines.push('- siblings: ' + (sib.length ? sib[0].join(' · ') + ` (${sib.length}/${before.sibs.length} changed)` : 'no change'));
  const appeared = after.floating.filter((f) => !before.floating.includes(f));
  if (appeared.length) lines.push('- appeared: ' + appeared.slice(0, 4).join(' ; '));
  lines.push(`- crops: probe-${n}-before.png / probe-${n}-after.png`, '');
}
await browser.close();
writeFileSync(join(outDir, 'probe.md'), lines.join('\n'));
console.log(lines.join('\n'));
