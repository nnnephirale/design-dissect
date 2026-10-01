# Reading interactions

Micro-interactions are part of the craft. They're often what makes a well-built app feel
well-built: a dot that flies instead of jumping, content that blurs in instead of popping,
a theme that spreads from the control you touched. Capture them as carefully as the tokens.
Emil Kowalski's skills (`emil-design-eng`, `animate`, `animation-vocabulary`,
`review-animations`) are the reference for judging and naming them.

## Capture

```bash
cd "<skill-dir>/scripts" && node interact.mjs "<url>" "<abs-out-dir>" [--sel="css, css"]
```

This hovers, presses and clicks every control (and focuses and types into inputs). It samples
the element, its children, its siblings and any added nodes on every frame for about a second.
It also records the Web Animations the browser runs (CSS, WAAPI, and Framer Motion springs,
which arrive as exact `linear()` curves), the state changes (`aria-pressed`, `data-state`,
added and removed nodes), a best-fit easing or spring estimate (overshoot → damping ratio ζ,
settle time), and a frame strip per interaction. It also scans the JS bundles for motion
libraries and their spring settings.

It writes `interactions.md` (read this), `interactions.json` and `interactions/strip-NN.png`.
**View the strips.** They show the things numbers flatten: a reveal's shape, a mid-flight
swell, a blur. Use `--sel` to target specific controls. Candidates are deduplicated by their
markup signature, so pick siblings explicitly when they behave differently.

## Read it as a vocabulary

Most crafted apps use 3–5 gestures everywhere. Name them and give each one exact values:
- **Ink:** colour-only responses, and their duration and curve.
- **Enter / exit:** what appears and leaves, and how: opacity plus blur, scale, a lift, and
  the spring or curve.
- **Glide:** layout moves, meaning indicators, reordering and FLIP transitions.
- **Press:** compression and spring-back on active.
- **Spatial events:** reveals that originate from the control (a view-transition circle, or a
  popover growing from its trigger).

Then per component: trigger → what moves → from → to → duration → curve. Put exact
`linear()` springs in tokens.css as `--spring-*`.

## Numbers that lie

- **Code vs behaviour.** Spring settings in the bundle are a menu, not an answer. Pick by the
  *measured* settle time and overshoot. perfolios' bundle lists 300/22, but the dot's measured
  motion matches about 500/30.
- **Colour transitions on `currentColor`** show up on border, outline and text-decoration
  too. They're collapsed in the report, so don't count them as separate motions.
- **Focus artefacts.** Outline colours animating after a mouse press are usually the browser,
  not design.
- **Perceived blur.** A crossfade between two busy images often *looks* blurred mid-swap. Sample
  `filter` per frame before adding one: resurf's "blurry" screen swap is opacity only.
- **Duration-based springs** (Framer `{duration, bounce}`): damping ratio ζ = 1 − bounce. Sample the
  damped spring into a `linear()` curve of that duration, then check its 90% time against the
  measured motion.
- **Headless timing** is accurate to about one frame (16ms). Screenshots in strips are
  approximate (±30ms).

## Replicate and verify

Rebuild each signature interaction in `components.html` with real behaviour: JS for state,
WAAPI or CSS with the measured values. Then measure the replica with the same tool against
the served specimen:

```bash
cd "<skill-dir>/scripts" && node interact.mjs "http://localhost:<port>/specimen.html" "<scratch>" --sel="<replica controls>"
```

Compare durations, curves, ζ and distances with the original. Fix the replica, *and*
DESIGN.md if the measurement exposed a wrong value, until they agree within about 10%.
Honour `prefers-reduced-motion`, and keep hover effects behind `(hover: hover)`.
