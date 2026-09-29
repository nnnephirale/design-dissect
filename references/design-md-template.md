# Output templates

Four files go in the output folder next to the measurements:
`DESIGN.md`, `tokens.css`, `tailwind-theme.css` and `components.html`. Then run
`build-specimen.mjs` to produce `specimen.html`.

Evidence tags used throughout: `[m]` measured, `[a]` authored token, `[i]` inferred.

---

## DESIGN.md: use this exact structure

```markdown
# <Site> — Design Language
> <one evocative line: the mood in under 8 words>

Source: <url(s)> · measured <YYYY-MM-DD> at 1440×900 and 390×844 · theme: light | dark | both · last revised <YYYY-MM-DD>
Evidence: [m] measured · [a] site's own token · [i] inferred

## Essence
<One paragraph, 4–6 sentences: what it feels like, what carries the emotion, where colour is
spent, how depth is made, what it refuses. Write it so a designer could sketch from it.>

## Signature moves
1. <The single most recognisable move, and why it works>
2. …  (3–5 total)

## Composition
(Read `reading-composition.md`. This is the most important section: it's where the feel lives.)
### Band sequence
| # | Fill | Height (vh · % of page) | Role |
|---|------|--------------------------|------|
Rhythm rule: <e.g. "warm-neutral rests, one saturated ground per ~1.5 vh, texture only as strips and plates">
### Grid & splits
<row patterns with ratios, gaps, spans, row-height ratios, shared edges, deliberate unevenness>
### Panel recipes
<2–5 named layer stacks, bottom → top, positions as % of the panel (ground · plate · mock · satellite · text)>
### Type anatomy per block
<eyebrow → headline (size, lines, measure) → body → CTA pair, per block type>
### Image vocabulary
<each image kind and the one place it's allowed>
### Pairings
<the contrasts it runs on: flat × texture, quiet UI × saturated ground …>
### Composition rules
- <relationships and ratios someone could break>

## Colour
Neutral/chroma ratio: ~<n>% neutral by area. Neutral temperature: warm | neutral | cool.

| Name | Value | Token | Role | Evidence |
|------|-------|-------|------|----------|
| <evocative name> | `#…` | `--color-…` | <exactly where it's used, and where it's not> | [m] <element> / [a] `--site-token` |

### Surface ladder
| Level | Value | Used for |
|-------|-------|----------|
| 0 canvas | … | … |

### Ink ladder
primary … · secondary … · tertiary … · on-dark … (with contrast vs canvas)

### Colour rules
- <e.g. "One chromatic fill: #421d24 is the only filled CTA; secondary actions are violet outline or lilac wash"> [m]

## Typography
Family: <name> ([m] loaded as …). Open substitute: <font> — <why it's the closest>. Premium alternates: <…>.
Weights in use: <w (share)> … Voice: <e.g. "whisper: 82% of text at 460, headlines never bolder than 540">

| Role | Size desktop → mobile | Weight | Line height | Tracking | Token |
|------|-----------------------|--------|-------------|----------|-------|
| display | 64 → 32px | 540 | 0.96 | 0 | `--text-display` |

Rules:
- Tracking curve: <…>
- <case, numerals, features>

## Space & layout
Base unit <n>px · density <compact|comfortable|roomy> · container <max-width> · gutters <…>
Scale: <4, 8, 12, 16, 24, 32, 48, 64, 96>
Breakpoints: <…> · Section rhythm: <…> · Full-bleed breakouts: <…>

## Shape & depth
Separation strategy: <borders | rings | layered shadows | tone | blur | imagery> — <one sentence>
| Element | Radius |   (and the ratio rule, e.g. "cards = 2× controls")
Borders/rings: <values>
Shadows: <full stacks, named>
Blur: <where, how much>

## Motion & interaction
Durations <…> · easing <…> · what animates <…>
Idioms: hover <…> · active <…> · focus <…> · entrances <…> · reduced-motion <…>

## Components
### <Component name>
**Role:** <what it's for>
Anatomy + exact values: bg, text, font, padding, height, radius, border/ring, shadow.
States: hover · active · focus · disabled. Evidence tag per value.
(Cover: primary / secondary / ghost buttons, link, nav/header, card, input (if present),
badge/tag, footer, any signature component. Mark missing ones "not present on source".)

## Textures (only if the texture check passed)
<per texture: look (palette stops, direction, softness, overlay) · where it's allowed · max coverage · pairing · motion. Omit the section entirely otherwise.>

## Imagery & iconography
Photography/illustration treatment, how UI mockups are presented, icon style (stroke, size).

## Dark mode
<Authored dark tokens as a table, or "not authored".>

## Do
- <rule> — <why it matters to the feel>
## Don't
- <refusal> — <why>

## Translating to app UI
What transfers as-is: <palette roles, weights, tracking, radius ratio, depth strategy, motion>
What compresses:
| Marketing value | App value |
|-----------------|-----------|
| display 64px | page title 24–28px, same weight/tracking curve |
| section gap 96px | 24–32px |
Signature moves in an app: <how each move survives in a denser UI, or why it doesn't>
Derived components (not on source): <table rows, sidebar, modal, input…: derived from which rules>

## Agent prompt guide
Quick reference: canvas … · ink … · muted … · line … · surface … · accent … · primary action …
3–5 ready-to-paste component prompts, each with exact values. They must agree with Components.

## Tokens
See `tokens.css` (CSS custom properties) and `tailwind-theme.css` (Tailwind v4 `@theme`).

## Open questions
- <what couldn't be measured, low-confidence inferences, what would settle them>
```

This file describes the reference only. User feedback about *taste* goes to the taste file or
the project's DESIGN-NOTES.md (see `feedback-and-taste.md`). Corrections to how the reference
was read are applied here, in place: no changelog section, because git keeps the history.

Consistency check before saving:
- Every value in Colour rules, Components, Do/Don't and the prompt guide exists in a token
  table.
- The prompt guide's "primary action" is the same as Components' primary button.
- Every "never" is backed across all runs; if there's a counterexample, write "rarely".

---

## tokens.css

Two layers: primitives named after the source's own tokens where they exist (otherwise an
evocative name), then **semantic aliases with these fixed names**. The specimen and the
apply step depend on these aliases.

```css
:root {
  /* primitives */
  --color-midnight-wine: #421d24;
  /* … */

  /* semantic aliases (fixed names) */
  --canvas: var(--color-…);        /* page background */
  --surface: var(--color-…);       /* raised card */
  --surface-sunken: var(--color-…);/* inset / pressed / selected wash */
  --band: var(--color-…);          /* dark or accent full-bleed band, if any */
  --ink: var(--color-…);           /* primary text */
  --ink-muted: var(--color-…);
  --ink-faint: var(--color-…);
  --ink-on-dark: #fff;
  --line: var(--color-…);          /* hairline border */
  --accent: var(--color-…);        /* links / emphasis */
  --action: var(--color-…);        /* primary button fill */
  --action-ink: var(--color-…);    /* text on primary button */
  --focus: var(--color-…);

  --font-sans: '<Source Font>', '<Open Substitute>', system-ui, sans-serif;
  --font-display: var(--font-sans);   /* or the display family */
  --font-mono: ui-monospace, monospace;

  --text-display: 64px; --leading-display: 0.96; --tracking-display: -0.028em; --weight-display: 540;
  --text-h1: …; --text-h2: …; --text-h3: …; --text-body-lg: …; --text-body: 16px; --text-small: 14px; --text-caption: 12px;
  /* matching --leading-*, --tracking-*, --weight-* for each */
  --weight-regular: …; --weight-medium: …; --weight-bold: …;

  --space-1: 4px; /* …base-unit multiples… */
  --radius-control: …; --radius-card: …; --radius-pill: 999px;
  --shadow-card: …; --shadow-float: …; --ring: 0 0 0 1px var(--line);
  --blur-glass: 12px;
  --ease: …; --duration: …;
  --container: 1200px;
}
/* Only if the source authors a dark theme: */
@media (prefers-color-scheme: dark) { :root { /* override primitives or aliases */ } }
```

If a theme can apply to a *subtree* (a `.dark` class or `[data-theme]` on a section, as with
Superhuman's dark bands or a class-based toggle), declare the aliases (and any shadow or ring
token built from primitives) on `:root, .dark, [data-theme="dark"]`, not on `:root` alone.
`var()` resolves where the property is declared, and descendants inherit the resolved value.
An alias defined only on `:root` keeps the light values inside a dark subtree, even though
the primitives were overridden there.

For a proprietary font, point `--font-sans` at the source name first (it renders on machines
that have it) and follow it with the open substitute. Load the substitute from Google Fonts in
the specimen/app. Never hotlink the source's font files.

## tailwind-theme.css

The same tokens in a Tailwind v4 `@theme { … }` block, using Tailwind's namespaces
(`--color-*`, `--font-*`, `--text-*` with `--text-*--line-height` / `--text-*--letter-spacing`,
`--radius-*`, `--shadow-*`, `--ease-*`, `--spacing`), plus the semantic aliases as
`--color-canvas`, `--color-ink` and so on, so utilities like `bg-canvas text-ink` work.

## components.html

An HTML fragment, not a full page, that reconstructs the source's key components using
**only** `var(--…)` tokens: no raw hex. It's injected into the specimen, so any component that
looks wrong there points at a wrong token. Include every button variant with a hover state (a
`:hover` rule in a `<style>` inside the fragment is fine), a link in a sentence, a card, the
nav bar, a badge, an input, and one signature composition (e.g. glass card over a gradient or
image). Add `data-label="…"` on each top-level block for the specimen caption.
