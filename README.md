# design-dissect

An agent skill that translates visual references into reusable design guidance, **measured from
the live site rather than guessed**, then refines that guidance through real interface work and
user feedback. It separates reference observations from lasting preferences and
project-specific choices, keeping each document concise as understanding improves. Visual
effects, including shaders, are used only when they support the intended design.

Inspired by [Refero Styles](https://styles.refero.design), whose DESIGN.md breakdowns showed how
useful a written design language is to an agent. design-dissect measures instead of
interpreting, and then keeps learning.

## What it does

**Dissect → Validate → Refine → Apply**

1. **Dissect.** Headless Chrome measures the site at desktop and mobile widths, in light and
   dark. It reads:
   - computed styles
   - the site's own CSS custom properties (its semantic token layer, dark theme, fluid type)
   - **composition**: band sequence and height ratios, grid splits, layer stacks, what bleeds
     or overlaps, the type anatomy per block
   - **interactions**: a hover probe records what changes on the element, its siblings and the
     page

   The agent then reads the digest, a block map at true proportions, and a close-up of every
   band. It writes:
   - `DESIGN.md`: composition, colour roles, type, space, depth, motion, components, do's and
     don'ts, a translation for app UI, and an agent prompt guide. Every value is tagged
     measured, authored or inferred.
   - `tokens.css`, `tailwind-theme.css`, `components.html` and a `specimen.html`
2. **Validate.** The agent builds one representative *app* screen from DESIGN.md alone and
   compares it side by side with the reference. When it drifts, the document gets fixed, not
   just the screen. Then you react.
3. **Refine.** Your feedback is routed to the right layer, at the scope you gave it:
   | Layer | File | Example |
   |---|---|---|
   | Reference observations | `DESIGN.md` | "you missed how the colour blocks are proportioned" |
   | Project choices | `DESIGN-NOTES.md` | "make *this* heading smaller" |
   | Lasting preferences | your taste file | promoted only after the same direction shows up in 2–3 places, or you say "always" |

   Every write reconciles contradictions, replaces outdated guidance and merges repeats, and
   the files have caps. The goal is a small, increasingly precise document, not a growing log.
4. **Apply.** The agent restyles your web app. It wires tokens in through semantic aliases,
   translates marketing-scale values to app density, derives the components the source lacks,
   takes the language rather than the brand, and verifies with before/after screenshots.

**Textures and shaders are conditional.** A cheap check on the composition data decides
whether procedural texture, light, distortion or motion actually defines the reference
(aurora smears, iridescent plates, hatches, grain). Only then does the agent offer a WebGL
shader, built from a bundled template with previews that show it *in composition* (a plate
behind a UI card, a strip, full canvas).

## Install

Works with Claude Code and other agents that load `SKILL.md` skills (e.g. Codex CLI).

```bash
git clone https://github.com/nnnephirale/design-dissect ~/.claude/skills/design-dissect
cd ~/.claude/skills/design-dissect/scripts && npm i
```

This needs Node 18+. The scripts use Playwright and fall back to your installed Google Chrome,
so no browser download is needed if you have Chrome. For Codex, clone into
`~/.codex/skills/design-dissect` instead, or symlink it.

## Use

Just ask:
- "dissect the design of https://linear.app"
- "make my app feel like superhuman.com"
- "what makes this site feel like that?"
- then react to what it builds: "headings feel too big", "this isn't it: the blocks are too even"

## Settings (optional)

Add a block to your global agent instructions (`~/.claude/CLAUDE.md` or `AGENTS.md`):

```markdown
## design-dissect
- **library:** ~/Design/systems/            <!-- where <site>/ folders go; default ./design-systems/ -->
- **taste file:** ~/Design/TASTE.md         <!-- or an existing design-preferences file; default ~/design-systems/TASTE.md -->
- **precedence default:** ask               <!-- reference wins | house style wins | ask -->
```

## Output

```
<library>/<site>/
  DESIGN.md  tokens.css  tailwind-theme.css  components.html  specimen.html
  digest.md  blockmap.png  band-NN.png  probe.md  shot-*.png  measure-*.json  compose-desktop.json
  validation/  screen.html  screen-*.png  compare.html
  shader/      index.html   (only when offered and accepted)
```

`references/example-superhuman.md` is a complete DESIGN.md produced by the skill.

## Notes

- **Language, not brand.** The skill measures public pages to learn a design *language*. When
  applying it, don't copy logos, product names, photography or self-hosted font files. The
  guides say to use open substitutes and to make textures your own.
- Measurements are snapshots. Sites A/B-test and rotate content, so the skill weighs patterns
  that hold across runs, and the site's own tokens, over any single tally.

## License

MIT
