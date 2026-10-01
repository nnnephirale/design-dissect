# Feedback and taste

The aim is a small, increasingly precise body of guidance, not a growing pile of notes. Every
reaction the user gives is evidence. Your job is to put it at the right scope, in the right
layer, and then leave each document *tighter* than you found it.

## 1. Route the feedback

Ask which of these it is about:

| It's about… | Example | Goes to |
|---|---|---|
| The reference was **misread** | "you missed how the colour blocks are proportioned", "their buttons aren't pills" | **DESIGN.md**: correct the observation or rule in place |
| **This project or screen** | "make this heading smaller", "too much violet on this dashboard" | **DESIGN-NOTES.md** in the project, tagged with its scope |
| **The user's taste in general** | "I always want warmer greys", "I hate bouncy motion", or the same direction for the third time | **Taste file**: as a candidate, or promoted if the evidence is there |

When it's ambiguous, choose the *narrower* scope, and say so in one line so the user can widen
it ("noted for this screen; tell me if you mean everywhere").

## 2. Keep the scope

Record what was actually said, at the scope it was said. Scope tags:
`screen:<name>` · `project` · `reference:<site>` · `lasting`.

- "Make this heading smaller" → `screen:dashboard` "page title one step smaller". *Not* "all
  headings small".
- "This feels too loud" on a validation screen → `reference:<site>` or `project`, depending on
  whether the loudness came from the reference's rules or from your translation. Check
  DESIGN.md before deciding.
- Resolve scope before generalising. A user who shrinks one heading may love large display
  type elsewhere.

## 3. Candidates and promotion

The taste file has two sections: **Preferences** (lasting) and **Candidates** (pending
evidence). A candidate is one line: the direction, then the dated places it was seen.

```
- Smaller, lighter headings than the reference suggests — seen: dashboard (2026-10-02), settings (2026-10-05)
```

Promote a candidate to a preference when either:
- the same direction appears in **2–3 separate places** (different screens, projects or
  references), or
- the user says it outright: "always", "never", "in general", "I prefer…".

On promotion, rewrite it as a rule with its reason and scope, and delete the candidate line:
```
- Headings: one step smaller and lighter than a reference's marketing scale. Why: the content should carry the page (3 projects).
```

Candidates that go 60 days, or three projects, without new evidence get dropped.

## 4. Reconcile every time you write

Before saving any of the three files:
- **Contradictions.** If the new note conflicts with an existing one at the *same* scope, the
  newest wins: replace, don't append. At *different* scopes, both can stand; the narrower
  scope wins where it applies.
- **Outdated guidance.** If a note is superseded by a correction or a changed direction, remove
  it.
- **Repetition.** Merge notes that say the same thing into one sharper line, keeping the
  strongest evidence.
- **Promotion.** Check whether any candidate has now met the bar.

## 5. Caps (the documents must not bloat)

| File | Cap | When over |
|---|---|---|
| Taste file: Preferences | ~40 one-line rules | Merge overlapping rules and drop the weakest; ask the user if unsure |
| Taste file: Candidates | ~15 | Drop the oldest with the least evidence |
| DESIGN-NOTES.md (project) | ~30 lines | Consolidate notes into project rules |
| DESIGN.md | Its template sections, nothing more | Tighten into rules and ratios. No changelog section; git holds the history |

Every rule is one line: the direction, the reason, and its scope or evidence. No stories, no
transcripts. A raw feedback log is optional, and only if the user asks for one: a separate
file that agents don't load by default.

## 6. Files

**Taste file** (path from settings; default `~/design-systems/TASTE.md`). If the user already
keeps design preferences somewhere (a design-preferences skill, a section of AGENTS.md), use
that file instead of starting a new one. Keep its structure and add Candidates as a section at
the end.

```markdown
# Taste
## Preferences
- <rule> — <why> (<scope/evidence>)
## Candidates
- <direction> — seen: <place> (<date>), <place> (<date>)
```

**DESIGN-NOTES.md** (project root):

```markdown
# Design notes
Reference: <library>/<site>/DESIGN.md · Precedence: reference wins | house style wins | mixed: <what>
## Project rules
- <rule> (<scope>)
## Screen notes
- screen:<name> — <note> (<date>)
```

## 7. Close the loop

After every round, tell the user in one line what changed and where:
- "Corrected DESIGN.md: plates show 15–25%, not full-bleed."
- "Noted for this dashboard: page title one step smaller."
- "Promoted to lasting: headings lighter than reference scale (third project)."

**Show it on the specimen (only when the `specimen comments` setting is on).** Append the feedback to `<library>/<site>/feedback.json` for
the reference it concerns, then rebuild the specimen (`node build-specimen.mjs <out>`). Each
entry becomes a comment card beside the section it's about: a faint `]` bracket on the
section, and a card at 50% opacity that goes to 100% on hover. Keep one entry per piece of
feedback, and update its `status` and `reply` rather than adding new entries.

**On-page comments are the strongest evidence of taste.** They are the user's own words, at
the moment of looking, pinned to the exact section. `feedback.json` is that evidence; the three
layers are what it distils into. So agents *do* read it: before design or UI work, read the
open comments and the recent ones across every reference, and route each open one through
§1–§4. With the `design-feedback` MCP installed (`feedback/install.sh` registers it), use its tools:
`get_feedback` to read, `add_feedback` to log chat feedback, `resolve_feedback` to reply,
route and close. They also rebuild the specimen. Without it, read and edit the files directly.

```json
{ "id": "sh-1", "anchor": "composition", "author": "<user's name or You>", "date": "2026-09-29T21:10",
  "text": "<the user's words, lightly trimmed>", "layer": "reference | project | candidate | lasting",
  "target": "<where it went, e.g. DESIGN.md › Composition › Panel recipes>", "status": "open | resolved",
  "reply": { "author": "Claude", "date": "…", "text": "<one or two lines on what changed>" } }
```

Only open comments appear on the specimen. Resolving one (by the user's tick, or by you after acting on it) removes it from the page; it stays in `feedback.json` as the record. The specimen is interactive. The user can tick to resolve (with undo), select text and press ⌘⇧M (or ⌥⌘M,
or the floating + button) to add a comment with a `quote`, and edit or delete from ⋮.
Every change syncs to `feedback.json` through the design-feedback service on `:4777`
(`feedback/server.mjs`), whether the page is open at `http://localhost:4777/<site>/specimen.html`
or straight from Finder (`file://`). The user never starts it by hand: `build-specimen.mjs`
writes an `STARTTHIS.command` beside every specimen, which starts the service quietly if
needed and opens the page. Point the user at that file when showing a specimen. The service
merges per id (newest wins, nothing missing is erased), so a stale tab never undoes an agent's
reply. If it isn't running, changes wait in the browser and sync on the next visit;
`node scripts/serve-specimen.mjs <out>` serves a single folder without installing anything. Entries the user added have `status: "open"` and no `layer`. When asked to act
on them, route each one, then set `reply`, `layer`, `target`, `status` and `updated` (newest
`updated` wins when the page merges browser-side edits).

Anchors are the specimen's sections: `source`, `semantic`, `palette`, `type`, `shape`, `space`,
`composition`, `textures` and `components`, or `label:<text>` to point at one component block
by its `data-label`.

If the taste file is version-controlled or synced (e.g. a dotfiles repo), commit and push it
the way that repo expects.
