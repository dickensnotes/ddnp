# Homepage Novel Cards Redesign Plan

**Created**: 2026-09-15
**Branch**: `claude/homepage-novel-cards-redesign-b63aef`
**Scope**: Bring the teaching-page card style (`TeachingActivityCard.astro`) to the homepage novel cards, and make the homepage handle all ten planned editions.

## Overview

The teaching page's new cards (thumbnail on the left; title, attribution, and a one-sentence description on the right; `ddnpblue` treatment) are compact and scannable, and they match the other blue components on the site (`MiradorLink`, `MiradorCard`). The homepage still uses the older `Card.astro`: a large full-bleed image with the text below, in `ddnpgreen`. That's now the only green card on the site, and it doesn't scale.

The Additional Working Notes page commits to **ten editions by December 2027** (Old Curiosity Shop → Edwin Drood), so the homepage has to go from 4 cards to 10 without becoming a long scroll of huge images.

The approach is to extract one shared card shell from `TeachingActivityCard`, add a single `novels` data module, and render the homepage as a two-column grid of horizontal cards, with a separate state for editions not yet released.

## What we have today (measured in dev, 2026-09-15)

| | Homepage `Card.astro` | Teaching `TeachingActivityCard.astro` |
|---|---|---|
| Layout | Image on top, text below | 128px square thumbnail left, text right |
| Size at 1280px viewport | 634 × **626 px** per card (image alone is 492px tall) | ~610 × 150–190 px |
| Size at 375px viewport | 377 × 506 px, **flush to screen edges, 2px overflow** | 343 × 262–312 px, 16px gutter |
| Color | `bg-ddnpgreen`, grey border | `bg-ddnpblue/10`, `border-ddnpblue` |
| Heading | `h2`, no section heading above | `h3` under the page's `h2` |
| Images | 2700×2100 source, **394–750 KB each** (~2.1 MB for 4 cards) | 9–36 KB thumbnails |
| Title | Plain text; `TODO: italicize title, but not date` | n/a |

At 10 novels, the current design would be about **3,200px of cards and 5+ MB of images** on the homepage.

Other notes:
- The mobile overflow comes from `w-full` + `border` combined with `* { box-sizing: content-box }` in `src/styles/global.scss:67`. The homepage `<main>` also has no horizontal padding, unlike `page.astro` (`px-4 sm:px-6`).
- Novel names and dates are repeated in three places: `src/pages/index.astro`, `bookOptions` in `src/components/Header.astro`, and `src/pages/notes/additional-working-notes/index.mdx`.
- `public/images/home/little-dorrit-wn-04-card.*` is also referenced from `src/pages/notes/little-dorrit/index.mdx`, so the old card images can't all be deleted.

## Design direction

### Card anatomy (published edition)

```
┌───────────────────────────────────────────────────┐
│ ┌─────────┐  Bleak House                          │  h3 · novel title italic
│ │         │  1852–53                              │  meta line · italic ddnpgrey
│ │  thumb  │  Explore Dickens's management of the  │  description · gray-700
│ │ 128×128 │  novel's dual narrators with our      │
│ └─────────┘  introduction and annotations.        │
└───────────────────────────────────────────────────┘
  bg-ddnpblue/10 · border-ddnpblue · hover:bg-ddnpblue/20 + shadow-md
```

This follows the teaching card line for line: **title → meta → description**. The teaching card's contributor line becomes the edition's dates (see Decisions).

- **Drop "Working Notes" from every title.** It's the same on every card, so it moves to a section heading. This also frees space so titles fit on one or two lines in a 2-column grid.
- **Italicize the novel title but not the dates.** This resolves the TODO in `Card.astro`.
- **Use en dashes for date ranges** (`1852–53`), as in the scholarly text. The nav currently uses hyphens.

### Card anatomy (forthcoming edition)

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  ┌ ─ ─ ─ ─ ┐  Our Mutual Friend
  ╎  (quill) ╎  1864–65 · Edition due December 2027
  ╎         ╎  Full set of working notes for Dickens's
  └ ─ ─ ─ ─ ┘  last completed monthly novel.
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  border-dashed border-ddnpblue/70 · no fill · no hover · not a link
```

- Render forthcoming cards as a `<div>`, not an `<a>`. They have nowhere to go yet, and this keeps them out of the tab order.
- Show the status **in text** ("Edition due December 2027"), not just through the dashed and muted styling.
- For the placeholder thumbnail, reuse the teaching card's dashed "image to come" tile, but show the `faFeatherPointed` icon that the nav already uses for novels (rendered statically, no `client:` directive). Any card without an `img` falls back to this tile, so it also covers published editions awaiting a thumbnail.

### Grid and density

- `grid-cols-1 lg:grid-cols-2`, `gap-4`. At `lg` each card is ~480px wide, which leaves ~290px for text next to the 128px thumbnail: enough for "The Mystery of Edwin Drood" on two lines. Three columns (~410px) crowds the text, and two columns at `md` (~350px) is too narrow. Use one column below `lg`.
- **Published editions first, then forthcoming, each group chronological** (decision 6). Within each group the order matches the nav and the Additional Working Notes page.
- Expected height at 1280px with 10 novels: 5 rows × ~185px ≈ **950px**, less than the four cards take today (~1,270px).
- Mobile gets longer (10 × ~270px). That's acceptable for now, since each card is roughly half the height of today's mobile card. If it feels long, a later option is a smaller mobile thumbnail (`h-20 w-20`).
- Wrap the grid in a `<section aria-labelledby>` with an `h2`, and render the cards as a `<ul role="list">`. Screen readers then announce "list, 10 items" and the heading outline becomes h1 (hero) → h2 (section) → h3 (cards).
- End with a quiet text link below the grid: "More about the forthcoming editions →" pointing to `/notes/additional-working-notes`.

### Color, contrast, and focus

- Use only existing tokens: `ddnpblue` for the surface and border, `ddnpgrey` for meta text, and Tailwind `gray-700`/`gray-900` for body and heading text. **Never use `ddnpblue` for text**: it's ~2.8:1 on white.
- Checked contrast: `ddnpgrey` on `bg-ddnpblue/10` ≈ 5.5:1, and on white ≈ 6.1:1. Both pass AA.
- **The shared focus ring needs attention.** The teaching card's `outline-ddnpblue` is ~2.8:1 against white, below the 3:1 required for focus indicators (WCAG 1.4.11). Switch the shared shell to a darker ring, e.g. `outline-ddnpgrey`. This fixes the teaching card and the novel cards together.

## Decisions

Resolved with Scott on 2026-09-15:

1. **Forthcoming editions:** build all ten so the editors can see the full layout. Whether to ship them is decided after editor review.
2. **Meta line:** **dates only**. Every edition is edited by Anna or Adam, so an "Edited by" credit would repeat on every card. Forthcoming cards add "· Edition due {release}".
3. **Section heading:** **"The Working Notes"**.
4. **Forthcoming descriptions:** **Anna and Adam will write them.** Until then, `src/data/novels.js` uses the Additional Working Notes blurbs as placeholders.
5. **Thumbnail crops:** proposed crops from the existing card images, pending editor approval. Each is a square from the top of the right-hand page showing the handwritten title and the first chapter heading.

6. **Card order:** **published editions first, then forthcoming**, each group in chronological order. This leads with what readers can use today. `src/data/novels.js` stays chronological; `index.astro` applies a stable sort.

## Implementation tasks

Tasks 1–7 were built on this branch on 2026-09-15 as the editor-review mockup. Where the build differs from the original plan, the difference is noted.

### Phase A: Shared card shell (no visual change to the teaching page)

- [x] **Task 1: Extract `ThumbnailCard.astro` from `TeachingActivityCard.astro`**
  Files: `src/components/ThumbnailCard.astro` (new)

  - Props: `href?`, `img?`, `alt = ""`, `title`, `meta`, `description` (all three rendered with `set:html`), `variant = "default" | "forthcoming"`.
  - Root is `<a>` for the default variant with an `href`, otherwise `<div>`.
  - The `<img>` has `width`/`height`, `loading="lazy"`, and `decoding="async"`.
  - Forthcoming placeholder tile: `faFeatherPointed` inlined as static SVG from its icon definition, so no React island is needed. The default variant keeps the "image to come" tile unchanged.
  - Focus ring changed from `outline-ddnpblue` to `outline-ddnpgrey` (contrast).
  - *Deviation:* no `box-border`. The root has no explicit width or height, so it wasn't needed, and leaving it off guarantees the teaching page renders unchanged.
  - *Gotcha:* don't use `bg-white` on these cards. `global.scss` generates a `.bg-white` utility pointing at an undefined variable (`var(--c-color)`), so the background comes out transparent.

- [x] **Task 2: Make `TeachingActivityCard` a thin wrapper**
  Files: `src/components/TeachingActivityCard.astro`

  Maps `contributor` → `meta`. `TeachingActivities.astro` is unchanged.

  **Verified**: Card left edge, width, height, thumbnail size, and heading position on `/usage/teaching` are identical to the pixel before and after, at 375px and 1280px.

### Phase B: Novel data

- [x] **Task 3: Create `src/data/novels.js`**
  Ten entries, chronological: `title`, `dates` (en dashes), `status`, `release`, `href`, `thumbnail`, `description`.
  *Deviation:* explicit `href` instead of a derived `slug`. Forthcoming editions have `href: null`, so the code doesn't assume URL names for pages that don't exist yet (CLAUDE.md asks for sign-off before adding novels). No `editor` field (decision 2).

### Phase C: Thumbnails

- [x] **Task 4: Produce square thumbnails**
  `public/images/novels/{slug}-thumb.webp`, 320×320, 10–20 KB each. Cropped as an 810px square from each 2700×2100 card source (top of the right-hand page), then resized.
  **Pending**: editor approval of the crops.
  **Note**: Keep `public/images/home/little-dorrit-wn-04-card.*`, which `src/pages/notes/little-dorrit/index.mdx` still references. The other `images/home/*-card.*` files are no longer referenced and can be removed in the final PR.

### Phase D: Homepage

- [x] **Task 5: Add `NovelCard.astro`**
  `title` = `<i>{title}</i>`; `meta` = dates, plus "· Edition due {release}" when forthcoming; `href` only when published.

- [x] **Task 6: Rebuild the homepage section**
  `<section aria-labelledby="working-notes-heading">` with `h2` "The Working Notes", `<ul role="list" class="grid grid-cols-1 gap-4 lg:grid-cols-2">`, and each `<li class="grid">` wrapping a `NovelCard` (grid items stretch to equal row heights). A "More about the forthcoming editions →" link follows.
  Cards are ordered published first, then forthcoming (decision 6), using a stable sort so each group stays chronological.

- [x] **Task 7: Remove `Card.astro`**

### Phase E (optional, separable): Share novel data with the nav

- [ ] **Task 8: Build `bookOptions` in `Header.astro` from `novels.js`**
  List published editions plus the existing "Additional Working Notes" entry. This removes the third copy of names and dates, and new editions appear in the nav when their `status` changes. With ten editions the dropdown may need a grouped or two-column layout. Treat that as a separate design question.

### Before merging (after editor review)

- [x] Apply the ordering decision (6)
- [ ] Replace placeholder forthcoming descriptions with Anna and Adam's copy
- [ ] Swap in any revised thumbnail crops
- [ ] Remove unreferenced `public/images/home/*-card.*` files (keep the Little Dorrit pair)

## Verification

- [x] `astro build` succeeds (27 pages)
- [x] Homepage at 375px and 1280px: no horizontal scroll (document width equals viewport), 16px/24px gutters, equal-height cards per row (all 172px at 1280px)
- [x] Teaching page unchanged apart from the focus ring (measured, not just eyeballed)
- [x] Keyboard: forthcoming cards are skipped by Tab (checked with chronological order; they are `<div>`s regardless of position); the `ddnpgrey` focus ring is clearly visible
- [x] No console errors on the homepage or teaching page
- [ ] Check at 768, 1024, and 1536px
- [ ] Screen reader pass (heading outline, list count)
- [ ] Full `pnpm run build` (includes the search index build) on the Vercel preview

## Out of scope / follow-ups

- Nav dropdown layout for 10 editions (see Task 8).
- Whether "Additional Working Notes" stays in the nav and on the homepage after all editions are published in December 2027.
- A compact mobile thumbnail size, if mobile length becomes a concern once all ten editions are live.
- Converting `TeachingActivities.astro` to `<ul role="list">` for the same list semantics (small, safe, and consistent, but not required).
