#!/usr/bin/env node
// design-dissect canvas/WebGL capture: read what a <canvas> is actually doing so it can be recreated.
//   · WebGL/WebGL2: the GLSL source of every program (vertex + fragment), uniform names and types,
//     how each uniform changes over time (constant / time-like / mouse-driven), textures (source URLs,
//     sizes), draw calls per frame, blend/depth state, canvas size and DPR.
//   · 2D: a call histogram per frame plus the first few hundred calls with their arguments
//     (paths, gradients, fillStyle, text, drawImage sources), which is enough to rebuild the drawing.
//   · Frames of each canvas over time, as a strip.
// The page must hand the browser its shaders and draw calls, so they can be intercepted as
// they're passed in.
//
//   node canvas.mjs <url> <outDir> [--hover="css"] [--click="css"] [--move] [--ms=2500]
// Writes <outDir>/canvas.md, canvas.json, canvas/prog-N.vert|frag, canvas/strip-N.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const [url, outDir = './design-dissect-out', ...flags] = process.argv.slice(2);
if (!url) { console.error('usage: node canvas.mjs <url> <outDir> [--hover="css"] [--click="css"] [--move] [--ms=2500]'); process.exit(1); }
const opt = (k) => flags.find((f) => f.startsWith(`--${k}=`))?.slice(k.length + 3);
const MS = +(opt('ms') || 2500);
let chromium;
for (const base of [process.cwd() + '/', here + '/']) { try { ({ chromium } = createRequire(base)('playwright')); break; } catch {} }
if (!chromium) { console.error(`playwright not found: cd "${here}" && npm i`); process.exit(2); }
const cdir = join(outDir, 'canvas'); mkdirSync(cdir, { recursive: true });

const HOOKS = () => {
  const T0 = performance.now(), now = () => Math.round(performance.now() - T0);
  const R = (window.__ddCanvas = { canvases: [], programs: [], gl: new Map(), c2d: new Map() });
  const cid = (canvas) => { let i = R.canvases.indexOf(canvas); if (i < 0) { R.canvases.push(canvas); i = R.canvases.length - 1; } return i; };
  const wrap = (proto, name, fn) => { const o = proto && proto[name]; if (typeof o !== 'function') return; proto[name] = function (...a) { try { fn.call(this, a); } catch {} return o.apply(this, a); }; };
  const wrapRet = (proto, name, fn) => { const o = proto && proto[name]; if (typeof o !== 'function') return; proto[name] = function (...a) { const r = o.apply(this, a); try { fn.call(this, a, r); } catch {} return r; }; };

  // ---------- WebGL ----------
  for (const P of [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype]) {
    if (!P) continue;
    const st = (gl) => { const id = cid(gl.canvas); if (!R.gl.has(id)) R.gl.set(id, { type: gl instanceof (window.WebGL2RenderingContext || Object) ? 'webgl2' : 'webgl', shaders: new Map(), progs: new Map(), locs: new Map(), uniforms: {}, textures: [], draws: {}, blend: null, current: null }); return R.gl.get(id); };
    wrap(P, 'shaderSource', function ([sh, src]) { st(this).shaders.set(sh, src); });
    wrap(P, 'attachShader', function ([prog, sh]) { const s = st(this); const p = s.progs.get(prog) || { id: R.programs.length, vert: '', frag: '' }; if (!s.progs.has(prog)) { s.progs.set(prog, p); R.programs.push({ canvas: cid(this.canvas), p }); } const src = s.shaders.get(sh) || ''; if (/gl_FragColor|out\s+vec4|precision\s+\w+\s+float;[\s\S]*void\s+main[\s\S]*(gl_FragColor|fragColor|\w+\s*=)/.test(src) && !/gl_Position/.test(src)) p.frag = src; else p.vert = src; });
    wrap(P, 'useProgram', function ([prog]) { st(this).current = prog; });
    wrapRet(P, 'getUniformLocation', function ([prog, name], loc) { if (loc) st(this).locs.set(loc, { name, prog: st(this).progs.get(prog)?.id }); });
    for (const m of ['uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1i', 'uniform2i', 'uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniformMatrix3fv', 'uniformMatrix4fv']) {
      wrap(P, m, function ([loc, ...v]) {
        const s = st(this), meta = s.locs.get(loc); if (!meta) return;
        const val = (Array.isArray(v[0]) || ArrayBuffer.isView(v[0])) ? [...v[0]].slice(0, 16) : (m.startsWith('uniformMatrix') ? [...v[1]].slice(0, 16) : v);
        const u = (s.uniforms[`${meta.prog}:${meta.name}`] ||= { prog: meta.prog, name: meta.name, fn: m, samples: [] });
        const last = u.samples[u.samples.length - 1];
        const key = JSON.stringify(val.map((x) => +(+x).toFixed(4)));
        if (!last || last.k !== key) { if (u.samples.length < 400) u.samples.push({ t: now(), k: key, v: val.map((x) => +(+x).toFixed(4)) }); }
      });
    }
    // Textures: record the source and keep a PNG copy (image/bitmap/canvas sources, and 8-bit data arrays).
    const snap = (src, w, h, pixels, format) => {
      try {
        const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        if (pixels) { const img = x.createImageData(w, h); const ch = pixels.length / (w * h) | 0; for (let i = 0; i < w * h; i++) { const r = pixels[i * ch]; img.data[i * 4] = r; img.data[i * 4 + 1] = ch > 1 ? pixels[i * ch + 1] : r; img.data[i * 4 + 2] = ch > 2 ? pixels[i * ch + 2] : r; img.data[i * 4 + 3] = ch > 3 ? pixels[i * ch + 3] : 255; } x.putImageData(img, 0, 0); }
        else x.drawImage(src, 0, 0, w, h);
        return c.toDataURL('image/png');
      } catch { return null; }
    };
    wrap(P, 'texImage2D', function (a) {
      const s = st(this); if (s.textures.length >= 12) return;
      const src = a.find((x) => x && (x instanceof HTMLImageElement || x instanceof HTMLCanvasElement || x instanceof HTMLVideoElement || (window.ImageBitmap && x instanceof ImageBitmap)));
      if (src) { const w = src.naturalWidth || src.videoWidth || src.width, h = src.naturalHeight || src.videoHeight || src.height; s.textures.push({ kind: src.constructor.name, src: src.currentSrc || src.src || '', w, h, png: w * h <= 4e6 ? snap(src, w, h) : null }); }
      else { const w = a[3], h = a[4], px = a[8]; s.textures.push({ kind: 'data', w, h, png: px && ArrayBuffer.isView(px) && px.BYTES_PER_ELEMENT === 1 && w * h <= 4e6 ? snap(null, w, h, px) : null }); }
    });
    for (const m of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) wrap(P, m, function () { const s = st(this); const sec = Math.floor(now() / 1000); s.draws[sec] = (s.draws[sec] || 0) + 1; });
    wrap(P, 'blendFunc', function (a) { st(this).blend = a; });
  }

  // ---------- 2D ----------
  const C = window.CanvasRenderingContext2D?.prototype;
  if (C) {
    const st2 = (ctx) => { const id = cid(ctx.canvas); if (!R.c2d.has(id)) R.c2d.set(id, { calls: [], hist: {}, frames: 0, lastT: -1, gradients: [], images: [] }); return R.c2d.get(id); };
    const fmt = (x) => x instanceof HTMLImageElement ? `img(${(x.currentSrc || x.src).split('/').pop().slice(0, 40)})` : x instanceof HTMLCanvasElement ? 'canvas' : typeof x === 'number' ? +x.toFixed(2) : typeof x === 'string' ? x.slice(0, 60) : x && x.constructor ? x.constructor.name : x;
    for (const m of Object.getOwnPropertyNames(C)) {
      const d = Object.getOwnPropertyDescriptor(C, m);
      if (!d || typeof d.value !== 'function' || m === 'constructor' || m.startsWith('get')) continue;
      wrap(C, m, function (a) { const s = st2(this); const t = now(); s.hist[m] = (s.hist[m] || 0) + 1; if (s.calls.length < 600) s.calls.push({ t, m, a: a.slice(0, 6).map(fmt), fill: typeof this.fillStyle === 'string' ? this.fillStyle : 'gradient/pattern', stroke: typeof this.strokeStyle === 'string' ? this.strokeStyle : 'gradient/pattern', alpha: +this.globalAlpha.toFixed(2), comp: this.globalCompositeOperation, font: m === 'fillText' ? this.font : undefined }); if (m === 'drawImage' && s.images.length < 12) s.images.push(fmt(a[0])); });
    }
    for (const g of ['createLinearGradient', 'createRadialGradient', 'createConicGradient']) wrapRet(C, g, function (a, grad) { const s = st2(this); const rec = { type: g.replace('create', '').replace('Gradient', ''), args: a.map(fmt), stops: [] }; if (s.gradients.length < 20) s.gradients.push(rec); const add = grad.addColorStop.bind(grad); grad.addColorStop = (o, c) => { rec.stops.push([+o.toFixed(3), c]); return add(o, c); }; });
    // frame counter: a new frame starts when time advances past a rAF boundary
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((ts) => { for (const s of R.c2d.values()) s.frames++; cb(ts); });
  }
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] }).catch(() => chromium.launch({ channel: 'chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(HOOKS);
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.addStyleTag({ content: '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i]{display:none!important}' }).catch(() => {});
await page.waitForTimeout(800);
// Triggers: canvases often only run on hover/click (e.g. a button's hover effect).
const trigger = async () => {
  const h = opt('hover'), c = opt('click');
  if (h) { const b = await page.locator(h).first().boundingBox({ timeout: 3000 }).catch(() => null); if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); }
  if (c) await page.locator(c).first().click({ timeout: 3000 }).catch(() => {});
  if (flags.includes('--move')) for (let i = 0; i < 12; i++) await page.mouse.move(300 + i * 60, 300 + (i % 3) * 40, { steps: 3 });
};
await trigger();

// Frames of every visible canvas over time.
const boxes = async () => page.evaluate(() => window.__ddCanvas.canvases.map((c, i) => { const r = c.getBoundingClientRect(); return { i, x: r.x, y: r.y, w: r.width, h: r.height, pw: c.width, ph: c.height, visible: r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight }; }));
const shots = new Map(); const t0 = Date.now();
for (const at of [0, 250, 600, 1000, 1500, 2200].filter((x) => x <= MS)) {
  const w = at - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w);
  for (const b of await boxes()) { if (!b.visible) continue; try { const clip = { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.w, 1440 - Math.max(0, b.x)), height: Math.min(b.h, 900 - Math.max(0, b.y)) }; const arr = shots.get(b.i) || []; arr.push({ t: Date.now() - t0, b64: (await page.screenshot({ clip })).toString('base64') }); shots.set(b.i, arr); } catch {} }
}
const rest = MS - (Date.now() - t0); if (rest > 0) await page.waitForTimeout(rest);

const data = await page.evaluate(() => {
  const R = window.__ddCanvas;
  const canv = R.canvases.map((c, i) => { const r = c.getBoundingClientRect(); const cs = getComputedStyle(c); return { i, cls: (c.className?.baseVal ?? c.className ?? '').toString().slice(0, 80), parent: c.parentElement ? (c.parentElement.getAttribute('aria-label') || c.parentElement.className?.toString().slice(0, 60) || c.parentElement.tagName) : '', css: `${Math.round(r.width)}×${Math.round(r.height)}`, buffer: `${c.width}×${c.height}`, dpr: devicePixelRatio, filter: cs.filter, blend: cs.mixBlendMode, opacity: cs.opacity }; });
  const gl = [...R.gl.entries()].map(([id, s]) => ({ canvas: id, type: s.type, programs: [...s.progs.values()].map((p) => ({ id: p.id, vert: p.vert, frag: p.frag })), uniforms: Object.values(s.uniforms), textures: s.textures, drawsPerSec: s.draws, blend: s.blend }));
  const c2d = [...R.c2d.entries()].map(([id, s]) => ({ canvas: id, frames: s.frames, hist: s.hist, gradients: s.gradients, images: s.images, calls: s.calls }));
  return { canvases: canv, gl, c2d };
});
await browser.close();

// ---------- classify uniforms ----------
const classify = (u) => {
  const s = u.samples; if (s.length <= 1) return { kind: 'constant', value: s[0]?.v };
  const first = s[0].v, last = s.at(-1).v, span = (s.at(-1).t - s[0].t) / 1000 || 1;
  if (first.length === 1) {
    const inc = s.every((x, i) => i === 0 || x.v[0] >= s[i - 1].v[0]);
    const rate = (last[0] - first[0]) / span;
    if (inc && s.length > 10 && rate > 0) return { kind: 'time-like', rate: +rate.toFixed(3) + '/s', from: first[0], to: last[0] };
    const vals = s.map((x) => x.v[0]); return { kind: 'animated', min: Math.min(...vals), max: Math.max(...vals), changes: s.length };
  }
  return { kind: s.length > 3 ? 'animated (vector: mouse/size/colour?)' : 'set a few times', first, last, changes: s.length };
};

// ---------- write ----------
const L = [`# Canvas / WebGL — ${url}`, '', `${data.canvases.length} canvas element(s).`];
for (const c of data.canvases) {
  L.push('', `## Canvas ${c.i} · ${c.css} (buffer ${c.buffer}, dpr ${c.dpr}) · in ${c.parent}`, `css: filter ${c.filter}, blend ${c.blend}, opacity ${c.opacity}`);
  const g = data.gl.find((x) => x.canvas === c.i), d = data.c2d.find((x) => x.canvas === c.i);
  if (g) {
    L.push(`**${g.type}** · ${g.programs.length} program(s) · draws/s: ${JSON.stringify(g.drawsPerSec)} · blend ${JSON.stringify(g.blend)}`);
    for (const p of g.programs) {
      const f = `canvas/prog-${p.id}`; writeFileSync(join(outDir, f + '.vert'), p.vert || ''); writeFileSync(join(outDir, f + '.frag'), p.frag || '');
      L.push(`- program ${p.id}: ${f}.vert (${(p.vert || '').split('\n').length} lines), ${f}.frag (${(p.frag || '').split('\n').length} lines)`);
    }
    L.push('Uniforms:');
    for (const u of g.uniforms) { const k = classify(u); L.push(`- ${u.name} (${u.fn.replace('uniform', '')}, prog ${u.prog}): ${k.kind}${k.rate ? ' ' + k.rate : ''}${k.value ? ' = ' + JSON.stringify(k.value) : ''}${k.min != null ? ` range ${k.min}…${k.max}` : ''}${k.first ? ` ${JSON.stringify(k.first)} → ${JSON.stringify(k.last)}` : ''}`); }
    if (g.textures.length) L.push('Textures: ' + g.textures.map((t, ti) => { let f = ''; if (t.png) { f = `canvas/tex-${c.i}-${ti}.png`; writeFileSync(join(outDir, f), Buffer.from(t.png.split(',')[1], 'base64')); } return `${t.kind} ${t.w}×${t.h} ${t.src ? t.src.split('/').pop().slice(0, 50) : ''}${f ? ' → ' + f : ''}`; }).join(' · '));
  }
  if (d) {
    const top = Object.entries(d.hist).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}×${v}`).join(' ');
    L.push(`**2d** · ~${d.frames} frames observed · calls: ${top}`);
    if (d.gradients.length) L.push('Gradients: ' + d.gradients.map((x) => `${x.type}(${x.args.join(',')}) ${x.stops.map((s) => s.join(' ')).join(' | ')}`).join(' ; '));
    if (d.images.length) L.push('Images drawn: ' + [...new Set(d.images)].join(', '));
    const firstFrame = d.calls.filter((x) => x.t <= (d.calls[0]?.t ?? 0) + 20).slice(0, 40);
    L.push('First frame, in order:'); firstFrame.forEach((x) => L.push(`  ${x.m}(${x.a.join(', ')})${/fill|stroke|Text|Rect|arc/.test(x.m) ? ` · fill ${x.fill} stroke ${x.stroke} α${x.alpha} ${x.comp}` : ''}${x.font ? ' · ' + x.font : ''}`));
  }
  if (!g && !d) L.push('No context activity captured (the canvas may need a trigger: --hover / --click / --move).');
  const sh = shots.get(c.i);
  if (sh?.length) {
    const sp = await (await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }))).newPage();
    await sp.setContent(`<body style="margin:0;background:#fff;font:10px ui-monospace,monospace;display:inline-flex;gap:6px;padding:6px">${sh.map((s) => `<figure style="margin:0"><img src="data:image/png;base64,${s.b64}" style="display:block;max-width:260px;border:1px solid #eee"><figcaption>${s.t}ms</figcaption></figure>`).join('')}</body>`);
    await sp.locator('body').screenshot({ path: join(cdir, `strip-${c.i}.png`) }); await sp.context().browser().close();
    L.push(`Frames: canvas/strip-${c.i}.png`);
  }
}
for (const g of data.gl) for (const t of g.textures) delete t.png;
writeFileSync(join(outDir, 'canvas.json'), JSON.stringify(data, null, 1));
writeFileSync(join(outDir, 'canvas.md'), L.join('\n'));
console.log(L.join('\n'));
