---
name: design-dissect
description: Translate a visual reference (a live website) into reusable design guidance, then refine that guidance through real interface work and the user's feedback. Measures the site (computed styles, its own CSS tokens, composition, interactions, desktop + mobile, light + dark) and writes a concise DESIGN.md with tokens.css, a Tailwind v4 theme and a specimen. It then builds a representative screen to prove the rules work, and folds the user's reactions into the right layer (reference, lasting taste, or project) without letting any document bloat. Offers a procedural texture/shader only when the reference is defined by one. Use this whenever the user shares a site URL or a Refero/Mobbin/Godly/Land-book page and wants its look, vibe, style, design language, design system or tokens; says "make my app look like <site>", "reverse-engineer this design", "what makes this site feel like that", "turn this into a DESIGN.md"; restyles a project after another product (Linear, Superhuman, Stripe, Vercel, Arc…); or gives feedback on a design produced from a reference ("too loud", "headings feel big", "this isn't it") — even if they never say "design system".
---

# Design Dissect

Turn a visual reference into design guidance an agent can actually build from, then make that
guidance sharper through real screens and the user's reactions. The loop is:

**Dissect → Validate → Refine → Apply**, with textures as a conditional branch.

The goal is not a big document. It's a small, increasingly precise one: measured facts about
the reference, a short list of lasting preferences about the user, and project-specific choices,
each kept in its own place.

## Settings

Read these from the user's global agent instructions (AGENTS.md / CLAUDE.md), under a
`design-dissect` heading, before starting. Fall back to the defaults.

| Setting | Default | What it is |
|---|---|---|
| `library` | `./design-systems/` in the current project, else `~/design-systems/` | Where each `<site-slug>/` folder goes |
| `taste file` | `~/design-systems/TASTE.md` (created on first use) | Lasting preferences, shared across all references and projects |
| `specimen comments` | off | When on, the user's feedback is shown as comment cards on the specimen |
| `precedence default` | *ask* | When a project applies a reference: does the reference or the user's existing style win? |

Never hard-code a user's name or paths into this skill. Per-user values live in their own
instructions.

## Three layers: keep them separate

| Layer | Where | Holds | Changes by |
|---|---|---|---|
| **Reference observations** | `<library>/<site>/DESIGN.md` | What the site *does*, measured and interpreted | Rewriting in place when re-measured or corrected. History lives in git, not in the file |
| **Lasting preferences** | the taste file | What the *user* likes across references and projects | Promotion from repeated evidence, then consolidation |
| **Project choices** | `DESIGN-NOTES.md` at the project root | Which reference this project uses, precedence, scoped feedback | Per project; dies with the project |

Routing a piece of feedback is the core judgement. See `references/feedback-and-taste.md`.
In short:
- "The doc missed how the colour blocks are proportioned" means the **reference layer** was
  wrong. Fix DESIGN.md.
- "Make this heading smaller" is **project** scope, recorded against that screen.
- A direction seen repeatedly across screens or projects, or anything the user says with
  "always", becomes a **candidate**, and then a **lasting preference**.

## Stage 1 — Dissect

Measure, don't eyeball. Vision is good at composition and mood and bad at exact values. A warm
#f2f0eb canvas and a neutral #f2f2f2 look identical in a screenshot but set a different mood.
Third-party breakdowns (Refero Styles, DESIGN.md generators, blog teardowns) are LLM
interpretations: treat them as hypotheses to check. Refero's Superhuman page said "never use
violet as a button fill", but the live site has a violet-filled button. It also missed an
authored dark mode and fluid type.

### 1. Measure

```bash
cd "<skill-dir>/scripts" && node run.mjs "<url>" "<abs-out-dir>" --dark
cd "<skill-dir>/scripts" && node digest.mjs "<abs-out-dir>"
cd "<skill-dir>/scripts" && node probe.mjs "<url>" "<abs-out-dir>"
```

Then capture the micro-interactions, which are part of the craft and are often what makes
a reference worth studying:

```bash
cd "<skill-dir>/scripts" && node interact.mjs "<url>" "<abs-out-dir>"
```

See `references/reading-interactions.md`. If the reference draws with `<canvas>` (WebGL
shaders, 2D generative effects), read its code rather than its pixels: `node canvas.mjs
"<url>" "<abs-out-dir>" --hover="<trigger>"` captures the shaders, uniforms, textures and draw
calls (`references/textures-and-shaders.md`).

`run.mjs` measures at 1440×900 and 390×844 (and dark with `--dark`). It captures screenshots,
the composition (`compose-desktop.json`, `blockmap.png`, `band-NN.png` close-ups) and hides
cookie and chat overlays. `digest.mjs` condenses everything into `digest.md`. `probe.mjs`
hovers representative elements and reports what changes, which catches interactions static
measurement can't see.

If `playwright` is missing, run `npm i` once in `scripts/`. The runner falls back to installed
Google Chrome.

Without Node: open the URL in a browser tool, set the width to 1440, scroll to the bottom, and
paste `scripts/extract.js` (then `scripts/compose.js`) into its JS tool. Save the results as
`measure-desktop.json` / `compose-desktop.json` and run `digest.mjs`. With no browser at all,
fetch the HTML and CSS and grep, and say that values are authored rather than rendered.

When the site has distinct surfaces (pricing, docs, the logged-in app), measure 1–3 extra
URLs into sub-folders. Product surfaces matter more for app work than a marketing hero does.

### 2. Look

Read `digest.md`, not the raw JSON (about 8K tokens, versus about 70KB per raw file). Then
view the screenshots, `blockmap.png` and **every** `band-NN.png`. Numbers miss composition and
mood; screenshots miss exact values. Many sites bake their best compositions into exported
images, so the DOM only reports "image" and the layering has to be read visually.

### 3. Read the composition

Tokens are the vocabulary; composition is the grammar: the band sequence and its uneven
heights, split ratios, layer stacks (flat ground, a texture plate peeking from behind a UI
mock, a satellite card breaking a corner, mocks bleeding off an edge), type anatomy per block,
and the pairings the page runs on. That's where "why it works" lives, and a token list alone
never captures it. Read `references/reading-composition.md`.

### 4. Interpret the rules

Read `references/reading-the-rules.md`. Tag every token and rule with its evidence:
**measured** (cite the element), **authored** (the site's own CSS custom property, the
strongest signal of intent), or **inferred** (say what would confirm it). When the site ships a
semantic token layer (`action`, `surface`, `border-focus`), build the palette from it.

### 5. Write the outputs

Write `<out>/DESIGN.md` using the structure in `references/design-md-template.md`, plus
`tokens.css`, `tailwind-theme.css` and `components.html`. Components are *working* replicas:
the signature interactions have real behaviour, with measured values, verified by running
`interact.mjs` on the served specimen (`reading-interactions.md`). `references/example-superhuman.md`
shows the level of specificity to aim for. Then:

```bash
cd "<skill-dir>/scripts" && node build-specimen.mjs "<abs-out-dir>"
```

Keep DESIGN.md concise. It describes the reference; it isn't a log. If a section is getting
long, tighten it into rules and ratios rather than adding examples.

### 6. Texture check (cheap, always) and shader (conditional, opt-in)

The composition data already says which bands and panels are gradients, patterns, video or
abstract images, and the digest lists them under "Texture candidates". Decide in a line or
two whether **procedural texture, light, distortion or motion meaningfully defines this
reference** (aurora smears, iridescent plates, hatches, grain, animated fields).
- **No:** say nothing about shaders. Photo-led and flat sites don't get one.
- **Yes:** add a Textures section to DESIGN.md (where each texture is used and how much of the
  view it may cover), then *offer* a shader.

Build it only if the user accepts, starting from `assets/texture-shader.html`; see
`references/textures-and-shaders.md`. A shader must serve the composition rules (e.g. "a plate
showing 15–25% behind a UI card"). It isn't a showpiece.

## Stage 2 — Validate (required)

A convincing DESIGN.md can still produce the wrong interface. Before handing over, prove the
rules guide design. See `references/validation.md`.
1. **Build a representative screen from DESIGN.md and tokens.css alone.** One small, realistic
   app screen (a dashboard, list or settings view) that uses the composition recipes. Not
   component swatches. Save it as `<out>/validation/screen.html`.
2. **Compare.** Run `node validate.mjs "<abs-out-dir>"` to capture the screen at desktop and
   mobile widths and build `compare.html` next to the reference band close-ups. Self-check
   against the composition rules and signature moves. When the screen drifts, fix DESIGN.md
   (the rule was missing or wrong) and rebuild. Don't just patch the screen.
3. **Show the user** the comparison and ask for their reaction. Their answer goes into Stage 3.

Then give a short summary:
- the essence in two sentences
- 3–5 signature moves
- where the files are
- the validation result
- anything you couldn't measure

## Stage 3 — Refine through feedback

Whenever the user reacts to anything produced from a reference (the validation screen, an
applied project, a DESIGN.md section), follow `references/feedback-and-taste.md`:
- **Keep the scope.** Record feedback at the scope it was given. "Make this heading smaller"
  does *not* become "all headings must be small".
- **Route it** to the reference, project or candidate layer.
- **Promote** a candidate to a lasting preference only on evidence: the same direction in 2–3
  separate places, or an explicit "always" or "never".
- **Reconcile every time.** Resolve contradictions (newest wins at its scope), replace outdated
  guidance, and merge repeats into one sharper rule. The taste file has a cap.
- **Tell the user in one line** what changed and where, e.g. "noted for this dashboard" or
  "promoted to lasting: …".
- **Optional: show it on the specimen.** If the user's settings turn on `specimen comments`,
  add the entry to the reference's `feedback.json` and rebuild the specimen, which renders it
  as a comment card on the relevant section.
- **Read the on-page comments first.** Comments the user leaves on a specimen are the most
  direct evidence of their taste. Before design work, read open and recent ones across all
  references (the `design-feedback` MCP's `get_feedback`, or the `feedback.json` files).

## Stage 4 — Apply to a web app

Only when the user wants their project restyled. Read `references/applying.md` first.
- Record the reference and the precedence choice in the project's `DESIGN-NOTES.md`. Ask once
  per project unless the settings give a default.
- Wire `tokens.css` in through semantic aliases.
- Translate magnitudes for app density, keeping the ratios and voice.
- Derive the components the source lacks, and mark them derived.
- Take the design language, not the brand.
- Verify with before/after screenshots, and route any feedback through Stage 3.

## Files

| File | What it's for |
|---|---|
| `scripts/run.mjs` | Measurement, composition, screenshots, band close-ups, block map |
| `scripts/extract.js` · `scripts/compose.js` | In-page measurers (also pasteable) |
| `scripts/digest.mjs` | Condenses everything into `digest.md` |
| `scripts/probe.mjs` | Quick hover probe |
| `scripts/canvas.mjs` | Canvas and WebGL capture: GLSL, uniforms over time, textures as PNGs, 2D draw calls, frame strips |
| `scripts/interact.mjs` | Micro-interaction capture: hover, press, click and type, frame-sampled, with WAAPI and spring detection, strips, and a library scan |
| `scripts/build-specimen.mjs` · `scripts/specimen-feedback.js` | Specimen page, with interactive comment cards, plus `STARTTHIS.command` (double-click: starts the comment service if needed and opens the page) |
| `scripts/serve-specimen.mjs` | Serves one reference folder so on-page comments save to `feedback.json` |
| `feedback/server.mjs` | Comment service: serves the library on `:4777` and saves comments from served or `file://` specimens |
| `feedback/install.sh` | Registers the MCP with Claude Code, Codex and Gemini (`--at-login` also runs the service at login) |
| `feedback/mcp.mjs` | `design-feedback` MCP: `list_references`, `get_feedback`, `add_feedback`, `resolve_feedback` (no dependencies) |
| `scripts/validate.mjs` | Captures the validation screen and builds the comparison page |
| `assets/texture-shader.html` | WebGL texture template, filled from DESIGN.md |
| `references/reading-composition.md` | Step 3 |
| `references/reading-interactions.md` | Capturing, naming, replicating and verifying micro-interactions |
| `references/reading-the-rules.md` | Step 4 |
| `references/design-md-template.md` | Step 5 |
| `references/textures-and-shaders.md` | Step 6 |
| `references/validation.md` | Stage 2 |
| `references/feedback-and-taste.md` | Stage 3: layers, scope, promotion, reconciliation, caps |
| `references/applying.md` | Stage 4 |
| `references/example-superhuman.md` | A finished DESIGN.md for calibration |
