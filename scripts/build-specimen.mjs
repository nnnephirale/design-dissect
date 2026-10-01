#!/usr/bin/env node
// design-dissect specimen: renders tokens.css (+ components.html) into specimen.html,
// with the source screenshots alongside, so wrong tokens are visible at a glance.
//
//   node build-specimen.mjs <outDir>
//
// The page itself is styled with the semantic aliases (--canvas, --ink, --font-sans…),
// so it reads as the dissected system rather than a neutral viewer.
import { readFileSync, writeFileSync, existsSync, readdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] || './design-dissect-out';
const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '');
const tokens = read('tokens.css');
if (!tokens) { console.error(`no tokens.css in ${dir}`); process.exit(1); }
const components = read('components.html');
const design = read('DESIGN.md');
const title = (design.match(/^#\s+(.+)$/m) || [, 'Design specimen'])[1];
const mood = (design.match(/^>\s+(.+)$/m) || [, ''])[1];
const bands = readdirSync(dir).filter((f) => /^band-\d+\.png$/.test(f)).slice(0, 6);
const blockmap = existsSync(join(dir, 'blockmap.png'));
const shader = existsSync(join(dir, 'shader', 'index.html'));
// Feedback shared in conversation, shown as comment cards on the section it's about.
let feedback = [];
try { feedback = JSON.parse(read('feedback.json') || '[]'); } catch { console.error('feedback.json is not valid JSON; skipping comments'); }
// Author name for new comments: whoever (other than Claude) has commented most; else "You".
const authors = feedback.map((f) => f.author).filter((a) => a && a !== 'Claude');
const me = authors.sort((a, b) => authors.filter((x) => x === b).length - authors.filter((x) => x === a).length)[0] || 'You';
const feedbackJs = readFileSync(new URL('./specimen-feedback.js', import.meta.url), 'utf8');
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
  .compo{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px;align-items:start}
  .compo img{width:100%;display:block;border-radius:10px;box-shadow:0 0 0 1px var(--line,#ddd)}
  .compo .bands{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
  iframe.tex{width:100%;height:560px;border:0;border-radius:16px;box-shadow:0 0 0 1px var(--line,#ddd)}
  /* feedback: a faint ] beside the section, card at 50% until hovered */
  .wrap.notes{max-width:1560px;padding-right:380px}
  .fb-host{position:relative}
  .fb-br{position:absolute;right:-22px;top:0;bottom:0;width:7px;border:1.5px solid #5f6368;border-left:0;border-radius:0 3px 3px 0;opacity:.18;cursor:pointer;transition:opacity .3s cubic-bezier(.16,1,.3,1)}
  .fb-br::before{content:'';position:absolute;left:-6px;right:-10px;top:0;bottom:0}
  .fb-stack{position:absolute;left:calc(100% + 44px);top:0;bottom:0;width:320px;opacity:.5;transition:opacity .3s cubic-bezier(.16,1,.3,1)}
  .fb-stack .fb-in{position:sticky;top:24px;display:flex;flex-direction:column;gap:10px}
  .fb-host.fb-on>.fb-br{opacity:.7}
  .fb-host.fb-on>.fb-stack{opacity:1}
  .gc{position:relative;font:400 14px/1.45 Roboto,'Google Sans',Arial,sans-serif;color:#1f1f1f;background:#f1f1f1;border-radius:12px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(60,64,67,.25),0 1px 3px 1px rgba(60,64,67,.12);text-align:left;letter-spacing:.1px}
  .gc .hd{display:flex;align-items:center;gap:10px}
  .gc .av{width:32px;height:32px;border-radius:50%;flex:none;display:grid;place-items:center;font:500 14px Roboto,Arial,sans-serif;color:#fff}
  .gc .who{flex:1;min-width:0}.gc .who b{display:block;font-weight:500;font-size:14px;line-height:1.3}.gc .who span{color:#444746;font-size:12px}
  .gc .ic{width:30px;height:30px;display:grid;place-items:center;border:0;background:transparent;border-radius:50%;color:#0b57d0;cursor:pointer;padding:0;transition:background-color .2s cubic-bezier(.16,1,.3,1)}
  .gc .ic:hover{background:rgba(0,0,0,.07)}.gc .ic:active{transform:scale(.94)}
  .gc .ic.k{color:#444746}.gc .ic.done{color:#146c2e}
  .gc.is-done .tx,.gc.is-done .qt{color:#5f6368}
  .gc .qt{margin:10px 0 0;padding-left:8px;border-left:3px solid #e6c34a;color:#444746;font-size:12.5px}
  .gc .tx{margin:10px 0 0;white-space:pre-wrap}.gc .tx .m{color:#0b57d0}
  .gc textarea{display:block;width:100%;margin:10px 0 0;min-height:40px;resize:none;overflow:hidden;border:1px solid #747775;border-radius:8px;padding:8px 10px;font:inherit;color:#1f1f1f;background:#fff;outline:none}
  .gc textarea:focus{border-color:#0b57d0;box-shadow:0 0 0 1px #0b57d0}
  .gc .ed{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
  .gb{font:500 14px Roboto,Arial,sans-serif;border:0;border-radius:999px;padding:8px 16px;cursor:pointer}
  .gb.p{background:#0b57d0;color:#fff}.gb.t{background:transparent;color:#0b57d0}.gb:active{transform:scale(.98)}
  .gc .rp{margin-top:12px;padding-top:12px;border-top:1px solid rgba(0,0,0,.08)}
  .gc .ft{margin-top:8px;color:#5f6368;font-size:9.5px;line-height:1.35;letter-spacing:.1px}
  .gm{position:absolute;z-index:5;background:#fff;border-radius:8px;padding:6px 0;min-width:120px;box-shadow:0 2px 6px 2px rgba(60,64,67,.15),0 1px 2px rgba(60,64,67,.3)}
  .gm button{display:block;width:100%;text-align:left;border:0;background:none;font:400 14px Roboto,Arial,sans-serif;color:#1f1f1f;padding:8px 16px;cursor:pointer}.gm button:hover{background:#f1f1f1}
  .fb-host:focus-within>.fb-stack{opacity:1}
  mark.fb-q{background:rgba(252,212,82,.45);color:inherit;border-radius:2px;box-shadow:0 2px 0 rgba(230,180,40,.55)}mark.fb-q.done{background:transparent;box-shadow:none}
  .fb-plus{position:absolute;z-index:40;width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;background:#fff;color:#444746;cursor:pointer;opacity:0;pointer-events:none;transform:scale(.9);transition:opacity .2s cubic-bezier(.16,1,.3,1),transform .2s cubic-bezier(.16,1,.3,1);box-shadow:0 1px 3px rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)}
  .fb-plus.on{opacity:1;pointer-events:auto;transform:none}.fb-plus:hover{color:#0b57d0}
  .fb-pill{position:fixed;left:50%;bottom:24px;z-index:50;transform:translate(-50%,16px);opacity:0;pointer-events:none;background:rgba(24,24,24,.84);color:#f4f4f4;backdrop-filter:blur(12px);border-radius:999px;padding:9px 18px;font:400 13px Roboto,Arial,sans-serif;transition:transform .45s cubic-bezier(.16,1,.3,1),opacity .35s cubic-bezier(.16,1,.3,1)}
  .fb-pill.on{transform:translate(-50%,0);opacity:1;pointer-events:auto}.fb-pill u{cursor:pointer}
  @media (max-width:1180px){.wrap.notes{padding-right:24px}.fb-stack{position:static;width:auto;margin-top:16px;opacity:1}.fb-stack .fb-in{position:static}.fb-br{display:none}}
  @media (max-width:700px){.compo{grid-template-columns:1fr}.compare{grid-template-columns:1fr}.type-row{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
<header class="sp"><h1>${esc(title)}</h1><p>${esc(mood)}</p></header>
${shots.length ? `<section class="sp" id="s-source"><h2>Source</h2><div class="compare">${shots.slice(0, 2).map((s) => `<img src="${s}" alt="${s}">`).join('')}</div></section>` : ''}
<section class="sp" id="s-semantic"><h2>Surfaces &amp; ink (semantic)</h2><div class="grid" id="semantic"></div></section>
<section class="sp" id="s-palette"><h2>Palette (primitives)</h2><div class="grid" id="palette"></div></section>
<section class="sp" id="s-type"><h2>Type scale</h2><div id="type"></div></section>
<section class="sp" id="s-shape"><h2>Radius &amp; depth</h2><div class="shapes" id="shapes"></div></section>
<section class="sp" id="s-space"><h2>Spacing</h2><div class="bars" id="space"></div></section>
${bands.length || blockmap ? `<section class="sp" id="s-composition"><h2>Composition</h2><div class="compo">${blockmap ? `<img class="bm" src="blockmap.png" alt="block map">` : ''}<div class="bands">${bands.map((b) => `<img src="${b}" alt="${b}">`).join('')}</div></div></section>` : ''}
${shader ? `<section class="sp" id="s-textures"><h2>Textures</h2><iframe class="tex" src="shader/index.html" title="texture shader"></iframe></section>` : ''}
${components ? `<section class="sp" id="s-components"><h2>Components</h2><div class="comp">${components}</div></section>` : ''}
${shots.includes('shot-desktop-full.png') ? `<section class="sp"><h2>Source, full page</h2><details class="sp"><summary>Show full-page screenshot</summary><img src="shot-desktop-full.png" style="width:100%;border-radius:12px;margin-top:12px" alt="full page"></details></section>` : ''}
</div>
<script id="feedback" type="application/json" data-me="${esc(me)}">${JSON.stringify(feedback).replace(/</g, '\\u003c')}</script>
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
${feedbackJs}
</script>
</body></html>`;

writeFileSync(join(dir, 'specimen.html'), html);
console.log(`wrote ${join(dir, 'specimen.html')}${components ? '' : ' (no components.html found: component section skipped)'}`);

// Double-click launcher: opens the specimen with comments saving to feedback.json, starting the
// design-feedback service quietly in the background if it isn't already running.
const server = fileURLToPath(new URL('../feedback/server.mjs', import.meta.url));
writeFileSync(join(dir, 'STARTTHIS.command'), `#!/bin/bash
# Double-click to open this specimen. Comments you leave on it save to feedback.json.
# Starts the design-feedback service in the background if needed (it stops at restart).
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
HERE="$(cd "$(dirname "$0")" && pwd -P)"; PAGE="$HERE/specimen.html"; PORT=4777
covered() { curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: text/plain' --data "{\\"file\\":\\"$PAGE\\"}" "http://localhost:$PORT/__feedback" | grep -q 200; }
if ! covered && ! curl -sf "http://localhost:$PORT/__health" >/dev/null; then
  for s in ${JSON.stringify(server)} "$HOME/.claude/skills/design-dissect/feedback/server.mjs" "$HOME/.codex/skills/design-dissect/feedback/server.mjs"; do [ -f "$s" ] && SERVER="$s" && break; done
  # Run outside this Terminal window so closing it leaves the service running.
  [ -n "$SERVER" ] && osascript -e "do shell script \\"DESIGN_LIBRARY='$(dirname "$HERE")' nohup '$(command -v node)' '$SERVER' >/tmp/design-feedback.log 2>&1 &\\"" >/dev/null
  for _ in $(seq 1 40); do covered && break; sleep 0.25; done
fi
if covered; then open "http://localhost:$PORT/__open?file=$(node -p 'encodeURIComponent(process.argv[1])' "$PAGE")"; else open "$PAGE"; fi
(sleep 0.5; osascript -e 'tell application "Terminal" to close (every window whose name contains "STARTTHIS")' >/dev/null 2>&1) &
exit 0
`);
chmodSync(join(dir, 'STARTTHIS.command'), 0o755);
