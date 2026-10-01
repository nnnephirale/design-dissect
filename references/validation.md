# Validation: prove the rules guide design

DESIGN.md is a hypothesis about how to build in the reference's language. A document can read
convincingly and still produce the wrong interface: the first Superhuman write-up had correct
tokens and missed the composition entirely. So test it the only way that counts: build
something from it and look.

## 1. Build one representative screen

- **Use only DESIGN.md, tokens.css and components.html.** Pretend you've never seen the site.
  If you need something the documents don't say, that's a gap: note it, and fix DESIGN.md
  after this pass.
- **Pick a real app screen, not a marketing page:** a dashboard with a list or table, a
  settings page, an inbox, or a detail view with a sidebar. If the user named their project,
  pick the screen they're most likely to build first.
- **Exercise the rules that matter:**
  - the surface ladder and ink ladder
  - the type anatomy of one block type
  - one panel recipe (e.g. plate + mock + satellite, translated to the app)
  - one interaction idiom (hover or active state)
  - the separation strategy
  - the colour ratio
  - any signature move that survives in an app
- **Keep it small:** one file, `<out>/validation/screen.html`, that links `../tokens.css`. No
  build step. Realistic content, not lorem ipsum.

## 2. Capture and compare

```bash
cd "<skill-dir>/scripts" && node validate.mjs "<abs-out-dir>"
```

This screenshots the screen at 1440 and 390 wide (`validation/screen-desktop.png`,
`screen-mobile.png`) and writes `validation/compare.html`, which puts the screen next to the
reference's band close-ups and fold screenshot. View both PNGs, then check:

| Check | Pass when |
|---|---|
| Family resemblance | Someone who knows the reference would recognise the family in the first second |
| Colour ratio | The neutral/chroma balance matches DESIGN.md (e.g. ~85% neutral) |
| Voice | Headline weight and tracking match; nothing bolder or louder than the reference allows |
| Separation | Same strategy (rings vs shadows vs tone) |
| Composition | The panel recipe reads (partial plate, bleed, satellite), with the documented proportions |
| Refusals | None of the Don'ts is broken |
| Interactions | Replicas measured with `interact.mjs` match the original within ~10% (duration, curve, ζ, distance) |
| App-ness | Density and sizes are app-appropriate, not a scaled-down marketing page |

**When a check fails, fix the document first.** Missing rule → add it. Wrong rule → correct it.
Ambiguous rule → make it a ratio or relationship. Then rebuild the screen from the corrected
document. Patching only the screen hides the gap from every future use. Two or three passes is
normal; stop when the checks pass.

## 3. Show the user

Open `compare.html` (or send the two PNGs) and ask one open question, e.g. "Does this feel
like <reference> to you, and like something you'd want?". The two halves separate the
reference layer from the taste layer. Route the answer through `feedback-and-taste.md`.
