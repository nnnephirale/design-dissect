// design-dissect: measure a live page's design tokens from computed styles.
//
// Paste the whole file into a browser JS tool (javascript_exec / javascript_tool /
// Playwright page.evaluate). It is one async expression; the result is also kept
// on window.__dd so you can query slices of it afterwards without re-running.
// Scroll the page to the bottom first so lazy sections exist.
//
// Weighting: background colours by painted area, text colour and type styles by
// characters rendered, so the dominant values float up and one-off noise sinks.
(async () => {
  const TOP = 24;
  const vw = innerWidth, vh = innerHeight;

  // ---------- colour helpers ----------
  const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0');
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  // Any CSS colour (rgb, color(srgb …), oklch, lab …) → {r,g,b,a} in sRGB.
  // Fast path for rgb(); otherwise paint one pixel and read it back.
  const parseColor = (s) => {
    if (!s || s === 'transparent') return null;
    if (colorCache.has(s)) return colorCache.get(s);
    let out = null;
    const m = s.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      out = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    } else {
      try {
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        out = { r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(2) };
      } catch {}
    }
    if (out && out.a === 0) out = null;
    colorCache.set(s, out);
    return out;
  };
  const toHex = (c) => '#' + hex2(c.r) + hex2(c.g) + hex2(c.b) + (c.a < 1 ? hex2(c.a * 255) : '');
  // Neutral (R=G=B), warm (R>B) or cool (B>R) for greys; chromatic beyond that.
  // Warm-vs-neutral grey is often the whole mood of a system, so call it out.
  const tint = (c) => {
    const spread = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    if (spread > 24) return 'chromatic';
    if (spread <= 1) return 'neutral';
    return c.r > c.b ? 'warm' : 'cool';
  };
  const withTint = (arr) => arr.map((x) => {
    const m = /#([0-9a-f]{6})/i.exec(x.value);
    if (!m) return x;
    const n = parseInt(m[1], 16);
    return { ...x, tint: tint({ r: n >> 16, g: (n >> 8) & 255, b: n & 255 }) };
  });

  // ---------- tally helpers ----------
  const px = (s) => parseFloat(s) || 0;
  // Tailwind v4's rounded-full is calc(infinity * 1px), which computes to 3.35544e+07px.
  const fullRadius = (r) => r.replace(/\d+(\.\d+)?e\+\d+px|\b\d{4,}px/g, 'full');
  const tally = (map, key, w = 1, sample) => {
    if (key == null || key === '') return;
    const e = map.get(key) || { n: 0, w: 0, samples: [] };
    e.n++; e.w += w;
    if (sample && e.samples.length < 3 && !e.samples.includes(sample)) e.samples.push(sample);
    map.set(key, e);
  };
  const top = (map, n = TOP) => [...map.entries()]
    .sort((a, b) => b[1].w - a[1].w).slice(0, n)
    .map(([k, v]) => ({ value: k, count: v.n, weight: Math.round(v.w), samples: v.samples }));
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    if (cls) s += '.' + cls;
    const t = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return t ? `${s} "${t}"` : s;
  };
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
  // Normalise any colour inside a shadow/gradient string to hex so values group.
  const hexify = (s) => s.replace(/(rgba?|color|oklch|oklab|lab|lch|hsla?)\([^()]*(\([^()]*\)[^()]*)*\)/g, (c) => { const p = parseColor(c); return p ? toHex(p) : c; });

  // ---------- walk the rendered DOM ----------
  const bg = new Map(), text = new Map(), border = new Map(), rings = new Map(), gradients = new Map();
  const type = new Map(), families = new Map(), weights = new Map();
  const radii = new Map(), shadows = new Map(), spacing = new Map(), gaps = new Map();
  const transitions = new Map(), easings = new Map(), durations = new Map(), animations = new Map();
  const filters = new Map(), maxWidths = new Map(), opacities = new Map(), blends = new Map();
  let count = 0;
  // Consent banners and chat widgets aren't the design system; skip their subtrees.
  const NOISE = '[id*=cookie i],[class*=cookie i],[id*=consent i],[class*=consent i],[id*=onetrust i],[class*=onetrust i],[id*=intercom i],[class*=intercom i],[id*=hubspot i],[id*=drift i],[aria-label*=cookie i]';

  for (const el of document.querySelectorAll('body, body *')) {
    if (el !== document.body && el.closest(NOISE)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    count++;
    const area = Math.min(r.width, vw) * Math.min(r.height, vh * 3);
    const lbl = label(el);

    const b = parseColor(cs.backgroundColor);
    if (b) tally(bg, toHex(b), area, lbl);
    if (cs.backgroundImage.includes('gradient')) tally(gradients, hexify(cs.backgroundImage).slice(0, 300), area, lbl);

    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      if (px(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== 'none') {
        const c = parseColor(cs[`border${side}Color`]);
        if (c) tally(border, `${cs[`border${side}Width`]} ${side.toLowerCase()} ${toHex(c)}`, 1, lbl);
      }
    }

    const own = ownText(el);
    if (own.length) {
      const c = parseColor(cs.color);
      if (c) tally(text, toHex(c), own.length, lbl);
      const size = px(cs.fontSize);
      const lh = cs.lineHeight === 'normal' ? 'normal' : (px(cs.lineHeight) / size).toFixed(2);
      const ls = cs.letterSpacing === 'normal' ? '0' : (px(cs.letterSpacing) / size).toFixed(3) + 'em';
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const extra = (cs.textTransform !== 'none' ? ' ' + cs.textTransform : '') + (cs.fontStyle === 'italic' ? ' italic' : '');
      tally(type, `${fam} | ${+size.toFixed(2)}px | ${cs.fontWeight} | lh ${lh} | ls ${ls}${extra}`, own.length, lbl);
      tally(families, cs.fontFamily, own.length);
      tally(weights, cs.fontWeight, own.length);
    }

    if (cs.borderRadius && cs.borderRadius !== '0px') tally(radii, fullRadius(cs.borderRadius), 1, lbl);
    if (cs.boxShadow !== 'none') {
      const sh = hexify(cs.boxShadow);
      tally(shadows, sh, 1, lbl);
      // "0 0 0 1px" shadows are borders in disguise (common in Linear/Superhuman-style systems).
      const ring = sh.match(/(#[0-9a-f]{6,8}) 0px 0px 0px (\d+(\.\d+)?px)( inset)?/i);
      if (ring) tally(rings, `${ring[2]} ${ring[1]}${ring[4] || ''}`, 1, lbl);
    }

    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom']) {
      const v = px(cs[p]);
      if (v > 0 && v < 400) tally(spacing, Math.round(v), 1);
    }
    for (const p of ['rowGap', 'columnGap']) {
      const v = px(cs[p]);
      if (v > 0) tally(gaps, Math.round(v), 1, lbl);
    }

    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      tally(transitions, `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`, 1, lbl);
      cs.transitionTimingFunction.split(/,\s*(?![^(]*\))/).forEach((e) => tally(easings, e, 1));
      cs.transitionDuration.split(',').forEach((d) => tally(durations, d.trim(), 1));
    }
    if (cs.animationName !== 'none') tally(animations, `${cs.animationName} ${cs.animationDuration} ${cs.animationTimingFunction}`, 1, lbl);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') tally(filters, 'backdrop: ' + cs.backdropFilter, 1, lbl);
    if (cs.filter !== 'none') tally(filters, 'filter: ' + cs.filter, 1, lbl);
    if (cs.mixBlendMode !== 'normal') tally(blends, cs.mixBlendMode, 1, lbl);
    if (cs.maxWidth !== 'none' && px(cs.maxWidth) > 300) tally(maxWidths, cs.maxWidth, 1, lbl);
    if (cs.opacity !== '1') tally(opacities, cs.opacity, 1);
  }

  // ---------- stylesheets: authored tokens, breakpoints, interaction rules, fonts ----------
  // Cross-origin sheets throw on .cssRules; refetch them (CDNs usually allow CORS)
  // and parse into a constructed sheet so the same walker reads them.
  const vars = {}, media = new Map(), interaction = [], fontFaces = new Map(), keyframes = [];
  const sheetStatus = { read: 0, refetched: 0, unreadable: [] };
  const walkRules = (rules, parent = '') => {
    for (const rule of rules) {
      // Native CSS nesting reports "&:hover"; resolve & against the parent rule.
      const sel = rule.selectorText ? (parent && rule.selectorText.includes('&') ? rule.selectorText.replace(/&/g, parent) : rule.selectorText) : '';
      const kind = rule.constructor.name;
      if (kind === 'CSSMediaRule') tally(media, rule.conditionText || rule.media.mediaText, 1);
      if (kind === 'CSSKeyframesRule' && keyframes.length < 15) keyframes.push(rule.cssText.replace(/\s+/g, ' ').slice(0, 240));
      if (kind === 'CSSFontFaceRule') {
        const f = rule.style.getPropertyValue('font-family').replace(/["']/g, '');
        tally(fontFaces, `${f} ${rule.style.getPropertyValue('font-weight') || ''}`.trim(), 1);
      }
      if (rule.cssRules && kind !== 'CSSKeyframesRule') walkRules(rule.cssRules, sel || parent);
      if (!sel) continue;
      if (/(^|,)\s*(:root|html|body|\[data-theme[^\]]*\]|\.dark|\.light)\s*(,|$)/.test(sel)) {
        for (const prop of rule.style) if (prop.startsWith('--') && Object.keys(vars).length < 700) {
          // Rules that include :root/html are the default theme; only tag genuinely scoped ones.
          const scope = /(^|,)\s*(:root|html)\s*(,|$)/.test(sel) ? '' : ` @${sel.trim().slice(0, 40)}`;
          vars[prop + scope] = rule.style.getPropertyValue(prop).trim().slice(0, 160);
        }
      }
      if (/:hover|:focus-visible|:focus|:active|\[aria-selected|\[data-state/.test(sel) && interaction.length < 60) {
        const t = rule.style.cssText;
        if (/color|background|shadow|transform|opacity|border|outline|text-decoration|scale|translate/.test(t)) {
          interaction.push(`${sel.slice(0, 90)} { ${t.slice(0, 220)} }`);
        }
      }
    }
  };
  for (const sheet of document.styleSheets) {
    try { walkRules(sheet.cssRules); sheetStatus.read++; continue; } catch {}
    if (!sheet.href) continue;
    try {
      const css = await (await fetch(sheet.href)).text();
      const cs = new CSSStyleSheet(); cs.replaceSync(css.replace(/@import\s+(url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g, ''));
      walkRules(cs.cssRules); sheetStatus.refetched++;
    } catch { sheetStatus.unreadable.push(sheet.href); }
  }
  // Computed style on <html> resolves var() references: show "raw → resolved" so the
  // semantic layer and the primitive it points at are read together. Vars set only via
  // inline style / JS appear here too.
  const rootCS = getComputedStyle(document.documentElement);
  for (const prop of rootCS) {
    if (!prop.startsWith('--')) continue;
    const resolved = rootCS.getPropertyValue(prop).trim().slice(0, 160);
    if (prop in vars) { if (resolved && resolved !== vars[prop] && vars[prop].includes('var(')) vars[prop] += ' → ' + resolved; }
    else if (Object.keys(vars).length < 700) vars[prop] = resolved;
  }
  // Group authored tokens by what they are, so primitives vs semantics are obvious.
  const groups = { color: {}, type: {}, space: {}, radius: {}, shadow: {}, motion: {}, layout: {}, other: {} };
  for (const [k, v] of Object.entries(vars)) {
    if (!v) continue;
    const g = /font|text|leading|line-height|tracking|letter/.test(k) ? 'type'
      : /space|spacing|gap|gutter|inset|padding|margin/.test(k) ? 'space'
      : /radius|rounded|corner/.test(k) ? 'radius'
      : /shadow|elevation/.test(k) ? 'shadow'
      : /ease|duration|transition|timing|motion|anim/.test(k) ? 'motion'
      : /width|container|breakpoint|screen|max-w|z-index|^--z/.test(k) ? 'layout'
      : /color|bg|background|fg|border|surface|ink|brand|accent|primary|secondary|neutral|gray|grey/.test(k) || /^(#|rgb|hsl|oklch|lab|color\(|light-dark)/.test(v) ? 'color'
      : 'other';
    groups[g][k] = v;
  }

  const loadedFonts = new Set();
  try { document.fonts.forEach((f) => f.status === 'loaded' && loadedFonts.add(`${f.family.replace(/["']/g, '')} ${f.weight} ${f.style}`)); } catch {}

  // ---------- component samples ----------
  const pick = (el) => {
    const cs = getComputedStyle(el);
    const c = parseColor(cs.backgroundColor), t = parseColor(cs.color);
    const r = el.getBoundingClientRect();
    return {
      el: label(el), w: Math.round(r.width), h: Math.round(r.height),
      bg: c ? toHex(c) : 'transparent', bgImage: cs.backgroundImage === 'none' ? null : hexify(cs.backgroundImage).slice(0, 120),
      color: t ? toHex(t) : null, font: `${cs.fontSize}/${cs.lineHeight} ${cs.fontWeight}`, ls: cs.letterSpacing,
      pad: cs.padding, radius: fullRadius(cs.borderRadius), border: cs.borderStyle === 'none' ? null : hexify(cs.border),
      shadow: cs.boxShadow === 'none' ? null : hexify(cs.boxShadow),
      backdrop: cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : null,
      transition: cs.transitionDuration === '0s' ? null : `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`,
    };
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const sampleOf = (sel, n = 6) => {
    const seen = new Set(), out = [];
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el) || el.closest(NOISE)) continue;
      const s = pick(el), key = `${s.bg}|${s.color}|${s.radius}|${s.font}|${s.pad}|${s.border}`;
      if (seen.has(key)) continue;
      seen.add(key); out.push(s);
      if (out.length >= n) break;
    }
    return out;
  };
  const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].flatMap((h) => sampleOf(h, 2).map((s) => ({ tag: h, ...s })));

  const body = getComputedStyle(document.body);
  return (window.__dd = {
    page: { url: location.href, title: document.title, viewport: `${vw}x${vh}`, dpr: devicePixelRatio, scrollHeight: document.documentElement.scrollHeight, elements: count, colorScheme: rootCS.colorScheme || 'normal', prefersDark: matchMedia('(prefers-color-scheme: dark)').matches, sheets: sheetStatus },
    base: { htmlBg: rootCS.backgroundColor, bodyBg: body.backgroundColor, bodyColor: body.color, bodyFont: `${body.fontSize}/${body.lineHeight} ${body.fontWeight} ${body.fontFamily}`, smoothing: body.webkitFontSmoothing, featureSettings: body.fontFeatureSettings },
    colors: { background: withTint(top(bg)), text: withTint(top(text)), border: withTint(top(border, 12)), ringBorders: withTint(top(rings, 8)), gradients: top(gradients, 8) },
    typography: { families: top(families, 6), weights: top(weights, 10), styles: top(type, 30), headings, fontFaces: top(fontFaces, 24).map((x) => x.value), loadedFonts: [...loadedFonts].slice(0, 24) },
    shape: { radii: top(radii, 14), shadows: top(shadows, 10) },
    space: { spacing: top(spacing, 20).map((x) => ({ px: x.value, count: x.count })), gaps: top(gaps, 12) },
    motion: { transitions: top(transitions, 12), easings: top(easings, 8), durations: top(durations, 8), animations: top(animations, 8), keyframes, interactionRules: interaction },
    effects: { filters: top(filters, 8), blendModes: top(blends, 5).map((x) => x.value), opacities: top(opacities, 8).map((x) => x.value) },
    layout: { maxWidths: top(maxWidths, 10), breakpoints: top(media, 20).map((x) => `${x.value} (×${x.count})`) },
    components: {
      buttons: sampleOf('button, [role=button], a[class*=btn], a[class*=button], a[class*=Button], a[class*=cta], input[type=submit]', 12),
      links: sampleOf('p a, li a, nav a', 6),
      inputs: sampleOf('input:not([type=hidden]):not([type=submit]), textarea, select', 4),
      header: sampleOf('header, [role=banner], nav', 2),
      footer: sampleOf('footer', 1),
      cards: sampleOf('[class*=card], [class*=Card], article, [class*=tile]', 6),
      badges: sampleOf('[class*=badge], [class*=tag], [class*=pill], [class*=chip]', 5),
    },
    authoredTokens: groups,
  });
})()
