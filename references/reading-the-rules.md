# Reading the rules

A design system is a small set of decisions applied consistently. The tokens are the output;
the rules are the decisions. For each lens below, find the decision, state it as a rule, and
give the evidence. A good rule is specific enough that someone could break it: "Violet is for
text links and the outline of secondary buttons, never a surface" is a rule. "Uses violet
tastefully" is not.

## Contents
1. Colour: roles, ratio, where chroma lives
2. Neutrals: temperature and the surface ladder
3. Typography: the voice
4. Space: base unit and rhythm
5. Shape & depth: how things separate from each other
6. Motion & interaction idioms
7. Signature moves
8. Refusals: what the system never does
9. Marketing layer vs product layer
10. Traps

---

## 1. Colour: roles, ratio, where chroma lives

- **Ratio.** From the area-weighted surface list, work out what share of the page is
  neutral. Most refined systems are 85–95% neutral, with chroma in under 10% of the area.
  Note the ratio. It is the easiest thing to get wrong when applying.
- **Role per hue.** For each chromatic colour, check the samples: is it text, a fill, a
  border/ring, or a full-bleed band? A hue that appears in only one role is a rule
  ("maroon = primary fill + footer ground"). Cross-check against `components.buttons`: which
  button styles are filled, which outlined, which ghost?
- **Semantic layer.** If authored tokens have names like `--color-action-primary`,
  `--color-text-muted`, `--color-border-focus` or `--color-bg-overlay`, build the role table
  from them. Pair each semantic token with the primitive it resolves to.
- **Opacity instead of new colours.** Text shown as `#ffffffcc` or `#141412a6`, and borders
  as `#73736e33`, mean the system derives tints by alpha rather than adding greys. That is a
  rule worth keeping.
- **Dark mode.** `light-dark()` values or `[data-theme=dark]` scopes mean a dark theme is
  authored even if the marketing page never shows it. Document it; it's gold for app work.
  If the `desktop-dark` run looks identical, the page forces light, but the tokens still tell
  you the dark palette.

## 2. Neutrals: temperature and the surface ladder

- **Temperature.** The digest tags greys as neutral (R=G=B), warm (R>B) or cool (B>R). A
  system is usually consistent: warm canvas with warm ink (#f2f0eb / #292827) or neutral
  throughout. Temperature carries a lot of the mood (editorial and paper-like, or technical
  and cool), so state it explicitly.
- **Surface ladder.** Order backgrounds from base canvas to raised card to inset/pressed to
  dark band to inverse. Note which step is "the page" (the largest area) and which steps are
  reserved for specific jobs. Many systems put white *on top of* an off-white canvas rather
  than using white as the canvas.
- **Ink ladder.** Primary, secondary, tertiary and disabled text, with their contrast
  against the canvas. Two or three steps is typical; more suggests sloppiness or opacity
  tints.

## 3. Typography: the voice

- **Family strategy.** One family doing everything, a display/text pair, or a mono accent?
  Check `@font-face` for families the page loads but barely uses (e.g. a serif or mono held
  for specific moments).
- **Weight voice.** The weight distribution matters more than the size scale. 80% of
  characters at 460 with headlines at 460–540 is a whisper voice. Headlines at 700 is a shout.
  Variable fonts with odd weights (460, 540) are a deliberate choice.
- **Tracking rule.** Compute tracking in em against size. It usually follows a curve:
  tighter as size grows (e.g. −0.028em at 49px+, −0.007em at 20px, 0 at 16px and below).
  State the curve, not the individual values.
- **Line-height rule.** Display sizes run tight (0.9–1.2), body 1.4–1.6. Note any
  unusually tight display leading. It's often a signature.
- **Scale.** Collapse near-duplicates (22.4 vs 22) and list roles: display, h1–h3, body-lg,
  body, small, caption, label. Compare desktop with mobile: if sizes shift smoothly and the
  authored tokens use `clamp()`, the type is fluid. Record min/max, not one snapshot.
- **Case and features.** Uppercase labels with positive tracking, tabular numerals, `ss01`
  alternates: small details that carry identity.

## 4. Space: base unit and rhythm

- **Base unit.** Find the greatest common divisor of the frequent padding and gap values
  (usually 4 or 8). Authored `--space-*` tokens confirm it.
- **Density.** Typical control padding (6px 16px is compact; 12px 24px is roomy), gaps inside
  components (4–8), and between sections (64–128 on marketing pages).
- **Container.** The dominant `max-width`, the gutters, and which sections break out full
  bleed.
- **Breakpoints.** From media queries, sorted by use count. Note odd values like `640.02px`
  (a `min-width` that's `max-width + 0.02` avoids overlap), which reveal the tooling.

## 5. Shape & depth: how things separate from each other

Every system picks a main separation strategy. Name it:
- **Borders**: hairlines at low alpha. Check `border` and also `ringBorders`: a
  `0 0 0 1px` box-shadow is a border that doesn't affect layout, common in Linear-like systems.
- **Shadows**: layered soft shadows (several stacked, low alpha, with a 1px ring). Record the
  full stack; the layering is the look.
- **Tone**: surfaces differ only in value, with no lines or shadows.
- **Blur/glass**: `backdrop-filter` on headers or floating cards.
- **Imagery**: depth comes from photography, with UI floating on top.

Radius: map radius to element size. Small controls get small radii, cards larger, pills
999px. The ratio between them ("cards are 2× button radius") transfers better than the raw
numbers. Also check whether nested radii are concentric (outer radius = inner radius +
padding).

## 6. Motion & interaction idioms

- **Timing.** The dominant duration and easing. Browser defaults (`ease`, 0.2s) mean motion
  isn't a focus. A custom cubic-bezier used across keyframes is a deliberate motion identity.
- **What animates.** Colour only? Transforms? Box-shadow rings thickening
  (`inset 0 0 0 1px` → `2px` on hover)? Underline thickness?
- **Hover/focus/active idioms** come from `interactionRules`. Look for a consistent pattern,
  e.g. "hover = the border ring thickens, active = the fill darkens, focus = 2px outline in the
  focus token, offset 2px".
- **Entrances.** Keyframes like fade-slide-down on the hero, and whether they respect
  `prefers-reduced-motion` (media queries will show it).

## 7. Signature moves

Pick the 3–5 things that make the site recognisable at a glance. They are what someone would
miss first if they were gone. They're usually compositional, not token-level: "product UI as
frosted glass cards composited over full-bleed photography", "one dark teal band two-thirds
down the page", "hairline hatched-gradient dividers". Confirm each against the screenshots.
These are what the apply step must preserve even when everything else is compressed.

## 8. Refusals: what the system never does

Absences are rules too, and they make the best don'ts. Check for:
- no pure #000 text or #fff canvas
- no drop shadows on cards
- no second filled button colour
- no bold headlines
- no gradients on UI surfaces (only atmospheric bands)
- no centred body copy
- no icons in buttons

Only claim a refusal if the measurements back it up across all the runs. One counterexample
in the component samples kills it; downgrade it to "rarely".

## 9. Marketing layer vs product layer

Marketing pages show a brand at full volume: huge type, photography, gradients, bands. The
product UI is usually quieter and denser. If the site shows product UI (screenshots,
embedded mockups, a docs or app surface), dissect that separately, because it's the better
model for a web app. Say which layer each rule comes from.

## 10. Traps

- **Viewport-dependent values.** Fluid sizes and responsive backgrounds change with width.
  Always quote values at the stated viewport (1440 / 390).
- **Rotating content.** Homepages A/B-test and rotate heroes and promo cards. Superhuman
  served a pastel-sky hero on one load and a dark teal one on the next, and area shares moved
  ±5%. Trust patterns that hold across runs and the authored tokens, not a single tally. When
  two canvases compete (#f7f5f2 vs #f2f0eb), the tokens usually show both are intended roles.
- **Overlays and modals.** `extract.js` skips cookie/consent/chat-widget subtrees and
  `run.mjs` hides them for screenshots. If an unusual banner still shows up in the samples,
  discard its values.
- **Embedded third-party UI** (video players, maps, embeds) isn't the system.
- **Screenshot-only surfaces.** Product "UI" shown as images can't be measured. Eyeball it,
  and tag it inferred.
- **Framework defaults** (Tailwind's `#e5e7eb` border, `ease` 150ms) aren't decisions unless
  they're used deliberately and consistently.
