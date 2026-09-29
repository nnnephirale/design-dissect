# Reading composition

Tokens are the vocabulary; composition is the grammar. Two sites can share a palette, font and
radius and feel nothing alike, because the feel lives in how things are *proportioned,
sequenced, layered and paired*. When someone says a site "just works", they are almost always
describing composition. It is the part of DESIGN.md that matters most, and the part a
token list can never express.

Inputs: `compose-desktop.json` (band sequence, row splits, panel layering and bleed, type
anatomy), `blockmap.png` (abstract proportions at true scale), and the `band-NN.png` close-ups.
**Look at every band close-up.** Many sites bake their best compositions into exported images:
Superhuman's texture plates, layered UI cards and satellites are single PNGs. The DOM then
only shows "image". Read those visually with the checklist below.

## 1. The band sequence (page rhythm)

List bands top to bottom with fill, height and share of the page. Then read it as music:
- **Tone alternation.** Which light and dark grounds alternate, and which is the "rest" colour
  the page keeps returning to? Superhuman's Docs page runs sand → maroon → sand → white →
  aubergine → lilac → paper → white → maroon: warm neutrals as rests, and one saturated ground
  roughly every 1.5 viewports.
- **Uneven heights.** Record the heights as ratios (e.g. 2.3 : 1 : 2.3 for feature band :
  gradient strip : footer). A short, intense band between two tall calm ones is a deliberate
  accent. Say which bands are "strips" (under 0.5 vh) and what they're for.
- **Where texture lives.** Which bands are flat and which are image, gradient or pattern? The
  interplay (mostly flat, with texture as punctuation) is usually the point.

## 2. Splits and the grid

For each row of panels: the split ratio (1:1, 1:1:1, 3:2, 1 full + 2 halves), the gap, the span
(% of viewport), and the height ratio between stacked rows (e.g. a full-width card 1.27× taller
than the half-width pair below it). Note deliberate *un*evenness:
- Text column vs media column (e.g. text 0–40%, media 45–100%).
- Equal widths with unequal content weight (a lilac card with a small composer vs a maroon card
  with a large panel).
- Alignment: which edges line up across rows (shared left text edge, shared gutter)?

## 3. Panel recipes (the layer stack)

For every signature panel, write the stack bottom → top, with positions as % of the panel:

```
ground   flat #e0ddd8, r16, clips
plate    pastel iridescent gradient + white 45° hatch, x82–100% y0–100%, flush right edge
mock     white UI (doc), x45–73% y20–100%, bleeds bottom, 1px hairline, no shadow
satellite  white AI panel r12, x73–88% y10–100%, overlaps mock by 4%, bleeds bottom
strip    blue→pink gradient sliver, x41–45%, peeks out from behind the mock's left edge
text     x5–40%: eyebrow 16/460 sub-ink → headline 32/460 ink (3 lines) → (no CTA)
```

What to look for:
- **Plates that peek.** A texture or gradient panel placed *behind* a flat UI card and offset
  so only 10–25% shows along one edge. The texture reads as energy without taking over.
- **Bleed and crop.** Mocks run off the panel's bottom or right edge (the panel clips), or fade
  out with a mask. This implies continuation and avoids a "screenshot in a box" look.
- **Satellites.** A second, smaller card (AI panel, comment, dropdown) overlaps a corner of the
  main mock and often breaks its bounds. The eye goes there first, so note what it shows.
- **Asymmetry with balance.** Mock width ≠ height ≠ panel proportions, but the visual weights
  balance across the row. Describe how (big calm mock on the left, small dense satellite on
  the right; dark card next to light card).
- **Depth recipe.** Shadow, hairline, both, or neither on each layer. Blur, fade and masks.

## 4. Type anatomy per block

Every block type has a fixed anatomy: eyebrow (size/weight/ink) → headline (size, lines,
measure) → body (size, measure in characters) → CTA pair (filled + text link). Record it once
per block type. Note the measure: headlines often break into 2–3 deliberate lines. Also record
small functional text used partly as texture (footer columns, logo strips, UI mock microcopy).

## 5. Image vocabulary

Count the *kinds* of imagery and where each is allowed: photography/video (hero only?),
abstract blur or gradient fields (strips and plates), patterns (hatches), UI mocks (feature
cards), icons (feature grids: 72px gradient tiles), logos (strip). Variety held to strict
roles is a system.

## 6. Pairings (why it pops)

Name the contrasts the composition runs on, e.g.:
- flat ground × textured plate
- quiet UI × saturated ground
- big light headline × small dense mock
- warm neutral × cool accent

These are the transferable ideas, and more valuable than any single hex.

## Writing it up

In DESIGN.md's **Composition** section, give: the band sequence table (fill · height · share ·
role), the splits and grid rules, 2–5 named **panel recipes** as layer stacks (like the one
above), the type anatomy per block type, the image vocabulary, the pairings, and the rules.
Rules should be ratios and relationships, not pixels: "plates show 15–25% along one edge",
"mocks always bleed one edge", "one saturated band per ~1.5 viewports".
