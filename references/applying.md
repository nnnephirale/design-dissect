# Applying a dissected language to a web app

The goal is that someone who knows the source site sees your app and recognises the family
resemblance, and that the app still works as an app: dense where it needs to be, legible, and
accessible. You're porting decisions, not pixels.

## 0. Before touching code

- Read the project's DESIGN.md (the dissect output) in full, especially Signature moves,
  Do/Don't and Translating to app UI.
- Inventory the project's styling: Tailwind config or `@theme`, global CSS variables, a
  component library (shadcn, Radix, MUI…), inline styles, and hard-coded hex values
  (`grep -rEo '#[0-9a-fA-F]{3,8}\b' src | sort | uniq -c | sort -rn | head`). Note the screens
  that matter most.
- Take "before" screenshots of 2–4 key screens at desktop and mobile widths.
- Settle precedence once per project and record it in `DESIGN-NOTES.md` (see
  `feedback-and-taste.md`): does the reference win, does the user's existing house style win,
  or is it mixed (say which parts)? Use the `precedence default` setting if the user has one;
  otherwise ask. Then name, in one line, the house defaults being overridden (e.g. "switching to
  warm parchment greys and 12/16px radii instead of your neutral greys and 20px cards"), so the
  choice is conscious. Lasting preferences in the taste file still apply wherever the reference
  is silent.

## 1. Wire the tokens in, semantically

- Copy `tokens.css` into the project, or merge `tailwind-theme.css` into its Tailwind v4 entry
  CSS.
- Map the project's existing semantic variables onto the new aliases (`--background` →
  `var(--canvas)`, `--foreground` → `var(--ink)`, `--primary` → `var(--action)`, `--border` →
  `var(--line)`, and so on). For shadcn-style projects, remap its variables rather than
  editing every component.
- Replace hard-coded values with tokens as you touch components. Don't do a blind global hex
  swap. The same grey often plays different roles in different places.
- Load the font: the open substitute from Google Fonts (or the project's existing font
  pipeline), with the source name first in the stack.

## 2. Translate scale for app density

Marketing pages are loud and sparse; apps are quiet and dense. Keep the ratios and the voice
and compress the magnitudes:

| Keep exactly | Compress | Usually drop |
|---|---|---|
| Colour roles and the neutral/chroma ratio | Display sizes → page titles 22–28px | Full-bleed hero photography |
| Weight voice (e.g. 460 headlines) | Section gaps 64–128 → 16–32 | Atmospheric gradient bands (keep one for empty states or login, maybe) |
| Tracking curve (em per size) | Button height 48 → 32–36 | Scroll-triggered entrance animations |
| Radius ratios between control/card/pill | Card padding (keep if already ≤ 24) | Announcement banners |
| Separation strategy (rings vs shadows vs tone) | Container width → app shell widths | |
| Interaction idioms (hover ring thickens, etc.) | | |
| Easing and duration | | |
| Surface ladder order | | |

Keep the tracking curve when you shrink type. Recompute em tracking for the new sizes from
the documented curve rather than carrying the px values over.

## 3. Derive what the source doesn't have

Apps need components that marketing sites never show: data tables, sidebars, tabs,
dropdowns, modals, toasts, form validation, empty states. Derive each one from the rules and
say so in a code comment or in the DESIGN.md "Derived components" list:
- **Tables**: ink ladder for header vs cell, `--line` hairlines or the ring strategy, row
  hover as the `--surface-sunken` wash, and tabular numerals if the source uses them.
- **Sidebar/nav**: the source's nav link treatment (weight, colour, hover idiom); the active
  state uses the source's selected pattern (e.g. a lilac wash).
- **Modals/popovers**: the source's float depth (glass blur, or the layered shadow stack) and
  card radius.
- **Inputs**: the source's input if it has one; otherwise control radius, ring border, and
  the focus idiom (outline + offset in `--focus`).
- **Semantic states** (error/success/warning): the source's authored status colours if it has
  them; otherwise the most muted versions that sit at the same lightness as the accent. Keep
  them small (text + icon), so they don't break the neutral/chroma ratio.

## 4. Preserve the signature moves

For each move in DESIGN.md, decide how it survives in the app and apply it deliberately.
That is where the resemblance lives. Examples:
- "Glass UI cards over photography" → frosted command palette or popover over the app canvas.
- "One dark band per page" → a dark sidebar or a single dark header region, not dark cards
  everywhere.
- "Single maroon CTA" → exactly one filled primary action per view.

## 5. Keep it an app

- Accessibility still applies: body text ≥ 4.5:1 against its surface. If a light-weight
  headline or muted ink fails at app sizes, nudge the weight or ink by one step and note it.
- Keep the source's reduced-motion behaviour, and add it if the source lacks it.
- Take the design language, not the brand: no source logos, product names, illustration or
  photography, and no copied self-hosted font files.

## 6. Verify

Take "after" screenshots of the same screens and widths and show before/after. Then check
against DESIGN.md:
- Neutral/chroma ratio roughly matches.
- Only the documented roles use each colour.
- Headlines are at the documented weight.
- The separation strategy is the same (rings, not shadows, or whichever the source uses).
- Every signature move is present.

Fix drift, then hand over with a short list of what was derived rather than sourced. Route the
user's reactions through `feedback-and-taste.md`: project-scoped notes go in `DESIGN-NOTES.md`,
and repeated directions become candidates in the taste file.
