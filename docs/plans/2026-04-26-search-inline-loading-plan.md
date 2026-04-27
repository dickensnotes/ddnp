# Plan: Inline Loading for Search

**Date:** 2026-04-26
**Branch:** `worktree-search-loading-improvement`

## Overview

Remove the full-page `LoadingSpinner` box. Instead, render `SearchInput` immediately in a disabled state during index fetch, with a small spinner in the submit button. The grid (filters + results) stays hidden until loading completes, so no empty filter panel is shown. A visually-hidden live region handles the screen-reader announcement that the current `role="status"` block provides.

## Tasks

- [x] **Task 1: Update `SearchInput` to accept and handle `isLoading` prop**
  Files: `src/components/search/SearchInput.jsx`
  - Add `isLoading = false` to destructured props
  - Add `disabled={isLoading}` to the `<input>` and submit `<button>`
  - Add `disabled:opacity-50 disabled:cursor-not-allowed` classes to both
  - Add `aria-busy={isLoading}` to the submit `<button>`
  - When `isLoading`, swap `faMagnifyingGlass` for `faSpinner` with `animate-spin` class and import `faSpinner`
  - Done when: form renders and is visually/functionally disabled during load

- [x] **Task 2: Update `SearchPage` — remove early return, pass `isLoading`, gate the grid**
  Files: `src/components/search/SearchPage.jsx`
  Depends on: Task 1
  - Remove `if (isLoading) return <LoadingSpinner />;` and the `LoadingSpinner` import
  - Add a visually-hidden `aria-live="polite"` `<p>` just above `<SearchInput>` that renders `"Loading search index..."` when `isLoading`, empty string when not
  - Pass `isLoading={isLoading}` to `<SearchInput>`
  - Wrap the `<div className="grid ...">` (SearchFilters + SearchResults) in `{!isLoading && (...)}` to prevent the empty filter panel from rendering during load
  - Done when: full page renders immediately with disabled form; grid appears after load

- [x] **Task 3: Delete `LoadingSpinner.jsx`**
  Files: `src/components/search/LoadingSpinner.jsx`
  Depends on: Task 2
  - Confirm no remaining imports (`grep -r "LoadingSpinner" src/`), then delete
  - Done when: file removed, no dead imports

## Key Decisions

- **Spinner in the button, not beside the input** — the button is the natural interaction point that becomes unavailable; co-locating the spinner there is the most informative placement.
- **Grid hidden during load** — avoids showing an empty "Filter Results" panel. `SearchFilters` doesn't crash on empty data but an empty panel is confusing UX.
- **Visually-hidden live region in `SearchPage`** — keeps `SearchInput` a dumb presentational component; `SearchPage` owns async state and is the right owner of the announcement.

## Risks & Unknowns

- Network failure during index fetch has no error state (pre-existing gap, out of scope).
- Tailwind `disabled:` variant is active by default in v3 — no config change needed.

## Testing Strategy

- Manual only (no test suite): load `/search`, confirm form appears immediately with spinner in button, form is non-interactive, grid is absent; then confirm both resolve once the index loads.
- Check with a screen reader or axe DevTools that the live region fires on load.
