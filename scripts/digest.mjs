#!/usr/bin/env node
// design-dissect digest: condenses measure-*.json (from run.mjs, or saved by hand
// from extract.js) into one readable summary, and diffs desktop↔mobile and
// light↔dark so fluid type and real dark modes jump out.
//
//   node digest.mjs <outDir>            → prints digest, also writes <outDir>/digest.md
//
// Read the digest first; open the raw JSON only for a specific field you need.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || './design-dissect-out';
const files = readdirSync(dir).filter((f) => /^measure-.*\.json$/.test(f));
if (!files.length) { console.error(`no measure-*.json in ${dir}`); process.exit(1); }
const runs = Object.fromEntries(files.map((f) => [f.replace(/^measure-|\.json$/g, ''), JSON.parse(readFileSync(join(dir, f), 'utf8'))]));
const main = runs.desktop || Object.values(runs)[0];

const out = [];
const h = (s) => out.push(`\n## ${s}`);
const line = (s) => out.push(s);
const list = (arr, fmt, n = 10) => arr.slice(0, n).forEach((x) => line('- ' + fmt(x)));
const pct = (arr) => { const t = arr.reduce((n, x) => n + x.weight, 0) || 1; return (x) => Math.round((x.weight / t) * 100) + '%'; };

line(`# Measurement digest — ${main.page.title}`);
line(`${main.page.url} · runs: ${Object.keys(runs).join(', ')} · sheets ${JSON.stringify(main.page.sheets)}`);
line(`base: html ${main.base.htmlBg} · body ${main.base.bodyBg} · text ${main.base.bodyColor} · ${main.base.bodyFont}`);
line(`color-scheme: ${main.page.colorScheme} · font smoothing: ${main.base.smoothing || 'auto'} · font-feature-settings: ${main.base.featureSettings}`);

h('Colour — surfaces (by painted area)');
const bp = pct(main.colors.background);
list(main.colors.background, (x) => `${x.value} ${x.tint || ''} ${bp(x)} — e.g. ${x.samples[0] || ''}`, 12);
h('Colour — text (by characters)');
const tp = pct(main.colors.text);
list(main.colors.text, (x) => `${x.value} ${x.tint || ''} ${tp(x)} — e.g. ${x.samples[0] || ''}`, 10);
h('Colour — borders & 1px rings');
list(main.colors.border, (x) => `${x.value} ${x.tint || ''} ×${x.count}`, 8);
list(main.colors.ringBorders, (x) => `ring (box-shadow) ${x.value} ${x.tint || ''} ×${x.count}`, 6);
if (main.colors.gradients.length) { h('Gradients'); list(main.colors.gradients, (x) => `${x.value.slice(0, 160)} — ${x.samples[0] || ''}`, 5); }

h('Typography');
line('families: ' + main.typography.families.map((x) => x.value.split(',').slice(0, 2).join(',')).join(' · '));
const wp = pct(main.typography.weights);
line('weights: ' + main.typography.weights.map((x) => `${x.value} ${wp(x)}`).join(' · '));
line('styles (family | size | weight | line-height | tracking), by characters:');
list(main.typography.styles, (x) => `${x.value}  ×${x.count} — ${x.samples[0] || ''}`, 18);
line('headings: ' + main.typography.headings.map((x) => `${x.tag} ${x.font} ls ${x.ls} ${x.color}`).join(' ; '));
if (main.typography.fontFaces.length) line('@font-face: ' + [...new Set(main.typography.fontFaces)].slice(0, 12).join(' · '));

if (runs.desktop && runs.mobile) {
  h('Desktop → mobile (fluid / responsive type)');
  const sizes = (r) => r.typography.headings.map((x) => `${x.tag} ${x.font.split('/')[0]}`);
  line('desktop headings: ' + sizes(runs.desktop).join(', '));
  line('mobile  headings: ' + sizes(runs.mobile).join(', '));
  const topSizes = (r) => r.typography.styles.slice(0, 8).map((x) => x.value.split(' | ')[1]).join(', ');
  line(`top text sizes desktop: ${topSizes(runs.desktop)}  |  mobile: ${topSizes(runs.mobile)}`);
}

h('Shape');
line('radii: ' + main.shape.radii.map((x) => `${x.value} ×${x.count}`).join(' · '));
line('shadows:');
list(main.shape.shadows, (x) => `${x.value.slice(0, 200)} ×${x.count} — ${x.samples[0] || ''}`, 6);

h('Space & layout');
line('padding/margin px (by frequency): ' + main.space.spacing.map((x) => `${x.px}×${x.count}`).join(' '));
line('gaps: ' + main.space.gaps.map((x) => `${x.value}×${x.count}`).join(' '));
line('max-widths: ' + main.layout.maxWidths.map((x) => `${x.value}×${x.count}`).join(' '));
line('media queries: ' + main.layout.breakpoints.slice(0, 12).join(' ; '));

h('Motion & effects');
line('durations: ' + main.motion.durations.map((x) => `${x.value}×${x.count}`).join(' ') + ' · easings: ' + main.motion.easings.map((x) => `${x.value}×${x.count}`).join(' '));
list(main.motion.transitions, (x) => `${x.value} ×${x.count} — ${x.samples[0] || ''}`, 6);
if (main.motion.animations.length) list(main.motion.animations, (x) => `animation ${x.value} ×${x.count}`, 4);
if (main.effects.filters.length) line('filters: ' + main.effects.filters.map((x) => `${x.value}×${x.count}`).join(' · '));
if (main.effects.blendModes.length) line('blend modes: ' + main.effects.blendModes.join(', '));
line('interaction rules (hover/focus/active):');
list(main.motion.interactionRules, (x) => x, 14);

h('Component samples');
for (const [k, arr] of Object.entries(main.components)) {
  if (!arr.length) continue;
  line(`**${k}**`);
  list(arr, (x) => `${x.el.slice(0, 60)} → bg ${x.bg} · color ${x.color} · ${x.font} · pad ${x.pad} · r ${x.radius}${x.border ? ' · border ' + x.border : ''}${x.shadow ? ' · shadow ' + x.shadow.slice(0, 80) : ''}${x.backdrop ? ' · ' + x.backdrop : ''}${x.transition ? ' · ' + x.transition : ''}`, 12);
}

h('Authored tokens (the site\'s own CSS custom properties)');
const at = main.authoredTokens;
line('counts: ' + Object.entries(at).map(([k, v]) => `${k} ${Object.keys(v).length}`).join(' · '));
const semantic = (k) => /(action|primary|secondary|surface|bg|background|fg|text|border|focus|hover|active|disabled|accent|brand|muted|subtle|danger|success|warning|overlay)/.test(k);
for (const [g, vars] of Object.entries(at)) {
  const entries = Object.entries(vars);
  if (!entries.length) continue;
  // Semantic names first: they encode intent (what a colour is FOR), primitives just list the palette.
  line(`**${g}** (${entries.length})`);
  if (g === 'color') {
    entries.filter(([k]) => semantic(k)).slice(0, 70).forEach(([k, v]) => line(`- ${k}: ${v}`));
    // Primitives (the raw palette) on compact lines: they matter, but the roles above matter more.
    const prim = entries.filter(([k]) => !semantic(k)).map(([k, v]) => `${k.replace(/^--/, '')} ${v.split(' → ').pop()}`);
    for (let i = 0; i < Math.min(prim.length, 120); i += 8) line('  primitives: ' + prim.slice(i, i + 8).join(' · '));
  } else {
    // Named roles (--font-size-heading-large) first; numeric scale steps (--font-size-24, --space-4x) compact.
    const step = ([k]) => /-\d+(_\d+)?x?$/.test(k);
    entries.filter((e) => !step(e)).slice(0, 45).forEach(([k, v]) => line(`- ${k}: ${v}`));
    const steps = entries.filter(step).map(([k, v]) => `${k.replace(/^--/, '')} ${v.split(' → ').pop().replace(/calc\((\d+(\.\d+)?) \/ (var\(--rem\)|16) \* 1rem\)/g, '$1px')}`);
    for (let i = 0; i < Math.min(steps.length, 60); i += 10) line('  steps: ' + steps.slice(i, i + 10).join(' · '));
  }
}
const lightDark = Object.values(at).flatMap((g) => Object.values(g)).filter((v) => /light-dark\(/.test(v)).length;
const darkScopes = Object.keys(Object.assign({}, ...Object.values(at))).filter((k) => /@.*(dark|theme)/i.test(k)).length;

if (runs['desktop-dark']) {
  h('Light → dark');
  const a = runs.desktop.colors.background.slice(0, 5).map((x) => x.value).join(' ');
  const b = runs['desktop-dark'].colors.background.slice(0, 5).map((x) => x.value).join(' ');
  const forced = runs['desktop-dark'].page.colorScheme.trim() === 'light';
  line(forced ? `Page forces color-scheme: light, so prefers-color-scheme: dark changes nothing visible. Any dark palette lives only in the authored tokens below.`
    : a === b ? `No visible change under prefers-color-scheme: dark (surfaces ${a}).` : `light surfaces: ${a}\ndark  surfaces: ${b}`);
}
line(`\nDark-mode tokens authored: ${lightDark} light-dark() values, ${darkScopes} dark-scoped vars.`);

// ---------- composition ----------
let comp = null;
try { comp = JSON.parse(readFileSync(join(dir, 'compose-desktop.json'), 'utf8')); } catch {}
if (comp) {
  h('Composition — band sequence (top → bottom, desktop)');
  const total = comp.bands.reduce((n, b) => n + b.h, 0) || 1;
  comp.bands.forEach((b) => {
    const lead = (b.text || []).slice(0, 3).map((t) => `${t.size}px ${t.color} @x${t.x} "${t.text.slice(0, 26)}"`).join(' · ');
    line(`- ${b.i}. ${b.fill.slice(0, 70)} · ${b.h}px (${b.hVh} vh, ${Math.round((b.h / total) * 100)}% of page)${b.shot ? ' · ' + b.shot : ''}${lead ? '\n    text: ' + lead : ''}`);
    (b.rows || []).forEach((r) => line(`    row: split ${r.split} · ${r.h}px tall · spans ${Math.round(r.widthPct * 100)}% · gaps ${r.gaps.join('/') || '-'} · ${r.fills.join(' | ')}`));
  });
  h('Composition — panels (layering, bleed, type anatomy)');
  comp.panels.filter((p) => p.w * p.h > 60000).slice(0, 18).forEach((p, i) => {
    line(`- P${i + 1} (band ${p.band}) ${p.fill.slice(0, 60)} · ${p.w}×${p.h} (aspect ${p.aspect}) · r ${p.radius}${p.clips ? ' · clips' : ''}${p.shadow ? ' · shadow' : ''}${p.blur ? ' · ' + p.blur : ''}${p.ui ? ' · UI-mock' : ''}`);
    if (p.text) line(`    text column ${Math.round(p.text.column.x0 * 100)}–${Math.round(p.text.column.x1 * 100)}%: ${p.text.lead.slice(0, 3).join(' → ')}`);
    p.children.forEach((c, k) => line(`    ${k + 1}. ${c.fill.slice(0, 48)} at x${Math.round(c.at.x0 * 100)}–${Math.round(c.at.x1 * 100)}% y${Math.round(c.at.y0 * 100)}–${Math.round(c.at.y1 * 100)}% · ${c.w}×${c.h} r ${c.radius}${c.ui ? ' UI-mock' : ''}${c.bleeds.length ? ' · bleeds ' + c.bleeds.join('+') : ''}${c.overflows.length ? ' · overflows ' + c.overflows.join('+') : ''}${c.touches.length ? ' · flush ' + c.touches.join('+') : ''}`));
    if (p.overlaps?.length) line('    overlaps: ' + p.overlaps.join(' ; '));
  });
  // Texture candidates for the (cheap) shader check: non-flat fills on bands and panels.
  const tex = [];
  comp.bands.forEach((b) => { if (/^(gradient|pattern|video|image|canvas)/.test(b.fill)) tex.push(`band ${b.i} ${b.fill.slice(0, 50)}`); });
  const walk = (ps, where) => ps.forEach((p) => { if (/^(gradient|pattern|video|canvas)/.test(p.fill) && p.w * p.h > 20000) tex.push(`${where} ${p.fill.slice(0, 50)} ${p.w}×${p.h}`); walk(p.children || [], where + '›'); });
  walk(comp.panels, 'panel');
  h('Texture candidates (for the shader check)');
  line(tex.length ? tex.slice(0, 12).map((t) => '- ' + t).join('\n') + '\nImage fills may be photos: confirm against the band close-ups before calling anything a texture.' : 'None: flat fills only. Skip the shader offer.');
  line('\nView blockmap.png (abstract proportions) and each band-NN.png close-up before writing Composition.');
}

const text = out.join('\n');
writeFileSync(join(dir, 'digest.md'), text);
console.log(text);
