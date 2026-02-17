# Accessibility Implementation Plan - Phase 1 (Critical & High Priority)

**Created**: 2026-02-16
**Target**: WCAG 2.1 Level AA compliance for critical accessibility barriers
**Scope**: Critical and High priority issues from ACCESSIBILITY_AUDIT.md

## Overview

This plan addresses the most critical accessibility barriers in the Digital Dickens Notes Project that prevent or significantly impair users with disabilities from accessing core functionality. The approach focuses on structural fixes (landmarks, skip links), ARIA attributes for navigation, and ensuring proper semantic HTML. These changes are foundational and should be completed before moving to medium/low priority issues.

The implementation follows a bottom-up approach: fix shared layout components first, then apply those patterns to specific page types. This ensures consistency and reduces duplication of effort.

## Implementation Tasks

### Phase 1A: Core Structural Fixes

- [x] **Task 1: Add skip navigation link component**
  Files: `src/components/SkipLink.astro` (new)

  Create a reusable skip link component that:
  - Links to `#main-content`
  - Uses Tailwind's `sr-only` and `focus:not-sr-only` classes
  - Positioned absolute at top of page
  - Visible on keyboard focus with high contrast
  - Appears before all other content in tab order

  Component code:
  ```astro
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-ddnpblue focus:text-white focus:rounded focus:outline-none focus:ring-2 focus:ring-white"
  >
    Skip to main content
  </a>
  ```

  **Done when**: Component file created and renders accessible skip link
  **Test**: Tab key after page load should focus skip link, pressing Enter jumps to main content

---

- [x] **Task 2: Add main landmark to page.astro layout**
  Depends on: Task 1
  Files: `src/layouts/page.astro`

  Modify the layout to:
  1. Import SkipLink component
  2. Add SkipLink before Header
  3. Replace content `<div>` (line 28-35) with `<main id="main-content">`
  4. Keep all existing classes on the main element

  Before (lines 26-36):
  ```html
  <body class="container mx-auto flex flex-col h-screen justify-between">
    <Header />
    <div class="prose px-4...">
      <h1>...</h1>
      <slot />
    </div>
    <Footer />
  </body>
  ```

  After:
  ```html
  <body class="container mx-auto flex flex-col h-screen justify-between">
    <SkipLink />
    <Header />
    <main id="main-content" class="prose px-4 sm:px-6 prose-a:underline prose-a:decoration-ddnpblue prose-a:underline-offset-4 mx-auto flex-auto">
      <h1 class="prose text-4xl mt-6">{content.title}</h1>
      <div class="prose mt-6">
        <slot />
      </div>
    </main>
    <Footer />
  </body>
  ```

  **Done when**: Layout uses semantic `<main>` with proper ID
  **Test**: Screen reader landmarks navigation includes "main" region

---

- [x] **Task 3: Add main landmark to notes.astro layout**
  Depends on: Task 1
  Files: `src/layouts/notes.astro`

  Apply same pattern as Task 2:
  1. Import SkipLink component
  2. Add SkipLink before Header
  3. Replace content `<div>` (line 28-38) with `<main id="main-content">`

  **Done when**: Notes layout uses semantic `<main>` with proper ID
  **Test**: Screen reader landmarks navigation includes "main" region

---

- [x] **Task 4: Add main landmark to mirador-full-screen-layout.astro**
  Depends on: Task 1
  Files: `src/layouts/mirador-full-screen-layout.astro`

  Modify layout:
  1. Import SkipLink component
  2. Add SkipLink before Header (line 27)
  3. Wrap slot content `<div>` (line 28-30) with `<main id="main-content">`
  4. Keep relative positioning on inner div

  Before:
  ```html
  <body class="h-full">
    <Header />
    <div class="relative h-[90vh]">
      <slot />
    </div>
  </body>
  ```

  After:
  ```html
  <body class="h-full">
    <SkipLink />
    <Header />
    <main id="main-content" class="h-[90vh]">
      <div class="relative h-full">
        <slot />
      </div>
    </main>
  </body>
  ```

  **Done when**: Mirador layout uses semantic `<main>` with proper ID
  **Test**: Skip link works on Mirador pages, screen reader identifies main region

---

- [x] **Task 5: Add main landmark to index.astro**
  Depends on: Task 1
  Files: `src/pages/index.astro`

  Modify homepage:
  1. Import SkipLink component at top
  2. Add SkipLink after `<Header />` (line 66)
  3. Add `<main id="main-content">` wrapper around Hero and section (lines 67-82)

  Before (lines 65-83):
  ```html
  <body class="container mx-auto">
    <Header />
    <Hero />
    <section class="mt-12 grid...">
      {novels.map...}
    </section>
    <Footer />
  </body>
  ```

  After:
  ```html
  <body class="container mx-auto">
    <SkipLink />
    <Header />
    <main id="main-content">
      <Hero />
      <section class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 space-between">
        {novels.map...}
      </section>
    </main>
    <Footer />
  </body>
  ```

  **Done when**: Homepage has semantic `<main>` wrapping primary content
  **Test**: Skip link jumps to Hero section, landmarks include main region

---

### Phase 1B: Mobile Navigation ARIA

- [x] **Task 6: Add dynamic aria-expanded to mobile menu button**
  Files: `src/components/Header.astro`

  Update the mobile menu button script and markup:

  1. Modify button (lines 183-191) to add `aria-expanded` attribute:
  ```html
  <button
    type="button"
    id="menubtn"
    class="rounded-md p-2 inline-flex items-center justify-center hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus-ring-inset focus:ring-neutral-50"
    aria-expanded="false"
    aria-controls="menu"
  >
    <span class="sr-only">Open main menu</span>
    <Icon name="menu" size={24} aria-hidden="true" />
  </button>
  ```

  2. Update script (lines 140-151) to toggle aria-expanded:
  ```javascript
  const header = document.getElementById("navheader");
  const menuBtn = document.getElementById("menubtn");
  const logo = document.getElementById("navlogo");
  const menu = document.getElementById("menu");

  menuBtn.onclick = () => {
    const isOpen = header.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", isOpen.toString());
    menuBtn.querySelector(".sr-only").textContent = isOpen ? "Close main menu" : "Open main menu";
  };

  if (matchMedia("(pointer:fine)").matches) {
    logo.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      window.location.href = "/";
    });
  }
  ```

  **Done when**: Button aria-expanded updates when menu opens/closes, screen reader text changes
  **Test**: Use screen reader on mobile, verify state announcements

---

### Phase 1C: Image Alt Text

- [x] **Task 7: Fix logo alt text typo and improve description**
  Files: `src/components/Header.astro`

  Update line 177:
  ```html
  <Image
    src={dickensLogo}
    alt=""
  />
  ```

  Use empty alt because:
  - Logo is within a link with text content (line 180: sr-only span)
  - The link already has accessible name "Digital Dickens Notes Project"
  - Logo is decorative in this context

  **Done when**: Logo has empty alt attribute
  **Test**: Screen reader doesn't announce redundant text for logo image

---

- [x] **Task 8: Verify and document Card image alt text pattern**
  Files: `src/pages/index.astro`, Documentation

  Review current Card usage (lines 70-80) in index.astro:
  - Verify each card has descriptive alt text in the novels array
  - Alt should describe the image content, not just repeat the title

  Check existing alt values:
  - "David Copperfield Working Notes" → Acceptable if image shows the notes
  - "Bleak House Working Notes" → Acceptable if image shows the notes
  - "Hard Times Working Notes" → Acceptable if image shows the notes
  - "Little Dorrit Working Notes" → Acceptable if image shows the notes

  Document pattern in comment:
  ```javascript
  // Alt text pattern: "[Novel Title] Working Note No. [X]" or descriptive content
  // Alt should describe what's visible in the image, not repeat the title
  ```

  **Done when**: Current alt text verified as adequate or updated with more descriptive text
  **Test**: Review with screen reader, ensure meaningful description

---

### Phase 1D: Language Attributes

- [x] **Task 9: Add lang attribute to mirador-full-screen-layout.astro**
  Files: `src/layouts/mirador-full-screen-layout.astro`

  Add lang attribute to html element (line 8):
  ```html
  <html class="h-full" lang="en">
  ```

  **Done when**: All layout files have lang="en" on html element
  **Test**: Verify with browser inspector, screen reader uses English pronunciation

---

### Phase 1E: Hero Section Color Contrast

- [ ] **Task 10: Increase hero overlay opacity for better contrast**
  Files: `src/components/Hero.astro`

  Increase background overlay opacity to ensure WCAG AA contrast:

  Change line 4:
  ```html
  <div class="flex items-center justify-center w-full h-full bg-gray-900 bg-opacity-70 py-12">
  ```

  Changed from `bg-opacity-60` to `bg-opacity-70` for better text contrast.

  If testing shows this is insufficient, increase to `bg-opacity-75`.

  **Done when**: Text on hero background meets 4.5:1 contrast ratio
  **Test**: Use browser DevTools or WebAIM contrast checker on text over darkest part of image

---

### Phase 1F: Page Titles

- [ ] **Task 11: Create page title utility pattern**
  Files: Documentation/comment in `src/components/MainHead.astro`

  Document the page title pattern:

  Add comment at top of MainHead.astro explaining title format:
  ```astro
  ---
  // Page Title Format: "Specific Page Name - Digital Dickens Notes Project"
  // Examples:
  //   - "David Copperfield Working Notes - Digital Dickens Notes Project"
  //   - "General Introduction - Digital Dickens Notes Project"
  //   - "The Team - Digital Dickens Notes Project"
  // Homepage uses just "Digital Dickens Notes Project"

  import "../styles/global.scss";
  const {
    title = "Digital Dickens Notes Project",
    // ...
  ```

  Update title element (line 16) to include site name if not already present:
  ```astro
  <title>{title.includes("Digital Dickens Notes Project") ? title : `${title} - Digital Dickens Notes Project`}</title>
  ```

  **Done when**: All pages automatically get site name appended to title
  **Test**: Check page titles in browser tabs, verify format

---

- [ ] **Task 12: Verify page titles throughout site**
  Files: All .mdx and .astro page files

  Audit task (can be done with grep):
  1. Search for all pages with frontmatter/title props
  2. Verify each has a unique, descriptive title
  3. Create list of any pages missing titles

  Command to find pages:
  ```bash
  find src/pages -name "*.astro" -o -name "*.mdx" | xargs grep -l "title"
  ```

  **Done when**: List of pages with titles documented, any missing titles identified
  **Test**: Navigate through site, verify each page has descriptive title

---

### Phase 1G: Placeholder Link Fixes

- [ ] **Task 13: Audit and document placeholder links**
  Files: `src/components/Header.astro`, Documentation

  Find all href="#" instances:
  ```bash
  grep -n 'href="#"' src/components/Header.astro
  grep -n 'href="#"' src/components/Nav.jsx
  ```

  For Header.astro, create list of links that:
  - Point to # (placeholder)
  - Need real URLs or should be removed

  Document in comment which links are intentional vs placeholder.

  **Done when**: All placeholder links identified and documented
  **Test**: Tab through navigation, identify any focus traps

---

- [ ] **Task 14: Replace or remove placeholder links in Header**
  Depends on: Task 13
  Files: `src/components/Header.astro`

  For each placeholder link identified in Task 13:

  Option A - If page exists: Replace "#" with actual URL
  Option B - If page coming soon: Add aria-disabled and remove href:
  ```html
  <span
    role="link"
    aria-disabled="true"
    class="text-gray-400 cursor-not-allowed"
  >
    {item.name}
  </span>
  ```

  Update NavPopover to handle disabled links if needed.

  **Done when**: No href="#" links in Header that trap keyboard users
  **Test**: Keyboard navigate through all navigation items, verify no traps

---

## Key Decisions

1. **Skip Link Position**: Placed at top of every layout (not just in Header) to ensure it's truly the first focusable element regardless of layout structure.

2. **Main Landmark Scope**: On homepage, `<main>` wraps both Hero and content sections, as both are primary page content (not navigation/ads/sidebars).

3. **Logo Alt Text**: Using empty alt (`alt=""`) because logo is inside a link that has text content via sr-only span. This prevents redundant announcements.

4. **Hero Overlay**: Starting with 70% opacity increase (from 60%). This is conservative; may need to go to 75% depending on testing results.

5. **Page Title Pattern**: Automatically appending site name to prevent developers from forgetting, while allowing homepage to use site name alone.

6. **Placeholder Links**: Preferring removal over aria-disabled for truly unplanned content, but using aria-disabled for "coming soon" pages.

## Risks & Unknowns

1. **Hero Contrast**: The bg-opacity-70 might not be sufficient depending on the specific areas of the background image. May need to test across multiple viewport sizes and consider a solid fallback.

2. **Mirador Integration**: The main landmark wrapping Mirador content might conflict with Mirador's internal accessibility features. Needs testing with screen readers.

3. **Mobile Menu Focus Trap**: Current implementation doesn't trap focus within the open menu. Users can tab to content behind the menu. This is acceptable for now but should be enhanced in Phase 2.

4. **Page Title Audit**: Task 12 might reveal many pages without proper titles, potentially expanding scope.

5. **Placeholder Links**: Task 13 might reveal that many "coming soon" pages are actually not planned, requiring navigation restructuring discussion.

## Testing Strategy

Each task includes inline testing criteria. Overall testing approach:

1. **After Tasks 1-5**: Test skip links and landmarks
   - Tab through each layout type
   - Use screen reader (NVDA/JAWS/VoiceOver) to navigate by landmarks
   - Verify skip link appears and functions on all pages

2. **After Task 6**: Test mobile menu
   - Test with mobile screen readers (iOS VoiceOver, Android TalkBack)
   - Verify aria-expanded state changes
   - Test keyboard navigation in mobile viewport

3. **After Tasks 7-8**: Test with screen reader
   - Navigate through homepage with images
   - Verify logo doesn't announce redundantly
   - Verify card images have meaningful descriptions

4. **After Task 10**: Test hero contrast
   - Use browser DevTools color picker
   - Test with WebAIM Contrast Checker
   - Test across different viewport sizes

5. **After Task 11-12**: Test page titles
   - Open multiple pages in tabs
   - Verify each tab has unique, descriptive title
   - Test with screen reader page title announcement

6. **After Tasks 13-14**: Test navigation
   - Keyboard navigate through all menu items
   - Verify no focus traps
   - Test with screen reader

### Automated Testing

After completing all tasks, run:
- `npm install -D @axe-core/playwright` or similar
- Run Lighthouse accessibility audit
- Use axe DevTools browser extension on each layout type

## Success Criteria

Phase 1 is complete when:
- [ ] All layouts have skip links and main landmarks
- [ ] Mobile menu button properly announces state
- [ ] All images have appropriate alt text
- [ ] Hero section meets WCAG AA contrast requirements
- [ ] All pages have unique, descriptive titles
- [ ] No placeholder links trap keyboard users
- [ ] All HTML elements have lang attribute
- [ ] Automated accessibility tests show improvement in scores

## Next Steps

After Phase 1 completion:
1. Create Phase 2 plan for Medium priority issues:
   - Navigation ARIA labels
   - Heading hierarchy audit
   - Focus indicator verification
   - Touch target size audit
   - Mirador accessibility testing

2. Set up automated accessibility testing in CI/CD

3. Create accessibility testing checklist for new features

4. Consider accessibility training for team

## Execution

To execute this plan:
```bash
# From project root
/implement docs/plans/2026-02-16-accessibility-phase1-plan.md
```

Or work through tasks manually, checking off each task as completed.
