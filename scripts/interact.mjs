#!/usr/bin/env node
// design-dissect interaction capture: the micro-interaction layer.
// For each interactive element it triggers hover, press, click (and focus/type for inputs) and
//   · samples computed style + geometry of the element, its children, its siblings and any
//     newly added node on EVERY animation frame for ~1s (catches JS-driven springs too),
//   · collects every Web Animation the browser runs (CSS transitions/animations and WAAPI,
//     which Framer Motion uses; springs often arrive as exact `linear(...)` easings),
//   · records DOM/attribute changes (data-state, aria-pressed, class …),
//   · fits each motion to known easings, or estimates a spring (overshoot, settle time),
//   · saves a frame strip per interaction.
// It also scans the JS bundles for motion libraries and their spring settings.
//
//   node interact.mjs <url> <outDir> [--max=14] [--sel="css, css"]
// Writes <outDir>/interactions.json, interactions.md, interactions/strip-NN.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const [url, outDir = './design-dissect-out', ...flags] = process.argv.slice(2);
if (!url) { console.error('usage: node interact.mjs <url> <outDir> [--max=14] [--sel="css"]'); process.exit(1); }
const MAX = +(flags.find((f) => f.startsWith('--max='))?.split('=')[1] || 14);
const EXTRA = flags.find((f) => f.startsWith('--sel='))?.slice(6) || '';
let chromium;
for (const base of [process.cwd() + '/', here + '/']) { try { ({ chromium } = createRequire(base)('playwright')); break; } catch {} }
if (!chromium) { console.error(`playwright not found: cd "${here}" && npm i`); process.exit(2); }
const sdir = join(outDir, 'interactions'); mkdirSync(sdir, { recursive: true });

// ---------------- in-page instrumentation ----------------
const INIT = () => {
  // Log every WAAPI call with its keyframes/options (Framer Motion, Motion One, custom code).
  const orig = Element.prototype.animate;
  window.__ddWaapi = [];
  Element.prototype.animate = function (kf, opts) {
    try { window.__ddWaapi.push({ t: performance.now(), el: this, kf: JSON.parse(JSON.stringify(kf)), opts: typeof opts === 'number' ? { duration: opts } : JSON.parse(JSON.stringify(opts || {})) }); } catch {}
    return orig.call(this, kf, opts);
  };
};
const PAGE = () => {
  const label = (el) => {
    if (!el || el.nodeType !== 1) return '?';
    let s = el.tagName.toLowerCase();
    const al = el.getAttribute('aria-label'); if (al) s += `[aria-label="${al.slice(0, 30)}"]`;
    const cls = (el.className?.baseVal ?? el.className ?? '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    if (cls) s += '.' + cls.slice(0, 60);
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    return t && !al ? `${s} "${t}"` : s;
  };
  const vis = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 6 && r.height > 6 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.02; };
  const NOISE = '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i],[id*=intercom i]';
  const DANGER = /delete|remove|buy|pay|checkout|subscribe|sign ?out|log ?out|unsubscribe|purchase/i;
  window.__ddLabel = label;
  // Candidates: controls first (toggles, tabs, switches), then buttons, inputs, rows/cards, links.
  window.__ddPick = (max, extra) => {
    const seen = new Set(), out = [];
    const sig = (e) => e.tagName + '|' + (e.getAttribute('role') || '') + '|' + (e.className?.baseVal ?? e.className ?? '').toString().replace(/\b(on|active|selected|is-\w+|data-\w+)\b/g, '').trim();
    const add = (e, kind) => {
      if (!e || !vis(e) || e.closest(NOISE) || e.hasAttribute('data-dd')) return;
      if (kind === 'extra') { e.setAttribute('data-dd', out.length); out.push({ i: out.length, kind: e.matches('button,[role=button],[role=tab],[aria-pressed],summary') ? 'toggle' : e.matches('input,textarea') ? 'input' : 'extra', label: label(e), href: e.getAttribute('href') || null }); return; }
      if (e.closest('[data-dd]')) return;
      if (DANGER.test(e.innerText || '') || DANGER.test(e.getAttribute('aria-label') || '') || e.type === 'submit') return;
      const k = sig(e); if (seen.has(k)) return; seen.add(k);
      e.setAttribute('data-dd', out.length); out.push({ i: out.length, kind, label: label(e), href: e.getAttribute('href') || null });
    };
    if (extra) document.querySelectorAll(extra).forEach((e) => add(e, 'extra'));
    document.querySelectorAll('[role=switch],[role=tab],[aria-pressed],[role=radio],[role=checkbox],[aria-selected]').forEach((e) => add(e, 'toggle'));
    document.querySelectorAll('button,[role=button],summary').forEach((e) => add(e, 'button'));
    document.querySelectorAll('input:not([type=hidden]):not([type=submit]),textarea,[contenteditable=true]').forEach((e) => add(e, 'input'));
    // repeated siblings = list rows / cards (hover-only)
    const groups = new Map();
    for (const e of document.querySelectorAll('a,li,article,[class*=card],[class*=row],[class*=item]')) { if (!e.parentElement || !vis(e)) continue; const g = groups.get(e.parentElement) || []; g.push(e); groups.set(e.parentElement, g); }
    [...groups.values()].filter((g) => g.length >= 4).sort((a, b) => b.length - a.length).slice(0, 2).forEach((g) => add(g[Math.min(2, g.length - 1)], 'row'));
    document.querySelectorAll('a[href]').forEach((e) => { if (getComputedStyle(e).cursor === 'pointer') add(e, 'link'); });
    return out.slice(0, max);
  };
  // Watch set: element + descendants, siblings (+ first child), and nodes added during the action.
  window.__ddSample = (i, ms) => new Promise((res) => {
    const el = document.querySelector(`[data-dd="${i}"]`);
    const watch = new Set([el, ...[...el.querySelectorAll('*')].slice(0, 24)]);
    if (el.parentElement) for (const s of [...el.parentElement.children].filter((x) => x !== el).slice(0, 6)) { watch.add(s); s.firstElementChild && watch.add(s.firstElementChild); }
    let nid = 0; const ids = new Map(); const idOf = (e) => { if (!ids.has(e)) ids.set(e, nid++); return ids.get(e); };
    const meta = {}; const muts = [];
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.closest?.(NOISE)) { watch.add(n); n.querySelectorAll && [...n.querySelectorAll('*')].slice(0, 6).forEach((c) => watch.add(c)); muts.push({ t: Math.round(performance.now() - t0), type: 'added', el: label(n) }); } });
        if (m.type === 'childList') m.removedNodes.forEach((n) => { if (n.nodeType === 1) muts.push({ t: Math.round(performance.now() - t0), type: 'removed', el: label(n) }); });
        if (m.type === 'attributes' && m.attributeName !== 'style' && !m.attributeName.startsWith('data-dd')) muts.push({ t: Math.round(performance.now() - t0), type: 'attr', el: label(m.target), attr: m.attributeName, from: m.oldValue, to: m.target.getAttribute(m.attributeName) });
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
    const anims = new Map(); const w0 = window.__ddWaapi.length;
    const P = ['transform', 'opacity', 'color', 'backgroundColor', 'boxShadow', 'filter', 'clipPath', 'scale', 'translate', 'rotate', 'borderColor', 'outlineColor', 'textDecorationColor'];
    const frames = []; const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0;
      const row = {};
      for (const e of watch) {
        if (!e.isConnected) continue;
        const c = getComputedStyle(e), r = e.getBoundingClientRect(), id = idOf(e);
        if (!meta[id]) meta[id] = label(e);
        row[id] = [...P.map((p) => c[p]), Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10];
      }
      frames.push({ t: Math.round(t), row });
      for (const a of document.getAnimations()) if (!anims.has(a)) {
        const tm = a.effect?.getTiming?.() || {}; let kf = []; try { kf = a.effect.getKeyframes().map((k) => { const o = {}; for (const [kk, v] of Object.entries(k)) if (!['composite', 'computedOffset'].includes(kk)) o[kk] = v; return o; }); } catch {}
        anims.set(a, { t: Math.round(t), kind: a.constructor.name, name: a.transitionProperty || a.animationName || a.id || '', target: label(a.effect?.target), duration: tm.duration, delay: tm.delay, easing: tm.easing, iterations: tm.iterations, keyframes: kf.slice(0, 4) });
      }
      if (t < ms) requestAnimationFrame(tick);
      else {
        mo.disconnect();
        const waapi = window.__ddWaapi.slice(w0).map((w) => ({ t: Math.round(w.t - t0), target: label(w.el), kf: w.kf, opts: w.opts }));
        res({ props: [...P, 'x', 'y', 'w', 'h'], meta, frames, anims: [...anims.values()], waapi, muts: muts.slice(0, 40) });
      }
    };
    requestAnimationFrame(tick);
  });
};

// ---------------- analysis ----------------
const EASE = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1], 'expo-out (0.16,1,0.3,1)': [0.16, 1, 0.3, 1], 'quint-out (0.22,1,0.36,1)': [0.22, 1, 0.36, 1], 'tailwind (0.4,0,0.2,1)': [0.4, 0, 0.2, 1], 'out (0,0,0.2,1)': [0, 0, 0.2, 1], 'cubic-in-out (0.65,0,0.35,1)': [0.65, 0, 0.35, 1] };
const bez = ([x1, y1, x2, y2], x) => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3; if (cx < x) lo = t; else hi = t; } return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3; };
const nums = (v) => (String(v).match(/-?\d*\.?\d+(e-?\d+)?/g) || []).map(Number);
const channels = (prop, v) => {
  if (prop === 'transform') { const n = nums(v); if (!/matrix/.test(v)) return { tx: 0, ty: 0, s: 1, rot: 0 }; const [a, b, , , e, f] = /matrix3d/.test(v) ? [n[1], n[2], 0, 0, n[13], n[14]] : n; return { tx: e, ty: f, s: Math.hypot(a, b), rot: Math.atan2(b, a) * 57.2958 }; }
  if (/color|Color/.test(prop)) return {}; // colours are handled whole in analyse()
  if (['opacity', 'x', 'y', 'w', 'h'].includes(prop)) return { v: +v };
  if (prop === 'scale' || prop === 'translate' || prop === 'rotate') { const n = nums(v); return v === 'none' ? {} : Object.fromEntries(n.map((x, i) => ['c' + i, x])); }
  return {}; // boxShadow / filter / clipPath: reported as raw from→to
};
const analyse = (s) => {
  const out = [];
  const ids = Object.keys(s.meta);
  for (const id of ids) {
    const series = s.frames.filter((f) => f.row[id]).map((f) => ({ t: f.t, v: f.row[id] }));
    if (series.length < 3) continue;
    s.props.forEach((prop, pi) => {
      const raw = series.map((x) => x.v[pi]);
      if (raw.every((x) => x === raw[0])) return;
      if (['x', 'y'].includes(prop) && series.every((x) => Math.abs(x.v[pi] - raw[0]) < 0.6)) return;
      // Colours: one line per property (hex → hex), timed on RGB distance; currentColor mirrors skipped.
      if (/color|Color/.test(prop)) {
        const ci = s.props.indexOf('color');
        if (prop !== 'color' && raw.every((x, i) => x === series[i].v[ci])) return;
        const rgb = (x) => { const n = nums(x); return n.length >= 3 ? n : [0, 0, 0, 0]; };
        const hex = (x) => { const [r, g, b, a = 1] = rgb(x); return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('') + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : ''); };
        const c0 = rgb(raw[0]), c1 = rgb(raw.at(-1)); const tot = Math.hypot(...c0.map((c, i) => c - c1[i])) || 1;
        const prog = raw.map((x) => { const c = rgb(x); return 1 - Math.hypot(...c.map((v, i) => v - c1[i])) / tot; });
        const ts = series.map((x) => x.t);
        const iS = prog.findIndex((p) => p > 0.02); let iE = prog.length - 1; while (iE > 0 && prog[iE] >= 0.98) iE--;
        const start = ts[Math.max(0, iS - 1)], end = ts[Math.min(prog.length - 1, iE + 1)];
        const pts = []; for (let i = Math.max(0, iS - 1); i <= Math.min(prog.length - 1, iE + 1); i++) pts.push([(ts[i] - start) / Math.max(1, end - start), prog[i]]);
        let best = null; for (const [name, c] of Object.entries(EASE)) { const e = Math.sqrt(pts.reduce((a, [x, y]) => a + (bez(c, x) - y) ** 2, 0) / Math.max(1, pts.length)); if (!best || e < best.e) best = { name, e }; }
        out.push({ el: s.meta[id], prop, from: hex(raw[0]), to: hex(raw.at(-1)), start, duration: end - start, easing: best?.name, fit: best ? +best.e.toFixed(3) : null });
        return;
      }
      const chs = channels(prop, raw[0]);
      const keys = Object.keys(chs);
      if (!keys.length) { out.push({ el: s.meta[id], prop, from: String(raw[0]).slice(0, 90), to: String(raw.at(-1)).slice(0, 90), start: series.find((x) => x.v[pi] !== raw[0])?.t, raw: true }); return; }
      for (const k of keys) {
        const vals = series.map((x) => channels(prop, x.v[pi])[k] ?? 0);
        const v0 = vals[0], v1 = vals.at(-1), mn = Math.min(...vals), mx = Math.max(...vals);
        const span = Math.abs(v1 - v0), excursion = Math.max(Math.abs(mx - v0), Math.abs(mn - v0));
        if (excursion < 0.5 && !(prop === 'opacity' || k === 's') ) continue;
        if (excursion < 0.01) continue;
        const ts = series.map((x) => x.t);
        const tol = Math.max(excursion * 0.02, 1e-3);
        const iS = vals.findIndex((v) => Math.abs(v - v0) > tol);
        let iE = vals.length - 1; while (iE > 0 && Math.abs(vals[iE] - v1) <= tol) iE--;
        const start = ts[Math.max(0, iS - 1)], end = ts[Math.min(vals.length - 1, iE + 1)];
        const m = { el: s.meta[id], prop: prop + (k === 'v' ? '' : '.' + k), from: +v0.toFixed(3), to: +v1.toFixed(3), start, duration: end - start };
        if (span < excursion * 0.2) { m.pulse = { peak: +(Math.abs(mx - v0) > Math.abs(mn - v0) ? mx : mn).toFixed(3) }; out.push(m); continue; }
        // progress curve over the moving window
        const pts = []; for (let i = Math.max(0, iS - 1); i <= Math.min(vals.length - 1, iE + 1); i++) pts.push([(ts[i] - start) / Math.max(1, end - start), (vals[i] - v0) / (v1 - v0)]);
        const over = Math.max(...pts.map((p) => p[1])) - 1;
        if (over > 0.03) {
          // underdamped spring: overshoot → damping ratio ζ = -ln(os)/sqrt(π²+ln²(os))
          const L = Math.log(over); m.spring = { overshoot: +(over * 100).toFixed(1) + '%', dampingRatio: +(-L / Math.sqrt(Math.PI ** 2 + L * L)).toFixed(2), settleMs: m.duration };
        } else {
          let best = null;
          for (const [name, c] of Object.entries(EASE)) { const e = Math.sqrt(pts.reduce((a, [x, y]) => a + (bez(c, x) - y) ** 2, 0) / pts.length); if (!best || e < best.e) best = { name, e }; }
          m.easing = best.name; m.fit = +best.e.toFixed(3);
        }
        out.push(m);
      }
    });
  }
  // Collapse identical motions on different elements (children following their parent) into one line.
  const groups = new Map();
  for (const m of out) { const k = [m.prop, m.from, m.to, m.start, m.duration].join('|'); const g = groups.get(k); if (g) g.also = (g.also || 0) + 1; else groups.set(k, m); }
  return [...groups.values()].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
};

// ---------------- run ----------------
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await ctx.addInitScript(INIT);
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.addStyleTag({ content: '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i]{display:none!important}' }).catch(() => {});
await page.evaluate(PAGE);
await page.waitForTimeout(1200);

// Library + spring-setting scan of the JS bundles.
const libs = await page.evaluate(async () => {
  const srcs = [...document.scripts].map((s) => s.src).filter(Boolean).slice(0, 40);
  const inline = [...document.scripts].filter((s) => !s.src).map((s) => s.textContent).join('\n').slice(0, 2e6);
  let code = inline;
  for (const s of srcs) { try { code += '\n' + (await (await fetch(s)).text()); } catch {} }
  const has = (re) => (code.match(re) || []).length;
  const found = {
    'framer-motion / motion': has(/framer-motion|motion\/react|layoutId|useSpring|AnimatePresence|whileTap|whileHover/g),
    gsap: has(/gsap\.|GreenSock|ScrollTrigger/g), 'react-spring': has(/react-spring|useSpringValue/g), lenis: has(/lenis/gi),
    'motion one / animate()': has(/animate\(\s*[\w.$]+,\s*\{/g), vaul: has(/vaul-drawer|data-vaul/g), sonner: has(/data-sonner|sonner-toast/g),
    cmdk: has(/cmdk-/g), radix: has(/data-radix|@radix-ui/g), 'auto-animate': has(/auto-animate|autoAnimate/g), three: has(/THREE\.|WebGLRenderer/g),
    'view transitions': has(/startViewTransition|view-transition-name/g),
  };
  const springs = {};
  for (const m of code.matchAll(/(?:stiffness|tension)\s*:\s*([\d.]+)[^{}]{0,80}?(?:damping|friction)\s*:\s*([\d.]+)(?:[^{}]{0,40}?mass\s*:\s*([\d.]+))?/g)) { const k = `stiffness ${m[1]} · damping ${m[2]}${m[3] ? ' · mass ' + m[3] : ''}`; springs[k] = (springs[k] || 0) + 1; }
  for (const m of code.matchAll(/type\s*:\s*["']spring["'][^{}]{0,60}?(?:bounce|visualDuration|duration)\s*:\s*([\d.]+)(?:[^{}]{0,40}?(?:bounce|visualDuration|duration)\s*:\s*([\d.]+))?/g)) { const k = `spring {${m[0].replace(/\s+/g, ' ').slice(0, 70)}}`; springs[k] = (springs[k] || 0) + 1; }
  const eases = {}; for (const m of code.matchAll(/cubic-bezier\(([^)]{5,40})\)|ease\s*:\s*\[([\d.,\s-]{7,40})\]/g)) { const k = (m[1] || m[2]).replace(/\s+/g, ''); eases[k] = (eases[k] || 0) + 1; }
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
  return { libraries: Object.entries(found).filter(([, v]) => v > 0), springs: top(springs, 10), easings: top(eases, 10), bundles: srcs.length };
});

const picked = await page.evaluate(([m, e]) => window.__ddPick(m, e), [MAX, EXTRA]);
const results = [];
let strip = 0;
const snapStrip = async (i, name, act) => {
  const box = await page.locator(`[data-dd="${i}"]`).boundingBox({ timeout: 2000 }).catch(() => null); if (!box) { await act(); return null; }
  const clip = { x: Math.max(0, box.x - 60), y: Math.max(0, box.y - 60), width: Math.min(1440 - Math.max(0, box.x - 60), box.width + 120), height: Math.min(900, box.height + 120) };
  const shots = []; const t0 = Date.now();
  const run = act();
  for (const at of [0, 60, 120, 200, 320, 480, 700, 1000]) { const wait = at - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait); try { shots.push({ t: Date.now() - t0, b64: (await page.screenshot({ clip })).toString('base64') }); } catch {} }
  await run;
  const f = `strip-${String(++strip).padStart(2, '0')}.png`;
  const sp = await ctx.newPage();
  await sp.setContent(`<body style="margin:0;background:#fff;font:10px ui-monospace,monospace;display:inline-flex;gap:6px;padding:6px">${shots.map((s) => `<figure style="margin:0"><img src="data:image/png;base64,${s.b64}" style="display:block;max-width:220px;border:1px solid #eee"><figcaption>${s.t}ms</figcaption></figure>`).join('')}</body>`);
  await sp.locator('body').screenshot({ path: join(sdir, f) }); await sp.close();
  return `interactions/${f}`;
};
const reset = async () => { await page.mouse.move(2, 2); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(500); };

for (const c of picked) {
  const loc = page.locator(`[data-dd="${c.i}"]`);
  if (!(await loc.count())) continue;
  await loc.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); await reset();
  const box = await loc.boundingBox({ timeout: 2000 }).catch(() => null); if (!box) continue;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const acts = [['hover', async () => { await page.mouse.move(cx, cy, { steps: 3 }); }]];
  if (c.kind !== 'row' && c.kind !== 'link' && c.kind !== 'input') acts.push(['press', async () => { await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up(); }]);
  if (c.kind === 'toggle' || c.kind === 'button') acts.push(['click', async () => { await page.mouse.click(cx, cy); }]);
  if (c.kind === 'input') acts.push(['focus+type', async () => { await page.mouse.click(cx, cy); await page.keyboard.type('abc', { delay: 60 }); }]);
  for (const [name, act] of acts) {
    const urlBefore = page.url();
    if (!(await loc.count())) break;
    const sampling = page.evaluate(([i]) => window.__ddSample(i, 1100), [c.i]);
    const shot = await snapStrip(c.i, name, act);
    const s = await sampling.catch(() => null);
    if (page.url() !== urlBefore) { await page.goBack().catch(() => {}); await page.evaluate(PAGE); await page.evaluate(([m, e]) => window.__ddPick(m, e), [MAX, EXTRA]); }
    if (!s) continue;
    const motions = analyse(s);
    if (!motions.length && !s.anims.length && !s.waapi.length && !s.muts.length) continue;
    results.push({ element: c.label, kind: c.kind, action: name, strip: shot, motions: motions.slice(0, 16), animations: s.anims.slice(0, 10), waapi: s.waapi.slice(0, 8), mutations: s.muts.slice(0, 12) });
  }
  // Toggles: click again so the page returns to its original state (and capture the reverse).
  if (c.kind === 'toggle' || c.kind === 'button') { await page.mouse.click(cx, cy).catch(() => {}); await page.waitForTimeout(600); }
}
await browser.close();

// ---------------- report ----------------
writeFileSync(join(outDir, 'interactions.json'), JSON.stringify({ url, libs, results }, null, 1));
const L = [`# Interactions — ${url}`, '', `Bundles scanned: ${libs.bundles} · libraries: ${libs.libraries.map(([k, v]) => `${k} (${v})`).join(', ') || 'none detected'}`];
if (libs.springs.length) L.push('Spring settings in code: ' + libs.springs.map(([k, v]) => `${k} ×${v}`).join(' ; '));
if (libs.easings.length) L.push('Easings in code: ' + libs.easings.map(([k, v]) => `${k} ×${v}`).join(' ; '));
for (const r of results) {
  L.push('', `## ${r.action} → ${r.element} (${r.kind})${r.strip ? ` · ${r.strip}` : ''}`);
  r.mutations.filter((m) => m.type === 'attr' && m.attr !== 'class' && m.from !== m.to).slice(0, 5).forEach((m) => L.push(`- state @${m.t}ms: ${m.el} ${m.attr}: ${m.from ?? '∅'} → ${m.to ?? '∅'}`));
  r.mutations.filter((m) => m.type !== 'attr').slice(0, 4).forEach((m) => L.push(`- dom @${m.t}ms: ${m.type} ${m.el}`));
  for (const m of r.motions) {
    const how = m.raw ? `${m.from} → ${m.to}` : m.pulse ? `${m.from} → ${m.pulse.peak} → back (pulse)` : `${m.from} → ${m.to}`;
    const curve = m.spring ? `spring: overshoot ${m.spring.overshoot}, ζ≈${m.spring.dampingRatio}, settles ${m.spring.settleMs}ms` : m.easing ? `${m.easing} (fit ${m.fit})` : '';
    L.push(`- ${m.el}${m.also ? ` (+${m.also} more)` : ''} · ${m.prop}: ${how}${m.duration != null ? ` · ${m.duration}ms` : ''}${m.start ? ` after ${m.start}ms` : ''}${curve ? ' · ' + curve : ''}`);
  }
  const ag = new Map(); for (const a of r.animations) { const k = `${a.kind} ${a.name} ${a.duration}ms ${a.delay ? 'delay ' + a.delay + ' ' : ''}· ${String(a.easing).slice(0, 120)}`; ag.set(k, [...(ag.get(k) || []), a.target]); }
  for (const [k, ts] of ag) L.push(`- declared ${k} → ${ts[0]}${ts.length > 1 ? ` (+${ts.length - 1})` : ''}`);
  r.waapi.forEach((w) => L.push(`- waapi on ${w.target}: ${JSON.stringify(w.kf).slice(0, 120)} · ${JSON.stringify(w.opts).slice(0, 120)}`));
}
writeFileSync(join(outDir, 'interactions.md'), L.join('\n'));
console.log(L.join('\n'));
