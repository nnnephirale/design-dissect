// design-dissect: measure a page's COMPOSITION, the geometry between things rather
// than the styles of things. That means the vertical band sequence and its height ratios,
// how panels split a row (1:1, 3:2 …), what sits inside each panel and where (text column,
// UI mock, texture plate), what bleeds off an edge or overlaps, and the type anatomy of
// each block. Tokens tell you the vocabulary; this tells you the grammar.
//
// One async expression; run it in a page (run.mjs does). Result is also kept on window.__ddc.
(async () => {
  const vw = innerWidth, vh = innerHeight;
  const H = () => document.documentElement.scrollHeight;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- colour helpers ----------
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const rgba = (s) => {
    if (!s || s === 'transparent') return null;
    if (cache.has(s)) return cache.get(s);
    let o = null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); o = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    else { try { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; o = { r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(2) }; } catch {} }
    if (o && o.a === 0) o = null;
    cache.set(s, o); return o;
  };
  const h2 = (n) => Math.round(n).toString(16).padStart(2, '0');
  const hex = (c) => '#' + h2(c.r) + h2(c.g) + h2(c.b) + (c.a < 1 ? h2(c.a * 255) : '');
  const hexify = (s) => s.replace(/(rgba?|color|oklch|oklab|lab|lch|hsla?)\([^()]*(\([^()]*\)[^()]*)*\)/g, (c) => { const p = rgba(c); return p ? hex(p) : c; });

  // What does this element paint? flat colour, gradient, pattern, image, or media.
  const fillOf = (el) => {
    const tag = el.tagName;
    if (tag === 'VIDEO') return { kind: 'video' };
    if (tag === 'IMG' || tag === 'PICTURE') return { kind: 'image', src: (el.currentSrc || el.src || '').split('/').pop().slice(0, 60) };
    if (tag === 'CANVAS') return { kind: 'canvas' };
    if (tag === 'svg' && el.getBoundingClientRect().width > 120) return { kind: 'svg' };
    const cs = getComputedStyle(el);
    const bi = cs.backgroundImage;
    if (bi && bi !== 'none') {
      if (/url\(/.test(bi)) return { kind: 'image', src: (bi.match(/url\(["']?([^"')]+)/) || [])[1]?.split('/').pop().slice(0, 60) };
      if (/repeating-/.test(bi)) return { kind: 'pattern', css: hexify(bi).slice(0, 260), base: rgba(cs.backgroundColor) ? hex(rgba(cs.backgroundColor)) : null };
      if (/gradient/.test(bi)) return { kind: 'gradient', css: hexify(bi).slice(0, 260), base: rgba(cs.backgroundColor) ? hex(rgba(cs.backgroundColor)) : null };
    }
    const c = rgba(cs.backgroundColor);
    if (c && c.a >= 0.5) return { kind: 'flat', color: hex(c) };
    if (c) return { kind: 'tint', color: hex(c) };
    return null;
  };
  const fillKey = (f) => !f ? 'none' : f.kind === 'flat' || f.kind === 'tint' ? f.color : f.kind;
  const isChrome = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
  const NOISE = '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i],[id*=intercom i]';

  // ---------- 1. band sequence: sample the painted surface down the left edge and centre ----------
  const paintedAt = (x, y) => {
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === document.documentElement) break;
      if (isChrome(el) || el.closest(NOISE)) continue;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const f = fillOf(e);
        if (f && f.kind !== 'tint') return { el: e, f };
      }
      break;
    }
    const f = fillOf(document.body) || { kind: 'flat', color: hex(rgba(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }) };
    return { el: document.body, f };
  };
  // Smooth scrolling (CSS or Lenis-style libraries) makes scrollTo land late, so force
  // instant jumps and always read the real scrollY rather than trusting the target.
  const html = document.documentElement, prevSB = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  const STEP = 16, edge = [], centre = [];
  let next = 0;
  for (let guard = 0; next < H() && guard < 200; guard++) {
    scrollTo({ top: next, behavior: 'instant' }); await sleep(140);
    const sy = scrollY;
    for (let y = Math.max(0, next - sy); y < vh && sy + y < H(); y += STEP) {
      edge.push({ y: sy + y, ...paintedAt(6, y) });
      centre.push({ y: sy + y, ...paintedAt(vw / 2, y) });
    }
    next = sy + vh;
    if (sy + vh >= H()) break;
  }
  scrollTo({ top: 0, behavior: 'instant' }); await sleep(150);
  html.style.scrollBehavior = prevSB;
  edge.sort((a, b) => a.y - b.y);
  const runs = (samples) => {
    const out = [];
    for (const s of samples) {
      const k = fillKey(s.f), last = out[out.length - 1];
      if (last && last.key === k) { last.h = s.y + STEP - last.y; continue; }
      out.push({ key: k, y: s.y, h: STEP, fill: s.f, el: s.el });
    }
    // absorb slivers (<40px) into the previous run: borders, dividers, sampling noise
    return out.reduce((acc, r) => { const p = acc[acc.length - 1]; if (p && r.h < 40) { p.h += r.h; } else acc.push(r); return acc; }, []);
  };
  const bands = runs(edge).map((b, i) => ({ i, y: b.y, h: b.h, hVh: +(b.h / vh).toFixed(2), fill: b.fill, fullBleed: true }));

  // ---------- 2. panels: painted blocks that aren't full-bleed ----------
  const pageRect = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; };
  const minArea = vw * vh * 0.012;
  const panelEls = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest(NOISE) || isChrome(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
    const r = pageRect(el);
    if (r.w * r.h < minArea || r.w >= vw * 0.97) continue;
    const f = fillOf(el);
    if (!f) continue;
    panelEls.push(el);
  }
  const set = new Set(panelEls);
  const parentPanel = (el) => { for (let e = el.parentElement; e; e = e.parentElement) if (set.has(e)) return e; return null; };
  const bandOf = (r) => { const cy = r.y + r.h / 2; return bands.find((b) => cy >= b.y && cy < b.y + b.h) ?? bands[bands.length - 1]; };

  // Type anatomy: text elements inside a region (not inside nested panels), in reading order.
  const anatomy = (root, rr, exclude) => {
    const items = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode; const el = t.parentElement;
      if (!el || seen.has(el) || !t.textContent.trim() || el.closest(NOISE) || isChrome(el) || el.closest('script,style,noscript,template,iframe,video')) continue;
      if (exclude && exclude.some((x) => x !== root && x.contains(el))) continue;
      seen.add(el);
      const cs = getComputedStyle(el), r = pageRect(el);
      if (r.w < 2 || cs.visibility === 'hidden') continue;
      const c = rgba(cs.color);
      items.push({ y: r.y, x: r.x, w: r.w, size: parseFloat(cs.fontSize), weight: cs.fontWeight, color: c ? hex(c) : null, family: cs.fontFamily.split(',')[0].replace(/["']/g, ''), text: t.textContent.trim().replace(/\s+/g, ' ').slice(0, 48) });
    }
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    if (!items.length) return null;
    const x0 = Math.min(...items.map((i) => i.x)), x1 = Math.max(...items.map((i) => i.x + i.w));
    const big = [...items].sort((a, b) => b.size - a.size)[0];
    return {
      count: items.length,
      column: { x0: +((x0 - rr.x) / rr.w).toFixed(2), x1: +((x1 - rr.x) / rr.w).toFixed(2) },
      lead: items.slice(0, 5).map((i) => `${i.size}px/${i.weight} ${i.color}${i.family !== big.family ? ' ' + i.family : ''} "${i.text}"`),
      largest: `${big.size}px/${big.weight} ${big.color} "${big.text}"`,
      smallTextShare: +(items.filter((i) => i.size <= 13).length / items.length).toFixed(2),
    };
  };

  const describe = (el) => {
    const r = pageRect(el), cs = getComputedStyle(el), f = fillOf(el);
    const kids = panelEls.filter((k) => parentPanel(k) === el);
    const ana = anatomy(el, r, kids);
    // A "UI mock" is a light panel dense with small text: product UI shown as a picture.
    const ui = (f?.kind === 'flat' || f?.kind === 'tint') && ana && ana.count >= 6 && ana.smallTextShare >= 0.5;
    return { el, r, f, radius: cs.borderRadius.replace(/\d+(\.\d+)?e\+\d+px/g, 'full'), clips: cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.clipPath !== 'none', shadow: cs.boxShadow !== 'none', blur: cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : null, ui, ana, kids };
  };
  const rel = (c, p) => ({ x0: +((c.x - p.x) / p.w).toFixed(2), y0: +((c.y - p.y) / p.h).toFixed(2), x1: +((c.x + c.w - p.x) / p.w).toFixed(2), y1: +((c.y + c.h - p.y) / p.h).toFixed(2) });
  const bleed = (c, p) => ['left', 'top', 'right', 'bottom'].filter((s, i) => [c.x < p.x - 2, c.y < p.y - 2, c.x + c.w > p.x + p.w + 2, c.y + c.h > p.y + p.h + 2][i]);
  const touches = (c, p) => ['left', 'top', 'right', 'bottom'].filter((s, i) => [Math.abs(c.x - p.x) < 3, Math.abs(c.y - p.y) < 3, Math.abs(c.x + c.w - p.x - p.w) < 3, Math.abs(c.y + c.h - p.y - p.h) < 3][i]);
  const overlap = (a, b) => { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? (w * h) / Math.min(a.w * a.h, b.w * b.h) : 0; };
  const fillStr = (f) => !f ? 'none' : f.kind === 'flat' || f.kind === 'tint' ? f.color : f.kind === 'image' ? `image(${f.src || ''})` : f.kind === 'gradient' || f.kind === 'pattern' ? `${f.kind}${f.base ? ' on ' + f.base : ''}: ${f.css.slice(0, 120)}` : f.kind;

  const top = panelEls.filter((el) => !parentPanel(el)).map(describe);
  const flatten = (p, depth) => ({
    fill: fillStr(p.f), fillKind: p.f?.kind, radius: p.radius, clips: p.clips, shadow: p.shadow, blur: p.blur, ui: p.ui,
    x: Math.round(p.r.x), y: Math.round(p.r.y), w: Math.round(p.r.w), h: Math.round(p.r.h), aspect: +(p.r.w / p.r.h).toFixed(2),
    text: p.ana,
    children: depth > 2 ? [] : p.kids.map(describe).sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x).slice(0, 8).map((c) => ({
      ...flatten(c, depth + 1),
      at: rel(c.r, p.r), bleeds: p.clips ? bleed(c.r, p.r) : [], overflows: !p.clips ? bleed(c.r, p.r) : [], touches: touches(c.r, p.r),
    })),
  });
  const panels = top.map((p) => ({ band: bandOf(p.r).i, ...flatten(p, 1) }));

  // Overlaps between siblings inside a panel (texture plate behind a mock, card over card).
  for (const p of panels) {
    const ch = p.children; p.overlaps = [];
    for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) {
      const o = overlap(ch[i], ch[j]);
      if (o > 0.08) p.overlaps.push(`${i + 1}×${j + 1} ${Math.round(o * 100)}% (${ch[i].fillKind} under ${ch[j].fillKind})`);
    }
  }

  // ---------- 3. rows & splits per band ----------
  const ratio = (ws) => {
    const min = Math.min(...ws);
    const rs = ws.map((w) => w / min);
    const pretty = rs.map((r) => (Math.abs(r - Math.round(r)) < 0.08 ? Math.round(r) : +r.toFixed(2)));
    return pretty.join(':');
  };
  for (const b of bands) {
    const ps = panels.filter((p) => p.band === b.i).sort((a, c) => a.y - c.y || a.x - c.x);
    const rows = [];
    for (const p of ps) {
      const row = rows.find((r) => Math.abs(r.y - p.y) < 14);
      if (row) row.items.push(p); else rows.push({ y: p.y, items: [p] });
    }
    b.rows = rows.map((r) => {
      const items = r.items.sort((a, c) => a.x - c.x);
      const x0 = items[0].x, x1 = Math.max(...items.map((i) => i.x + i.w));
      const gaps = items.slice(1).map((it, k) => Math.round(it.x - (items[k].x + items[k].w)));
      return { y: r.y, h: Math.max(...items.map((i) => i.h)), widthPct: +((x1 - x0) / vw).toFixed(2), split: items.length > 1 ? ratio(items.map((i) => i.w)) : '1', widths: items.map((i) => i.w), gaps, fills: items.map((i) => i.fill.slice(0, 40)) };
    });
    // Content not in panels (e.g. a headline sitting directly on the band).
    const region = { x: 0, y: b.y, w: vw, h: b.h };
    const bandText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode() && bandText.length < 8) {
      const el = walker.currentNode.parentElement; if (!el || !walker.currentNode.textContent.trim() || isChrome(el) || el.closest(NOISE) || el.closest('script,style,noscript,template,iframe')) continue;
      if (el.getBoundingClientRect().width < 2 || getComputedStyle(el).visibility === 'hidden') continue;
      const r = pageRect(el); if (r.y < b.y || r.y > b.y + b.h || panelEls.some((p) => p.contains(el))) continue;
      const cs = getComputedStyle(el), c = rgba(cs.color);
      bandText.push({ size: parseFloat(cs.fontSize), weight: cs.fontWeight, color: c ? hex(c) : null, x: +(r.x / vw).toFixed(2), w: +(r.w / vw).toFixed(2), y: Math.round(r.y), text: walker.currentNode.textContent.trim().slice(0, 40) });
    }
    b.text = bandText;
    b.region = region;
  }

  return (window.__ddc = {
    page: { url: location.href, viewport: `${vw}x${vh}`, height: H() },
    bands: bands.map(({ region, ...b }) => ({ ...b, fill: fillStr(b.fill) })),
    panels,
  });
})()
