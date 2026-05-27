# Plan: Add standalone search link to top nav (Issue #254)

## Overview

Add a "Search" link to the top navigation so it is prominently accessible from every page. Two placements are used with responsive show/hide to avoid duplication at any viewport width:

1. **Mobile header bar** — a search icon `<a>` placed inside the hamburger div (`md:hidden`), always visible on mobile next to the hamburger button. One tap to reach search.
2. **Desktop nav** — a "Search" text link inside `#menu` with `hidden md:inline-flex`, visible only on desktop where `#menu` is always shown.

The "Search the DDNP" entry is removed from `instructionOptions` (per the issue's intent: "instead of placing it in the dropdown"), and the now-unused `faMagnifyingGlass` import is cleaned up.

## Tasks

- [x] **Task 1: Remove search from `instructionOptions` and clean up import**
  File: `src/components/Header.astro`
  - Remove `faMagnifyingGlass` from the FontAwesome import block (line 13)
  - Remove the "Search the DDNP" entry from `instructionOptions` (lines 107–113)

- [x] **Task 2: Add always-visible search icon for mobile**
  File: `src/components/Header.astro`
  In the hamburger div (`class="-mr-2 sm:-mr-6 flex items-center md:hidden"`), add a search icon `<a>` before the hamburger button:
  ```html
  <a href="/search" aria-label="Search"
     class="rounded-md p-2 inline-flex items-center justify-center text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ddnpblue">
    <!-- inline magnifying glass SVG, aria-hidden="true", size 24 -->
  </a>
  ```
  This is `md:hidden` by virtue of its parent div — visible on mobile, gone on desktop.

- [x] **Task 3: Add "Search" text link for desktop**
  File: `src/components/Header.astro`
  After the `links.map(...)` block inside `#menu`, add:
  ```html
  <a href="/search"
     aria-label="Search"
     aria-current={Astro.url.pathname === '/search' ? 'page' : undefined}
     class="hidden md:inline-flex group rounded-md items-center gap-x-1 text-base font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ddnpblue">
    <!-- inline magnifying glass SVG, aria-hidden="true" -->
    <span>Search</span>
  </a>
  ```
  `hidden md:inline-flex` ensures it only appears on desktop where `#menu` is always visible.

## Key Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Icon approach | Inline SVG in Astro template | No new file; `astro-icon` has no external packs; avoids React island |
| Mobile placement | In hamburger div (outside `#menu`) | Always visible on mobile — one tap to reach search |
| Desktop placement | Inside `#menu` with `hidden md:inline-flex` | Consistent with other nav items; no duplication at any viewport |
| Remove from dropdown | Yes | Issue says "instead of" the dropdown; keeping both creates confusing duplication |
| Accessible label | `aria-label` + visible text (desktop) / `aria-label` only (mobile icon) | Mobile: icon-only link needs label; desktop: text is visible |
| Focus ring | `focus:ring-ddnpblue` | Matches NavPopover button focus style (not the hamburger's `ring-neutral-50`) |
| Active state | `aria-current="page"` on desktop link | Only `<a>` elements in `#menu` can express active state; hamburger icon doesn't need it |

## Inline SVG

Standard magnifying glass, 24×24, consistent with Heroicons outline style used elsewhere:

```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
     stroke-width="1.5" stroke="currentColor" width="24" height="24" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.197 5.197a7.5 7.5 0 0 0 10.606 10.606z" />
</svg>
```

## Risks & Unknowns

- The hamburger div uses `sm:-mr-6` for spacing — adding a search icon may need a small gap adjustment (`gap-x-2` or similar) to avoid crowding.
- Verify the `#menu` search link is truly hidden on mobile (the CSS toggle hides `#menu` at max-width 768px, and `hidden md:inline-flex` reinforces this).

## Testing

- [ ] Desktop: "Search" text link visible in nav on all pages; active state on `/search`
- [ ] Mobile: magnifying glass icon visible in header bar at all times; hamburger menu does not need to be opened
- [ ] No search link visible in "Using the DDNP" dropdown
- [ ] No duplicate search links visible at any viewport width
- [ ] Focus ring color matches other nav items (`ddnpblue`)
- [ ] Screen reader: mobile icon announces as "Search"; desktop link announces correctly
