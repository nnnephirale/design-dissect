# Textures and shaders

Shaders are a conditional capability. Offer one only when **procedural texture, light,
distortion or motion meaningfully defines the reference**. If you encourage them everywhere,
the skill optimises for effects rather than for the user's taste.

## The check (cheap, always)

Use what's already measured. The digest's **Texture candidates** line lists bands and panels
whose fill is a gradient, pattern, video or non-photographic image, and you've viewed the band
close-ups. Answer:

1. **Is there an abstract texture?** Aurora or light smears, iridescent or marbled plates,
   mesh gradients, hatches, grain, noise fields, animated backgrounds. Photography of people,
   places or products doesn't count, and neither do flat fills or simple two-stop linear
   gradients: CSS already covers those.
2. **Does it define the reference?** Would the site lose its identity without it? Is it a
   signature move, or a recurring element of a panel recipe? One decorative blob doesn't count.

If both answers are yes, add a **Textures** section to DESIGN.md, then offer the shader in one
line. Otherwise say nothing about shaders.

The Textures section covers, for each texture:
- **what it looks like:** palette stops, direction, softness, pattern overlay
- **where it's allowed:** strip, plate, tile or hero only
- **how much of the view it may cover**
- **how it pairs:** e.g. always under a flat UI card, showing 3–25%
- **motion,** if any

## Building (only if the user accepts)

Start from `assets/texture-shader.html`. It's a single-file WebGL2 template: a domain-warped
noise field with stretch, fold highlights, an optional hairline hatch and grain. It has
preview modes that show the texture *in composition*: a plate behind a mock, a strip with a
headline, and full canvas. Don't write a shader from scratch.

1. Copy it to `<out>/shader/index.html`.
2. Replace the JSON in `<script id="config">`:
   - `presets`: one per texture in the Textures section. Each has 5 colour stops from dark to
     light, a highlight colour, and shape values.
   - `preview`: the reference's ground colour, ink, font, radius and strip copy.
3. Tune each preset against its band close-up. The main controls:
   - `stretch` and `angle` for streaks
   - `detail` for softness (lower is softer)
   - `contrast`
   - `sheen` for ridges
   - `hatch` for patterned plates
4. Screenshot each preset in its preview mode and compare it with the reference. Then show the
   user.

GLSL ES 3.0 reserves some ordinary words, `patch` among them, as identifiers. A compile error
will say "reserved word".

## Taste guardrails

- **Composition first.** A texture must serve the rules (strip height, plate coverage). Keep
  the preview modes honest to them.
- **Hold a texture to its documented roles.** Don't spread it into new ones (as a full-page
  background, say) unless the user asks.
- **Honour the user's motion preferences.** The template pauses under
  `prefers-reduced-motion`. Keep speed low. Textures should breathe, not swirl.
- **Make it theirs.** When applying to the user's own product, suggest changing the palette,
  angle or overlay so the texture reads as theirs rather than a copy of the reference.
