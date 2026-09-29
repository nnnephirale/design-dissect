# Superhuman — Design Language
> Golden-hour glass over warm paper

Source: https://superhuman.com · measured 2026-09-29 at 1440×900 and 390×844 · theme: light page, dark theme authored
Evidence: [m] measured · [a] site's own token · [i] inferred

## Essence
Superhuman reads like a quiet editorial magazine that happens to contain software. The page is
warm paper: two alternating off-white bands (#f7f5f2, #f2f0eb) with white reserved for cards and
the header. Everything is set in one variable grotesk at a whispering 460 weight. Emotion comes
from a full-bleed pastel sky video in the hero, with product UI floating over it as frosted-glass
cards, not from colour. Chroma is spent in small, exact doses: violet for the primary action and
links, lilac as a selected wash, and deep maroon and teal only as whole-band grounds (they're the
authored dark theme applied locally to a section). Depth is a hairline ring plus a whisper of
warm, layered shadow, never a heavy drop. Fine hatched-line textures in the gutters give it a
drafted, printed feel.

## Signature moves
1. **Glass UI over atmosphere.** Real-looking product cards (chat, mail list, tool call) float
   over the hero video at 16–24px radius with `backdrop-filter: blur(12px)` and translucent
   white fills (#ffffff21, #ffffff1f borders). The product is shown as objects in a scene, not
   screenshots. [m]
2. **Whisper-weight type at every size.** 82% of all characters are weight 460. Section
   headings are 49px/460 at −0.0275em, and only the hero and the biggest display lines step up
   to 540. Bold (700) appears only in tiny footer column headings. [m][a]
3. **Warm paper bands.** The page alternates #f7f5f2 and #f2f0eb full-width bands, and hatched
   hairline gradients (45° 1px/5px, and a 4px/8px dash) texture the gutters and dividers. [m]
4. **Dark bands are the dark theme, locally.** Maroon #421d24 (footer, promo cards), teal
   #0c4243 (manifesto band) and aubergine #281647 (feature cards) are exactly the authored
   dark-theme `bg-primary`, `bg-tertiary` and `bg-accent`. A dark section is the whole system
   flipped, not a one-off colour. [a][i]
5. **One ink, alpha-derived greys.** Secondary text is ink #141413 at 65%, borders are
   #73716d at 20% or 5%, and hover washes are ink at 5%. The warm neutral ramp does the rest.
   [a][m]

## Composition
Superhuman's feel lives here rather than in its tokens. It uses a small, quiet vocabulary: one
grotesk at 460, warm neutrals and white UI. The bands, splits and layer stacks orchestrate
that vocabulary so every screen has one point of energy and plenty of rest. Measured from
superhuman.com and superhuman.com/docs (`docs-page/`), with `blockmap.png` and the band
close-ups; the layering was read visually, because it's baked into exported PNGs. [m][i]

### Band sequence
Docs page, top → bottom:
| # | Fill | Height | Role |
|---|------|--------|------|
| 1 | pastel sky image + floating chips | 1.73 vh · 16% | Hero: centred headline, one wide product mock, logo strip |
| 2 | Midnight Wine #421d24 | 1.11 vh · 10% | Feature: text left 45%, mock + plate right; then a 3-up grid |
| 3 | Sand #f2f0eb | 0.48 vh · 4% | **Strip**: centred CTA, a breath |
| 4 | White #ffffff | 1.82 vh · 17% | 2×2 card grid (stages + captions) |
| 5 | Aubergine #281647 | 0.79 vh · 7% | 4-up icon grid |
| 6 | Lilac Wash #e8e0ff | 0.73 vh · 7% | Quote |
| 7 | Paper #f7f5f2 | 1.66 vh · 15% | Two alternating feature rows (text left, layered mock right) |
| 8 | White | 1.00 vh · 9% | Suite 2×2 list |
| 9 | Midnight Wine | 1.37 vh · 13% | Closing CTA + footer + giant outlined wordmark |
The homepage close (your screenshot 1): **aubergine feature band ≈ 2.3 : gradient strip 1 :
maroon footer ≈ 2.3**.

Rhythm rules:
- Warm neutrals (sand, paper, white) are the rests. A saturated ground (wine, aubergine, lilac)
  arrives every ~1–1.5 viewports and never twice in a row, except the closing CTA running into
  the footer.
- Saturated bands alternate hue family: wine → aubergine → lilac → wine. Two dark bands never
  touch without a light rest between them.
- **Strips** (0.35–0.5 vh) are the accent beats: the sand CTA strip, and the full-bleed
  purple/teal aurora strip above the footer. Each holds one headline and one button, laid out
  horizontally (headline left, outline button far right) or centred.
- Texture only appears as strips, plates and tiles. Whole bands are flat colour, or the one
  hero image.

### Grid & splits
- Container 1280px (89% at 1440), 80px side margins, **32px gutters** everywhere. [m]
- Feature row: **text column 0–45% / media 55–100%**. The text is vertically centred on the
  media, not top-aligned. Rows alternate media side rarely; text-left is the default.
- Card grids: 1:1 (2×2), 1:1:1 (3-up) or 1:1:1:1 (4-up). Always equal widths. The *content
  weight* inside each cell is what varies.
- Bento (your screenshot 2): **one full-width card over a 1:1 pair**, full card ≈ **1.27×** the
  pair's height. The pair uses *contrasting grounds* (lilac next to wine) so equal widths
  still read as unequal weights.
- Card stages have a 3:2 aspect (624×416) with the caption *outside*, below the stage:
  headline 31px, body 18px sub-ink, and a violet "Learn more ›". The stage holds only the
  picture.

### Panel recipes
**A. Floating-satellite mock** (the default feature composition):
```
ground     band colour or a sand stage #f0eeea (r0 on bands, r16 as a card)
plate      pastel iridescent gradient, offset +2% right / +5% down behind the mock; only 3–10% shows
mock       white product UI, r12, hairline, soft float shadow, ~55–60% of stage width, cropped or faded at the bottom
satellite  smaller white card (AI prompt, comment, "Connected tools", form), r12, overlaps a top corner of the mock
           by 10–20% and breaks its bounds; AI satellites get a pink→violet gradient border
text       outside the stage (band layout: left 45%)
```
**B. Bento feature card** (screenshot 2):
```
ground     flat card (Sand #e0ddd8 / Lilac #e8e0ff / Wine #421d24), r16, clips
plate      iridescent pastel + white 45° hatch, flush to ONE edge (right or top-right), 15–25% of width
strip      thin blue→pink gradient sliver peeking from behind the mock's left edge (full card only)
mock       white UI, 30–45% of card width, bleeds off the bottom (and right on half cards)
satellite  AI panel or dropdown, overlapping the mock and the plate
text       left 5–40%: eyebrow 16/460 sub-ink → headline 31–39/460, 3–4 lines, no CTA
```
**C. Enterprise feature band** (screenshot 1, top):
```
ground     aubergine #2a1747, full bleed
ghosts     two receding copies of the mock behind-left, fading to the ground (depth by repetition, not shadow)
mock       browser-framed doc, right 55%, fades out at the bottom via a mask into the band
satellite  AI suggestion card overlapping the mock's lower-right, extending past it
text       left 45%: eyebrow 20/460 white-80 → headline 64/460 white, 2 lines → body 20 white-80 → lilac filled CTA + "Learn more ›"
```
**D. Aurora strip**: full-bleed blurred purple/violet/teal light-smear image, ≈0.38 vh. Headline
64/460 white on the left, and a white-outline button far right on the same baseline. Nothing else.
**E. Gradient icon tile**: 72px, radius 16, pink→lilac→peach wash, 1px darker hairline,
28px line icon in ink. Used only in 3- and 4-up grids, left-aligned above a 31px title.

### Type anatomy per block
- **Section intro** (centred): headline 49/460, 1–2 lines, max ~18 words → body 18 sub-ink,
  1–2 lines, ~70ch → optional single CTA.
- **Feature text** (left): eyebrow 16–20/460 sub-ink → headline 49–64/460, 2 lines, broken
  by hand → body 18–20 sub-ink ~60ch → CTA pair (filled + text link with ›).
- **Card caption** (below stage): title 31/460 → body 18 sub-ink, 2 lines → violet link.
- **Bento text** (inside card): eyebrow 16 sub-ink → headline 31–39/460, 3–4 lines, no body.
- **Footer**: column headings 20/540 white; links 18/460 white-80 with a 32px line pitch. Four
  link columns start at 40% of the width; the left 40% holds the logo and a 32px two-line tagline.
  The dense small text is navigation and also texture, balancing the huge outlined wordmark
  below.

### Image vocabulary
| Kind | Only where |
|------|-----------|
| Photography / video (pastel sky, profile portraits) | Hero, manifesto band |
| Aurora light-smear (blurred violet/teal) | One full-bleed strip per page |
| Iridescent pastel plate (pink/lilac/peach/blue marbling, optional white hatch) | Behind UI mocks, flush to an edge |
| Hatch pattern (45° hairlines) | Over plates, gutters, dividers |
| White UI mocks | Feature stages, bento cards |
| Gradient icon tiles | 3- and 4-up grids |
| Monochrome logos | Logo strip |

### Pairings
- **Flat ground × textured plate.** The plate is always partial, so texture is seasoning.
- **Quiet white UI × saturated ground.** Mocks never carry the brand colour; the ground does.
- **Big, light headline × small, dense mock.** 49–64px at 460 against 11–13px UI microcopy.
- **Warm neutral rests × cool-violet accents.** Violet for actions, iridescence for energy.
- **Equal grids × unequal content.** Same cell widths, but different grounds, mock sizes and
  satellite positions.

### Composition rules
- Every media stage has one mock, one satellite and at most one plate, and the satellite
  always breaks the mock's rectangle.
- Mocks bleed or fade on at least one edge. Never a fully boxed screenshot.
- Plates show 3–25% of their area; they never sit fully behind a mock *and* fully visible.
- Texture occupies ≤ 15% of any viewport. Flat colour does the rest.
- One saturated ground at a time on screen. Alternate hue families.
- Text blocks are left-aligned at a shared 80px edge, except centred section intros.
- The hierarchy inside a block is size-only (460 throughout); ink steps are 100% → 65%.

## Colour
Neutral/chroma ratio: ~82% neutral by painted area on the light page (the dark bands add most of
the rest). Neutral temperature: **warm** (R > B throughout, e.g. #292827, #f2f0eb, #8d8a86).

| Name | Value | Token | Role | Evidence |
|------|-------|-------|------|----------|
| Paper | `#f7f5f2` | `--neutral-5` / `--color-bg-tertiary` | Main page band (largest area) | [m] 48% area · [a] |
| Parchment | `#f2f0eb` | `--neutral-10` / `--color-bg-secondary` | Alternate page band, card wells | [m] · [a] |
| Sand | `#dedbd5` | `--neutral-20` / `--color-bg-secondary-dark` | Pressed/darker well, shadow ring | [m] 4% · [a] |
| White | `#ffffff` | `--white` / `--color-bg-primary` | Header, raised cards, tab strips | [m] 21% · [a] |
| Ink | `#292827` | `--neutral-90` / `--color-text-base` | Primary text, secondary action | [m] 28% of text · [a] |
| Ink Deep | `#141413` | `--neutral-100` | Hover/active ink; base for alpha greys | [a] |
| Ink Sub | `#141413a6` | `--color-text-sub` (65%) | Body copy, descriptions | [m] 29% of text · [a] |
| Stone | `#8d8a86` | `--neutral-40` / `--color-border-base` | Solid border (form fields) | [a] |
| Hairline | `#73716d33` | `--color-border-sub` (20%) | Dividers, card edges | [m] ×40 borders · [a] |
| Royal Violet | `#714cb6` | `--purple-60` / `--color-action-primary` | Primary action fill, links, outline-button ring | [m] "Try Go", "Learn more" · [a] |
| Violet Hover | `#533192` / `#3f256f` | `--color-action-primary-hover/-active` | Primary hover / active | [a] |
| Lilac | `#d4c7ff` | `--purple-20` | Secondary filled button ("Get Mail"), links on dark | [m] |
| Lilac Wash | `#e8e0ff` | `--purple-10` / `--color-bg-accent` | Selected tab, promo banner, accent surface | [m] 5% · [a] |
| Midnight Wine | `#421d24` | `--mulberry-100` (dark `bg-primary`) | Footer, promo band, dark cards | [m] 8% · [a] |
| Deep Lagoon | `#0c4243` | `--green-90` (dark `bg-tertiary`) | Manifesto band only | [m] 2% · [a] |
| Aubergine | `#281647` | `--purple-100` (dark `bg-accent`) | Dark feature cards | [m] 7% · [a] |
| Hero Navy | `rgb(27,25,56)` | `--hero-button-background-color-stop-*` | Hero CTA ground | [a][m] |
| Focus Blue | `#005fcc` | `--color-border-focus` | Focus outline only | [a] |

Status colours (authored, rarely visible): success #148072, warning #c25000, error #f72a42 (`--*-base`). [a]

### Surface ladder
| Level | Value | Used for |
|-------|-------|----------|
| 0 canvas | #f7f5f2 / #f2f0eb (alternating) | Page bands |
| 1 raised | #ffffff | Header, cards, tab strip |
| 1a sunken | #dedbd5 or ink 5% wash | Pressed wells, menu hover |
| 2 accent | #e8e0ff | Selected tab, promo strip |
| 3 dark band | #421d24 · #0c4243 · #281647 | Full-bleed dark sections and dark cards (dark theme, local) |
| glass | #ffffff at 12–13% + blur 12px | UI floating over imagery |

### Ink ladder
Primary #292827 (≈14:1 on #f7f5f2) · sub #141413 @65% (≈6:1) · soft #bfbcb6 (decorative only,
fails AA) · on-dark #ffffff / #ffffffcc (80%) / #ffffffa6 (65%).

### Colour rules
- Violet is the only chromatic *action* colour: primary fill, link text and the outline-button
  ring. Lilac is its lighter secondary form. [a][m]
- Maroon, teal and aubergine are grounds, never text or button colours on the light page. They
  appear as whole bands or whole cards. [m]
- Greys are made by alpha over ink (65% text, 20% or 5% borders, 5% hover), not by new hexes. [a]
- Focus is the one cool blue (#005fcc), kept out of the palette on purpose so focus is
  unmistakable. [a]

## Typography
Family: **Super Sans VF** (custom variable grotesk, weights 100–900) [m]. Also loaded, and used
sparingly: Super Serif VF, and Super Sans Mono VF (the code-text texture in the gradient band). [m]
Open substitute: **Inter** (variable; takes the exact 460/540 weights and has similar
proportions). Premium alternates: Söhne, Neue Haas Unica.
Weights: 460 (82%) · 540 (15%) · 700 (2%) · 600 (1%). Voice: **whisper**. [m]
Authored weight names: book 200 · regular **460** · medium **540** · semibold 600 · bold 700. [a]

Fluid scale, ratio ≈1.25 (Major Third), all `clamp()` between ~390 and 1440px [a]:

| Role | Size mobile → desktop | Weight | Line height | Tracking | Token |
|------|------|--------|-------------|----------|-------|
| display-large | 48 → 88px | 540 | 0.90–0.96 | −0.0275em | `--font-size-display-large` |
| display-medium | 44 → 76px | 540 | 0.96 | −0.0275em | `--font-size-display-medium` |
| display-small | 36 → 61px | 460 | 1.1 | −0.0275em | `--font-size-display-small` |
| heading-large | 32 → 49px | 460 | 1.2 | −0.0275em | `--font-size-heading-large` [m] h2 49/460 |
| heading-medium | 28 → 39px | 460 | 1.2 | −0.0275em | `--font-size-heading-medium` |
| heading-small | 24 → 31px | 460 | 1.2 | −0.0275em | `--font-size-heading-small` |
| heading-xsmall | 20 → 25px | 460 | 1.2 | −0.0275em | `--font-size-heading-xsmall` [m] h3 25/460 |
| text-large | 18 → 20px | 460 | 1.5 | −0.0075em | `--font-size-text-large` |
| text-medium | 18px | 540 | 1.5 | −0.0075em | `--font-size-text-medium` |
| text-small | 16px | 460 | 1.5 | 0 / −0.0075em | `--font-size-text-small` |
| text-xsmall | 14px | 460–600 | 1.2–1.5 | 0 | `--font-size-text-xsmall` (buttons 14/600) |

Rules:
- Two tracking values only: −0.0275em for headings and display, −0.0075em for running text
  (0 at 16px and below in practice). [a][m]
- Three line heights: 1.1 display, 1.2 headings, 1.5 text. [a]
- The hero H1 (64px measured, 540, lh 0.96) is the one place headlines go heavier. Section
  headings stay 460. [m]
- Buttons use 14–16px at 600 with lh 1: the only routinely heavier UI text. [m]

## Space & layout
Base unit **4px** · density comfortable · content max-width 1280px [a] (text blocks 900px [m]) ·
viewport padding 16px mobile / 32px desktop [a] · section padding 96px desktop [a].
Scale [a]: 4 6 8 10 12 16 20 24 28 32 36 40 48 56 64 72 80 96 128 160.
Most used [m]: 8 (control padding), 32–36 (section inner spacing), 16, 12. Gaps are mostly 4, 8, 16 and 32.
Breakpoints [m]: 640 · 1080 · 1280 (written as `min-width: 640.02px`), plus a short-height
query at 543px.
Rhythm: hero video (full bleed) → logo strip on paper → suite tabs and split feature cards
(white cards on paper, photo on the right half) → teal manifesto band (full bleed) → gradient
band with mono code text → maroon footer with a giant outlined wordmark.

## Shape & depth
Separation strategy: **hairline rings plus a whisper of warm layered shadow**. Surfaces separate
mostly by tone (white on paper); edges are 1px at 20% alpha, and floating things add blur.
| Element | Radius |
|---------|--------|
| Small/outline buttons, tabs | 8px |
| Primary buttons, product cards | 12px |
| Floating glass cards | 16px (large hero card 24px) |
| Menu item hover wash, focus ring | 6px |
| Pills / chat bubbles | 999px (bubble: 999 999 0 999) |
Ratio: controls 8 → cards 12–16 → floating 24.
Borders: `1px solid #73716d33` (sub) · `#73716d0d` (soft) · rings `inset 0 0 0 1px` in the action colour for outline buttons. [a][m]
Elevation (authored) [a]: always a `0 0 0 1px` 4% ring plus 2–4 soft offsets in warm #474543 at 1–6%:
- xsmall: `0 0 0 1px #4745430a, 0 4px 8px -2px #4745430f, 0 2px 4px 0 #4745430a, 0 1px 2px 0 #4745430a`
- small / medium / large add longer, fainter offsets (16px/8px/−8px at 1–2%).
Blur: `backdrop-filter: blur(12px)` on glass hero cards and the header. [m]
Texture: `repeating-linear-gradient(45deg, #73716d33 0 1px, transparent 1px 5px)` hatch, and a
`90deg 4px/8px` dash. [m]

## Motion & interaction
Authored durations: fast 100 · **base 200** · slow 300 · emphasis 400ms. Authored easing:
**`cubic-bezier(0.16, 1, 0.3, 1)`** (ease-out-expo). [a] In practice most transitions are
`color 0.2s ease`. [m]
Idioms [m]:
- Link hover: underline thickness goes to 2px, `underline-offset: 2px`.
- Outline button hover: the inset ring thickens from 1px to 2px (`box-shadow 0.2s`).
- Filled button hover and active: fill steps down (violet #714cb6 → #533192 → #3f256f).
- Menu item hover: ink 5% wash at a 6px radius.
- Focus: `outline: 2px solid #005fcc; outline-offset: 2px; border-radius: 6px` on every
  interactive element (via `:where`).
- Entrances: hero fades in and slides down, 0.3–0.5s `cubic-bezier(0.191, 0.703, 0.704, 0.952)`.
  The hero video crossfades in over 1s. `prefers-reduced-motion` is respected (15 queries).

## Components
### Primary button (filled)
**Role:** main conversion ("Try Go"). bg #714cb6 · text #fff · 16px/1 · 600 · pad 6px 20px
(~36px tall) · radius 12px · no border. Hover #533192, active #3f256f, disabled at 40% alpha. [m][a]

### Hero button
**Role:** the single hero CTA ("Get Superhuman"). Dark navy ground rgb(27,25,56) with a
`#353088` 1px ring and `0 1px 2px #1515153d`, text #fff 16px/460. pad 6px 6px 6px 16px ·
radius 12px. A violet gradient icon square (arrow) sits inset on the right. [m]

### Secondary filled button
bg #d4c7ff (lilac) · text #292827 · 14px/600 · pad 6px 16px · radius 8px. [m]

### Outline button
bg transparent · text #714cb6 (or ink / white on dark) · ring `inset 0 0 0 1px` in the same
colour · 16px/600 · pad 6px 20px · radius 12px (8px when small). Hover: ring 2px. [m]

### Text link
#714cb6, weight 460–540, same size as the surrounding text. Underlined on hover at 2px
thickness with a 2px offset. Paired with a small → arrow. [m]

### Header
White (#ffffff) bar, height ~67px [a]. Nav links 16px/460 ink, with menus behind chevrons. On
the hero, the header sits transparent over the video with white text, and its blur fades in on
scroll (`page_header-remove-blur` animation). [m]

### Suite tab strip
Four equal tabs on a white ground inside a hairline frame. The active tab gets the #e8e0ff
wash and a coloured product icon; the rest have monochrome icons. [m]

### Feature card (split)
White card on the paper band, hairline edge, `elevation-xsmall`. Left half: a product chip
(icon + 14px label), a 49px/460 heading, 16px sub-ink copy, a violet link and a hairline-circle
bullet list. Right half: a full-bleed photo or gradient with a glass UI mock. [m]

### Glass card (signature)
Translucent white fill (#ffffff 12–13%), 1px #ffffff1f border, radius 16px (24px large),
pad 12–16px, `backdrop-filter: blur(12px)`, white text 14–16px/460. Chips inside are pills with
a 1px white-20% ring. [m]

### Footer
Full-bleed #421d24. White 14px column headings at 700 (the only bold), links at 80% white,
and a giant outlined "SUPERHUMAN" wordmark bleeding off the bottom. [m]

### Input (derived)
Not prominent on the homepage. Authored tokens indicate: `--color-border-base` #8d8a86
border, hover `--color-transparent-hover` wash, focus ring as above, radius 8px. [a][i]

## Imagery & iconography
Soft, pastel, golden-hour photography and video: sky, clouds, profile portraits. It's shot
editorial and dreamy, never corporate. Product UI appears only as live-looking glass cards over
imagery, or inside split cards over gradients (violet → pink → cyan washes). The teal band
layers translucent coloured rectangles and script over a portrait. Icons are simple 16–20px
monochrome line glyphs. Product icons are small and colourful, and only appear in the suite
tabs.

## Dark mode
Authored with `light-dark()` (65 values). The marketing page forces light, but dark bands use
the dark roles. [a]
| Role | Light | Dark |
|------|-------|------|
| bg-primary | #ffffff | #421d24 (maroon) |
| bg-secondary | #f2f0eb | #241013 |
| bg-tertiary | #f7f5f2 | #0c4243 (teal) |
| bg-accent | #e8e0ff | #281647 |
| text-base / sub | #292827 / ink 65% | #ffffff / white 80% |
| action-primary (hover) | #714cb6 (#533192) | #d4c7ff (#bea1f5) |
| border-sub | #73716d 20% | #fcfaf7 20% |

## Do
- Set nearly everything at weight 460. Save 540 for the one display line per view. It's the
  voice.
- Use tracking −0.0275em on anything 20px and up, −0.0075em on text. The tight headings are
  what make the light weight look confident.
- Put white cards on warm paper (#f7f5f2 / #f2f0eb), not white on white. Tone does the
  separating.
- Make greys from ink at alpha (65% / 20% / 5%). It keeps every grey the same warm family.
- Flip a whole section to the dark theme (maroon/teal/aubergine ground, white ink, lilac
  actions) when you want contrast. Don't paint individual components dark.
- Present product UI as glass objects over imagery, with blur 12px and a 1px white-12% edge.

## Don't
- Don't use bold headlines. 700 only appears at 14px in the footer.
- Don't use cold greys or pure black text. The ramp is warm, from #fcfaf7 to #141413.
- Don't use heavy drop shadows. Elevation is a 4% ring plus shadows at ≤6% alpha.
- Don't give violet a second job. It's action and link only; lilac and the wash are its only
  tints.
- Don't use maroon, teal or aubergine as text or small accents. They're grounds.
- Don't let blue appear anywhere except the focus ring.

## Translating to app UI
What transfers as-is: warm neutral ramp and alpha greys · violet action / lilac wash roles ·
460/540 weights with the two tracking values · 1.1/1.2/1.5 line heights · 8/12/16 radii ·
ring-plus-whisper elevation · focus ring · 200ms + ease-out-expo motion · link and outline-button
hover idioms.
What compresses:
| Marketing value | App value |
|-----------------|-----------|
| display 64–88px | page title 24–28px (heading-small), 460, −0.0275em |
| heading-large 49px | section title 20px (heading-xsmall min), 460 |
| section padding 96px | 24–32px panels; 16px card padding |
| hero button (navy + icon square) | one per app at most (onboarding or upgrade), otherwise a violet primary |
| full-bleed video | none; keep one soft gradient for login and empty states |
Signature moves in an app: glass cards → command palette, popovers and toasts (white 70–85% +
blur 12px + ring). Paper bands → app canvas #f7f5f2, with a #f2f0eb sidebar and white content
cards. Local dark theme → a maroon or aubergine sidebar or a single dark header region.
Hatched texture → empty states and dividers only.
Derived components: data tables (sub-ink headers at 14/540, hairline rows, ink-5% hover wash),
sidebar nav (16/460 ink, lilac-wash active item with 6–8px radius), modal (white, 16px radius,
elevation-medium, overlay #141413 at 60% [a]), inputs (as above).

## Agent prompt guide
Quick reference: canvas #f7f5f2 · alt band #f2f0eb · surface #ffffff · ink #292827 · sub ink
#141413 @65% · line #73716d @20% · accent/link #714cb6 · primary action #714cb6 (hover #533192)
· secondary action #d4c7ff with ink text · selected wash #e8e0ff · dark grounds #421d24 /
#0c4243 / #281647 · focus #005fcc · font Inter 460 (Super Sans VF) · ease cubic-bezier(0.16,1,0.3,1) 200ms.

1. *Primary button:* bg #714cb6, white text 16px weight 600 line-height 1, padding 6px 20px,
   radius 12px, no border. Hover #533192, active #3f256f, transition background-color 200ms
   cubic-bezier(0.16,1,0.3,1). Focus: 2px solid #005fcc outline, 2px offset.
2. *Feature card:* white on #f7f5f2, radius 16px, 1px #73716d33 border plus shadow
   `0 0 0 1px #4745430a, 0 4px 8px -2px #4745430f`. Heading 25px weight 460, letter-spacing
   −0.0275em, #292827. Body 16px/1.5 in #141413a6. Violet "Learn more →" link that underlines
   at 2px on hover.
3. *Glass popover:* bg rgba(255,255,255,0.72), backdrop-filter blur(12px), 1px
   rgba(255,255,255,0.4) border, radius 16px, padding 12px 16px, 14px/1.5 weight 460 ink.
   Pills inside: radius 999px, 1px #73716d33 ring.
4. *Sidebar nav:* #f2f0eb ground, items 16px weight 460 #292827, padding 6px 12px, radius 8px.
   Hover: #14141312 wash. Active: #e8e0ff wash with a coloured icon.
5. *Dark section:* #421d24 ground, heading 39px weight 460 white, −0.0275em. Body white at 80%.
   Outline button: white text, `inset 0 0 0 1px #ffffffe6` ring, radius 12px, ring 2px on hover.

## Tokens
See `tokens.css` (CSS custom properties) and `tailwind-theme.css` (Tailwind v4 `@theme`).

## Open questions
- Where Super Serif VF is used wasn't measured on the homepage. It may be for editorial or
  blog pages. Dissect /blog to confirm.
- The homepage content rotates between loads (different promo cards and banner). Area shares
  vary ±5% between runs.
- The logged-in product (Superhuman Mail/Go) wasn't measured. It's the better model for dense
  app UI if you can get to it.

### Notes vs Refero's breakdown
Refero says maroon is "the single primary action fill" and violet is "never a button fill". The
authored `--color-action-primary` is violet, and "Try Go" is a violet-filled button; maroon is
only a ground. Refero gives a Minor Third (1.2) scale; the authored scale is ≈1.25 and fluid.
Refero says "no shadows"; there's an authored four-step elevation scale in use on cards. Refero
doesn't mention the authored dark theme, the ease-out-expo token, or the hatched texture.
