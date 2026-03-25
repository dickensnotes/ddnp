# CLAUDE.md

> Instructions for Claude Code when working on the Digital Dickens Notes Project (DDNP)

## Project Overview

The Digital Dickens Notes Project is a digital humanities project providing scholarly access to Charles Dickens's Working Notes—the planning documents he created for each installment of his serialized novels. The site pairs accurate transcriptions with annotations and allows users to explore these manuscripts through an interactive IIIF viewer (Mirador).

**Live site:** Deployed on Vercel
**Primary users:** Literary scholars, students, researchers, educators

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Astro](https://astro.build/) v5 (static site generator) |
| Styling | [TailwindCSS](https://tailwindcss.com/) v3 |
| UI Components | React v18 + Preact v10 (islands architecture) |
| Package Manager | **pnpm** (not npm or yarn) |
| Content | MDX files (`src/pages/**/*.mdx`) |
| Viewer | [Mirador](https://projectmirador.org/) v4 (IIIF image viewer) |
| Search | Lunr.js v2.3.6 (being migrated to MiniSearch — see `docs/search-migration-plan.md`) |
| Build scripts | Node.js + Python 3 |
| Hosting | Vercel |

## Repository Structure

```
/Users/scott/projects/ddnp/
├── src/
│   ├── components/        # Astro + React/Preact components
│   ├── layouts/           # Astro layouts (page.astro, notes.astro, etc.)
│   ├── pages/             # MDX content pages (routes follow file structure)
│   │   ├── about/
│   │   ├── introduction/
│   │   ├── notes/         # Landing pages for each novel
│   │   ├── search/        # Search page
│   │   └── usage/
│   └── icons/
├── textfiles/             # Plain text transcriptions of Working Notes (65 files)
│   ├── Bleak House/
│   ├── David Copperfield/
│   ├── Hard Times/
│   └── Little Dorrit/
├── public/
│   └── assets/javascript/ # Search index and libraries
├── docs/                  # Project documentation (migration plans, etc.)
├── createindex.rb         # Ruby script for building Lunr search index (legacy)
├── createindex-parseannotations.py  # Fetches IIIF annotations from remote API
└── astro.config.mjs       # Astro configuration
```

## Commands

**Always use `pnpm`, not `npm` or `yarn`.**

| Command | Action |
|---------|--------|
| `pnpm install` | Install dependencies |
| `pnpm run dev` | Start dev server at `localhost:4321` |
| `pnpm run build` | Build production site to `./dist/` |
| `pnpm run preview` | Preview production build locally |

## Content Sources

The DDNP indexes three types of content:

1. **Working Notes** (65 files)
   - Source: `textfiles/{Novel}/*.txt`
   - Plain text transcriptions of Dickens's handwritten notes
   - One file per installment for each of 4 novels (David Copperfield, Bleak House, Hard Times, Little Dorrit)

2. **Annotations** (thousands)
   - Source: `https://dickensnotes.github.io/dickens-annotations` (remote IIIF API)
   - Scholarly commentary on the Working Notes
   - Parsed by `createindex-parseannotations.py` at build time

3. **Site Content** (~15 pages)
   - Source: `src/pages/**/*.mdx`
   - Introductions, about pages, user guides, bibliography, etc.

## Code Style & Conventions

### File Extensions
- **Use `.jsx` for React/Preact components**, not `.tsx` (project has no TypeScript)
- Use `.astro` for Astro components
- Use `.mdx` for content pages with JSX/components
- Use `.mjs` for ES module scripts

### Component Guidelines
- Prefer Astro components (`.astro`) for static content
- Use React/Preact (`.jsx`) only when interactivity is needed
- Astro components can import/use React components via `client:load` directive

### Styling
- Use Tailwind utility classes
- Custom CSS classes defined in component `<style>` blocks if needed
- Responsive design: test mobile viewport
- **Accessibility:** While there are no formal WCAG requirements, strive for accessible patterns:
  - Use semantic HTML elements
  - Include ARIA labels where needed (especially for icon-only buttons)
  - Ensure sufficient color contrast
  - Test keyboard navigation
  - Add alt text for images

### Imports
- Astro uses explicit imports (no auto-imports)
- Icon imports: `import { iconName } from "@fortawesome/free-solid-svg-icons"`
- Image imports: `import { Image } from "astro:assets"`

## Content Editing

### MDX Pages
- Most pages are in `src/pages/**/*.mdx`
- URL structure follows file path (e.g. `src/pages/introduction/general.mdx` → `/introduction/general`)
- Each file starts with YAML frontmatter:
  ```yaml
  ---
  layout: "../../layouts/page.astro"
  title: "Page Title"
  description: "Meta description"
  ---
  ```

### Adding a New Page
1. Create `.mdx` file in appropriate `src/pages/` subdirectory
2. Add frontmatter with layout, title, description
3. Write content in markdown
4. If nav link needed, add to `src/components/Header.astro` in appropriate options array

## Mirador Viewer

The IIIF viewer is used to display Working Notes images and annotations.

### Mirador URLs
- Working Notes: `/notes/{novel}/mirador?canvas={canvasURL}`
- Annotations: `/notes/{novel}/mirador?canvas={canvasURL}&annotationid={annotationID}`

### Window Shim (Important)
Due to Vite/Mirador compatibility, pages using Mirador need this snippet:
```html
<script>window.global = window;</script>
```
Include before the Mirador component.

## Search System

**Current state:** Lunr.js v2.3.6 (unmaintained, 5+ years old)
**Migration in progress:** Moving to MiniSearch
**See:** `docs/search-migration-plan.md` for full implementation plan

### Current Search Pipeline
1. Python script fetches annotations from remote API
2. Ruby script (`createindex.rb`) builds Lunr index from:
   - Annotation JSON (from Python)
   - Text files (`textfiles/`)
   - MDX pages (`src/pages/`)
3. Output: `public/assets/javascript/index.js` (11 MB)

### Search Migration Notes
- Do NOT add new features to the Lunr implementation
- Refer to `docs/search-migration-plan.md` for migration steps
- New search work should target MiniSearch architecture

## Deployment

**Platform:** Vercel
**Process:** Automatic deployment on push to `main`
**Preview deploys:** Vercel creates preview URLs for all PRs
**Environment variables:** None (no secrets to manage)
**Build command:** `pnpm run build` (configured in Vercel)
**Output directory:** `dist/`

## Git Workflow

### Branch Naming
- Feature branches: `feature/description` or `initials/description`
- Fix branches: `fix/description`
- Use lowercase with hyphens

### Commit Messages
- Imperative mood: "Add feature" not "Added feature"
- Include co-author tag when working with Claude:
  ```
  Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
  ```

### Pull Requests
- Target branch: `main`
- Vercel deploys preview builds automatically for PRs

## Common Tasks

### Update a Content Page
1. Edit the `.mdx` file in `src/pages/`
2. Run `pnpm run dev` to preview
3. Commit and push

### Add a Navigation Link
Edit `src/components/Header.astro`:
- Add entry to appropriate options array (e.g. `instructionOptions`, `aboutOptions`)
- Include `name`, `description`, `href`, and FontAwesome `icon`

### Work with Search
- **Before migrating:** Run `ruby createindex.rb` to rebuild search index
- **After migrating:** Run `node scripts/build-search-index.mjs` (or `pnpm run build:index`)
- Python 3 + BeautifulSoup must be installed

### Debug Mirador Issues
1. Check that `window.global = window` shim is present
2. Verify canvas URL points to valid IIIF manifest
3. Check browser console for errors
4. Test in production build (`pnpm run preview`) — some issues only appear in production

## Dependencies

### System Requirements
- **Node.js** (v18+, check `.tool-versions` for exact version)
- **pnpm** (v8+)
- **Python 3** (for annotation parsing)
- **Ruby** (for legacy search index builder — will be removed after migration)

### Python Dependencies
```bash
pip install beautifulsoup4 requests
```

### Ruby Dependencies (Legacy)
```bash
gem install execjs redcarpet json
```

## Known Issues & Quirks

### Vite + Mirador
Mirador expects `global` to be defined (Node.js convention), but Vite only provides `window`. Workaround: `<script>window.global = window;</script>` on Mirador pages.

### Search Index Size
Current Lunr index is 11 MB. This is loaded client-side and will grow as novels are added. MiniSearch migration will improve this.

### IIIF Annotation API
Annotations are fetched from `https://dickensnotes.github.io/dickens-annotations` at build time. If this API is unavailable, the build will fail.

## When to Ask for Clarification

- **Before modifying Mirador URLs** — the canvas/annotation ID structure is specific and easy to break
- **Before changing the annotation fetching script** — the remote API has a specific structure
- **Before adding new novels** — there's a pattern for file naming and URL generation that must be followed
- **Before making UI changes to the search page** — consult the migration plan and GitHub issues first

## Testing & Quality

### Manual Testing Checklist

When making changes, verify:

- [ ] Site builds without errors (`pnpm run build`)
- [ ] All pages load correctly in dev mode
- [ ] Navigation links work
- [ ] Mirador viewer loads and displays images
- [ ] Search returns expected results (if search-related changes)
- [ ] Mobile viewport is functional
- [ ] No console errors in browser
- [ ] Keyboard navigation works for interactive elements
- [ ] Color contrast is sufficient for text/UI elements

### Automated Testing

**Current state:** No test suite exists.
**Future:** Consider adding:
- Unit tests for search logic (especially during MiniSearch migration)
- E2E tests for critical user paths (search, Mirador navigation)
- Visual regression tests for UI changes

## Resources

- [Astro Documentation](https://docs.astro.build)
- [Mirador Documentation](https://projectmirador.org/)
- [IIIF Specifications](https://iiif.io/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [GitHub Issues](https://github.com/dickensnotes/ddnp/issues) — active feature requests and bugs

## Contact

For questions about the project's scholarly goals or content, refer to the team listed in `src/pages/about/team.mdx`.
