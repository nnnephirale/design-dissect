#!/usr/bin/env node
// design-dissect specimen: renders tokens.css (+ components.html) into specimen.html,
// with the source screenshots alongside, so wrong tokens are visible at a glance.
//
//   node build-specimen.mjs <outDir>
//
// The page itself is styled with the semantic aliases (--canvas, --ink, --font-sans…),
// so it reads as the dissected system rather than a neutral viewer.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || './design-dissect-out';
const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
const tokens = read('tokens.css');
if (!tokens) { console.error(`no tokens.css in ${dir}`); process.exit(1); }
const components = read('components.html');
const design = read('DESIGN.md');
const title = (design.match(/^#\s+(.+)$/m) || [, 'Design specimen'])[1];
const mood = (design.match(/^>\s+(.+)$/m) || [, ''])[1];
const shots = ['shot-desktop-fold.png', 'shot-mobile-fold.png', 'shot-desktop-full.png'].filter((f) => existsSync(join(dir, f)));
const esc = (s) => s.replace(/</g, '&lt;');
// Inline <style> can't hold @import after other rules; hoist any @import lines.
// Match url(...) as a unit: Google Fonts URLs contain ';' (wght@400;500).
const IMPORT = /@import\s+(url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g;
const imports = (tokens.match(IMPORT) || []).join('\n');
const body = tokens.replace(IMPORT, '');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · specimen</title>
<style>${imports}</style>
<style id="tokens">${body}</style>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:var(--canvas,#fff);color:var(--ink,#111);font-family:var(--font-sans,system-ui);font-size:var(--text-body,16px);line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1200px;margin:0 auto;padding:48px 24px 96px}
  header.sp{margin-bottom:48px}
  header.sp h1{font-family:var(--font-display,inherit);font-size:28px;font-weight:var(--weight-display,500);letter-spacing:-0.02em;margin:0 0 4px}
  header.sp p{margin:0;color:var(--ink-muted,#666)}
  section.sp{margin:56px 0}
  section.sp>h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-muted,#666);margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid var(--line,#e5e5e5)}
  .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
  .sw{border-radius:var(--radius-card,12px);overflow:hidden;background:var(--surface,#fff);box-shadow:var(--ring,0 0 0 1px rgba(0,0,0,.08))}
  .sw i{display:block;height:72px}
  .sw div{padding:8px 10px;font-size:12px;line-height:1.35}
  .sw b{display:block;font-weight:600}
  .sw span{color:var(--ink-muted,#666);font-family:var(--font-mono,monospace);font-size:11px;word-break:break-all}
  .type-row{display:grid;grid-template-columns:180px 1fr;gap:16px;align-items:baseline;padding:12px 0;border-bottom:1px solid var(--line,#eee)}
  .type-row code,.meta{font-family:var(--font-mono,monospace);font-size:11px;color:var(--ink-muted,#666)}
  .type-row .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bars div{display:flex;align-items:center;gap:12px;margin:4px 0;font-size:12px}
  .bars i{display:block;height:12px;background:var(--accent,#888);border-radius:2px}
  .shapes{display:flex;flex-wrap:wrap;gap:16px}
  .shapes div{width:120px;height:88px;background:var(--surface,#fff);display:flex;align-items:flex-end;padding:8px;font-size:11px;font-family:var(--font-mono,monospace);color:var(--ink-muted,#666)}
  .compare{display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start}
  .compare img{width:100%;border-radius:12px;box-shadow:0 0 0 1px var(--line,#ddd)}
  .comp>[data-label]{margin:0 0 32px}
  .comp>.cap{font-size:11px;font-family:var(--font-mono,monospace);color:var(--ink-muted,#666);margin-bottom:8px}
  details.sp summary{cursor:pointer;color:var(--ink-muted,#666);font-size:13px}
  @media (max-width:700px){.compare{grid-template-columns:1fr}.type-row{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
<header class="sp"><h1>${esc(title)}</h1><p>${esc(mood)}</p></header>
${shots.length ? `<section class="sp"><h2>Source</h2><div class="compare">${shots.slice(0, 2).map((s) => `<img src="${s}" alt="${s}">`).join('')}</div></section>` : ''}
<section class="sp"><h2>Surfaces &amp; ink (semantic)</h2><div class="grid" id="semantic"></div></section>
<section class="sp"><h2>Palette (primitives)</h2><div class="grid" id="palette"></div></section>
<section class="sp"><h2>Type scale</h2><div id="type"></div></section>
<section class="sp"><h2>Radius &amp; depth</h2><div class="shapes" id="shapes"></div></section>
<section class="sp"><h2>Spacing</h2><div class="bars" id="space"></div></section>
${components ? `<section class="sp"><h2>Components</h2><div class="comp">${components}</div></section>` : ''}
${shots.includes('shot-desktop-full.png') ? `<section class="sp"><h2>Source, full page</h2><details class="sp"><summary>Show full-page screenshot</summary><img src="shot-desktop-full.png" style="width:100%;border-radius:12px;margin-top:12px" alt="full page"></details></section>` : ''}
</div>
<script>
// Captions go before each block (a ::before would become a flex/grid item inside it).
document.querySelectorAll('.comp > [data-label]').forEach((el) => { const c = document.createElement('div'); c.className = 'cap'; c.textContent = el.dataset.label; el.before(c); });
const sheet = document.getElementById('tokens').sheet;
const names = [];
const walk = (rules) => { for (const r of rules) { if (r.cssRules) walk(r.cssRules); if (/(^|,)\s*:root\s*(,|$)/.test(r.selectorText || '')) for (const p of r.style) if (p.startsWith('--') && !names.includes(p)) names.push(p); } };
walk(sheet.cssRules);
const root = getComputedStyle(document.documentElement);
const val = (n) => root.getPropertyValue(n).trim();
const probe = document.createElement('i'); document.body.append(probe);
const resolved = (n) => { probe.style.color = ''; probe.style.color = 'var(' + n + ')'; return getComputedStyle(probe).color; };
const isColor = (n) => { const v = val(n); return /^(#|rgb|hsl|oklch|oklab|lab|lch|color\\(|light-dark|var\\(--color)/.test(v) || (/^var\\(/.test(v) && /canvas|surface|band|ink|line|accent|action|focus/.test(n)); };
const tintOf = (c) => { const m = c.match(/\\d+(\\.\\d+)?/g); if (!m) return ''; const [r,g,b] = m.map(Number); const s = Math.max(r,g,b)-Math.min(r,g,b); return s>24?'':s<=1?'neutral':r>b?'warm':'cool'; };
const sw = (n) => { const c = resolved(n); return '<div class="sw"><i style="background:var(' + n + ')"></i><div><b>' + n.replace(/^--(color-)?/, '') + '</b><span>' + val(n) + (val(n).startsWith('var') ? ' → ' + c : '') + ' ' + tintOf(c) + '</span></div></div>'; };
const semantic = ['--canvas','--surface','--surface-sunken','--band','--ink','--ink-muted','--ink-faint','--ink-on-dark','--line','--accent','--action','--action-ink','--focus'].filter((n) => val(n));
document.getElementById('semantic').innerHTML = semantic.map(sw).join('');
document.getElementById('palette').innerHTML = names.filter((n) => n.startsWith('--color') && isColor(n)).map(sw).join('');
const texts = names.filter((n) => /^--text-/.test(n));
document.getElementById('type').innerHTML = texts.map((n) => { const k = n.slice(7); const lh = val('--leading-' + k), tr = val('--tracking-' + k), w = val('--weight-' + k); const fam = /display|h1|h2|hero/.test(k) ? 'var(--font-display, var(--font-sans))' : 'var(--font-sans)';
  return '<div class="type-row"><code>' + k + '<br>' + val(n) + (w ? ' · ' + w : '') + (lh ? ' / ' + lh : '') + (tr ? ' · ' + tr : '') + '</code><div class="s" style="font-family:' + fam + ';font-size:var(' + n + ');' + (lh ? 'line-height:' + lh + ';' : '') + (tr ? 'letter-spacing:' + tr + ';' : '') + (w ? 'font-weight:' + w + ';' : '') + '">The quick brown fox jumps over the lazy dog</div></div>'; }).join('');
const radii = names.filter((n) => /^--radius-/.test(n)), shadows = names.filter((n) => /^--(shadow-|ring)/.test(n));
document.getElementById('shapes').innerHTML = radii.map((n) => '<div style="border-radius:var(' + n + ');box-shadow:var(--ring,0 0 0 1px rgba(0,0,0,.1))">' + n.slice(9) + ' ' + val(n) + '</div>').join('') + shadows.map((n) => '<div style="border-radius:var(--radius-card,12px);box-shadow:var(' + n + ')">' + n.slice(2) + '</div>').join('');
const spaces = names.filter((n) => /^--space-/.test(n)).map((n) => [n, parseFloat(val(n))]).filter(([, v]) => v).sort((a, b) => a[1] - b[1]);
document.getElementById('space').innerHTML = spaces.map(([n, v]) => '<div><i style="width:' + v + 'px"></i><span class="meta">' + n.slice(8) + ' · ' + val(n) + '</span></div>').join('');
</script>
</body></html>`;

writeFileSync(join(dir, 'specimen.html'), html);
console.log(`wrote ${join(dir, 'specimen.html')}${components ? '' : ' (no components.html found: component section skipped)'}`);
