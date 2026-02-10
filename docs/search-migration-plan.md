# Search Migration Plan: Lunr.js → MiniSearch

> Date: 2026-02-09
> Branch: `search-migration-plan`
> Prerequisite reading: [Search Evaluation](./search-evaluation.md)
> Related issues: #254, #255, #256, #257, #258, #259, #260, #261, #262, #263, #264, #265, #266

---

## Overview

This plan covers two phases:

1. **Phase 1 — Migration:** Replace Lunr.js with MiniSearch, reproducing all existing functionality.
2. **Phase 2 — Feature Development:** Implement the new search capabilities described in GitHub issues #254–#266.

Each phase is broken into discrete steps that can be implemented, tested, and committed independently.

---

## Phase 1: Migration (Lunr → MiniSearch)

> Goal: Replace the search engine with zero user-facing regressions. The search page should look and behave identically (or better) after migration.

### Step 1.1 — Install MiniSearch and Set Up Build Script

**What:** Replace the Ruby/ExecJS/Lunr index-building pipeline with a Node.js script that uses MiniSearch.

**Why:** The current pipeline requires Ruby + ExecJS + Python to run. The Astro project is already Node-based. Consolidating to Node.js + Python (for annotation fetching) simplifies the build and eliminates the Ruby/ExecJS dependency.

**Files to create/modify:**
- `package.json` — Add `minisearch` as a dependency, add `"build:index"` script
- `scripts/build-search-index.mjs` — New Node.js script replacing `createindex.rb`

**Details:**

1. `npm install minisearch`
2. Create `scripts/build-search-index.mjs` that:
   - Runs `createindex-parseannotations.py` via `child_process.execSync` and parses its JSON output (preserving the existing Python script unchanged)
   - Reads all `textfiles/**/*.txt` and constructs Working Notes documents (same logic as `createindex.rb` lines 50–72)
   - Reads all `src/pages/**/*.mdx` and constructs Site Content documents (same logic as `createindex.rb` lines 36–48, stripping frontmatter/markdown/HTML)
   - Assigns each document an `id`, `title`, `content`, `url`, `type`, `tags`, `excerpt`, and `novel` field
   - **New `novel` field:** Extract the novel name into its own field (e.g. `"Bleak House"`) separate from `type`. This enables cleaner faceting by novel vs. content type. Currently `type` conflates both (e.g. `"Working Notes: Bleak House"`).
   - Builds a MiniSearch index with fields: `title`, `content`, `tags`
   - Stores fields: `title`, `url`, `type`, `tags`, `excerpt`, `novel`
   - Configures field boosting: `title: 20`, `content: 10`, `tags: 10`
   - Disables stemming (matching current Lunr config)
   - Custom tokenizer matching current separator: `/[\s,.;:/?!()]+/`
   - Exports the serialized index via `JSON.stringify(index.toJSON())` and the docs array to `public/assets/javascript/search-data.json`
3. Add to `package.json`:
   ```json
   "scripts": {
     "build:index": "node scripts/build-search-index.mjs",
     "build": "npm run build:index && astro build"
   }
   ```
4. Remove `createindex.rb` (or archive it)

**Acceptance criteria:**
- `npm run build:index` produces `public/assets/javascript/search-data.json`
- JSON contains a `docs` array and a serialized `index` object
- All documents from all three content types are present
- The existing Python script runs unchanged

---

### Step 1.2 — Create the MiniSearch Client Module

**What:** Create a JavaScript module that loads the pre-built index and exposes a search API.

**Files to create:**
- `src/lib/search.js` — Client-side search module

**Details:**

```js
// src/lib/search.js
import MiniSearch from 'minisearch';

let searchInstance = null;
let docs = null;

export async function initSearch() {
  if (searchInstance) return;
  const response = await fetch('/assets/javascript/search-data.json');
  const data = await response.json();
  docs = data.docs;
  searchInstance = MiniSearch.loadJSON(JSON.stringify(data.index), {
    fields: ['title', 'content', 'tags'],
    storeFields: ['title', 'url', 'type', 'tags', 'excerpt', 'novel'],
    tokenize: (text) => text.split(/[\s,.;:/?!()]+/).filter(Boolean),
  });
}

export function search(query, options = {}) {
  if (!searchInstance) throw new Error('Search not initialized');
  return searchInstance.search(query, {
    boost: { title: 2, content: 1, tags: 1 },
    ...options,
  });
}

export function getDoc(id) {
  return docs?.[id];
}
```

**Acceptance criteria:**
- Module can be imported from any Astro page/component
- `initSearch()` fetches and deserializes the index
- `search(query)` returns results with `id`, `score`, `match`, and stored fields

---

### Step 1.3 — Rebuild the Search Page UI

**What:** Replace the external `jekyll-lunr-js-custom-search` CDN dependency and inline jQuery with a self-contained search page component.

**Why:** The current search UI depends on an external CDN (`dnoneill.github.io`) and jQuery. This is fragile (CDN could go down), hard to customize, and blocks all the UI improvements in Phase 2.

**Files to create/modify:**
- `src/pages/search/index.astro` — Replace `index.md` with an Astro page
- `src/components/search/SearchPage.jsx` — React component for the full search UI (using the project's existing React setup)
- Delete `src/pages/search/index.md`

**Details:**

The new `SearchPage.jsx` component should replicate existing functionality:

1. **Search input** — Text input + submit button, reads `?query=` from URL on load
2. **Results list** — Each result shows: title (linked to `url`), type label, tags (if present)
3. **Facet sidebar** — Group results by `type` field, show count per type, allow click-to-filter
4. **Sort controls** — Relevance (default), Name A–Z, Name Z–A
5. **Pagination** — Same page-size as current (likely 10 or 20 results per page)
6. **Result count** — "X results for 'query'"
7. **Loading spinner** — Show while index loads

**Migration parity checklist:**
- [ ] Search input with keyword query
- [ ] URL query parameter support (`/search?query=term`)
- [ ] Facet sidebar with type counts
- [ ] Click-to-filter by facet
- [ ] Sort by relevance / name asc / name desc
- [ ] Paginated results
- [ ] Result count display
- [ ] Spinner during index load
- [ ] Result links navigate to correct pages/Mirador canvases

**Acceptance criteria:**
- `/search` page works identically to the current page
- No external CDN dependencies
- No jQuery dependency
- All result URLs (Working Notes → Mirador, Annotations → Mirador + annotation ID, Site Content → page) work correctly

---

### Step 1.4 — Clean Up Legacy Files

**What:** Remove files that are no longer needed after migration.

**Files to delete:**
- `public/assets/javascript/lunr.js` — Lunr library (100 KB)
- `public/assets/javascript/index.js` — Old Lunr index (11 MB)
- `createindex.rb` — Old Ruby build script
- `Gemfile` / `Gemfile.lock` (if they exist and were only used for this)

**Files to keep:**
- `createindex-parseannotations.py` — Still used by the new Node.js build script

**Acceptance criteria:**
- Build succeeds without Ruby/ExecJS
- No references to `lunr` remain in the codebase
- `public/assets/javascript/search-data.json` is the sole search data file

---

### Step 1.5 — Validation and Testing

**What:** Manual + automated validation that the migration is complete and correct.

**Test plan:**
1. Build the site (`npm run build`)
2. Verify `search-data.json` contains all expected documents:
   - 65 Working Notes
   - All annotations (compare count to old `index.js`)
   - All MDX site pages
3. Verify search for known terms returns expected results (compare side-by-side with current production)
4. Verify all result URLs navigate correctly:
   - Working Notes → correct Mirador canvas
   - Annotations → correct Mirador canvas + annotation panel
   - Site Content → correct page
5. Verify facet counts match document counts
6. Verify sort toggles work correctly
7. Verify pagination works
8. Test on mobile viewport

---

## Phase 2: Feature Development

> Goal: Implement all requirements from issues #254–#266 on top of the new MiniSearch foundation.

### Step 2.1 — Search Visibility (#254)

**What:** Add a search icon/link to the top navigation bar, accessible from every page.

**Files to modify:**
- `src/components/Header.astro`

**Details:**
- Add a magnifying glass icon link to the right side of the top navigation bar (outside any dropdown)
- Link to `/search`
- Use existing `faMagnifyingGlass` import (already in Header.astro)
- Should appear on both desktop and mobile

**Acceptance criteria:**
- Magnifying glass icon visible in top nav on all pages
- Click navigates to `/search`
- Responsive on mobile

---

### Step 2.2 — Text Snippets with Highlighting (#262)

**What:** Show a context snippet for each search result, with matched terms highlighted.

**Files to modify:**
- `src/components/search/SearchPage.jsx`
- `src/lib/search.js`

**Details:**

1. **Snippet generation:** For each result, use the `match` metadata from MiniSearch to find which terms matched in the `content` field. Locate the first match position in the stored `excerpt`/`content` text. Extract a window of ~150 characters around the match.
2. **Highlighting:** Wrap matched terms in `<mark>` tags within the snippet.
3. **Display:** Show the snippet below the title/URL in each result item.

**Implementation approach:**
```js
function generateSnippet(content, matchedTerms, windowSize = 150) {
  // Find first occurrence of any matched term
  // Extract surrounding context
  // Wrap all matched terms in <mark> tags
  // Return HTML string
}
```

**Acceptance criteria:**
- Each result shows a text snippet (~1–2 lines)
- Matched search terms are visually highlighted (e.g. yellow background)
- Snippets are relevant (centered on match, not just the beginning of the document)
- Works for all three content types

---

### Step 2.3 — Results Grouped by Type (#260)

**What:** Display search results with clear visual grouping and labeling by content type and novel.

**Files to modify:**
- `src/components/search/SearchPage.jsx`

**Details:**

1. Group results by the `type` field (Working Notes, Annotations, Site Content)
2. Within each group, sub-label by novel
3. Each group has a clear heading (e.g. "Working Notes: Bleak House")
4. Adequate visual spacing between groups and between individual results
5. Show result count per group in the heading

**Acceptance criteria:**
- Results are visually grouped with clear section headings
- Each section shows its result count
- Adequate whitespace between sections and between results

---

### Step 2.4 — Relevance Boosting by Content Type (#261)

**What:** Prioritize Dickens's working notes highest in search results, then annotations, then site content.

**Files to modify:**
- `src/lib/search.js`

**Details:**

Use MiniSearch's `boostDocument` option:

```js
search(query, {
  boostDocument: (id, term, storedFields) => {
    if (storedFields.type?.startsWith('Working Notes')) return 2.0;
    if (storedFields.type?.startsWith('Annotations')) return 1.5;
    return 1.0; // Site Content
  },
});
```

Boost values should be tunable. Consider making them configurable constants.

**Acceptance criteria:**
- For ambiguous queries, Working Notes results appear before Annotations, which appear before Site Content
- Boost does not override highly relevant results from lower-priority types (a perfect match in Site Content should still rank high)

---

### Step 2.5 — Faceted Refinement (#263)

**What:** Allow users to refine results by content type and novel without re-running the search.

**Files to modify:**
- `src/components/search/SearchPage.jsx`

**Details:**

1. **Content type facets:** Checkboxes or clickable labels for "Working Notes", "Annotations", "Site Content"
2. **Novel facets:** Checkboxes for each novel (David Copperfield, Bleak House, Hard Times, Little Dorrit)
3. Selecting a facet filters the current result set client-side using MiniSearch's `filter` option:
   ```js
   search(query, {
     filter: (result) => {
       if (activeTypes.length && !activeTypes.includes(result.type)) return false;
       if (activeNovels.length && !activeNovels.includes(result.novel)) return false;
       return true;
     },
   });
   ```
4. Facet counts update dynamically as filters are applied
5. "Clear filters" button to reset

**Acceptance criteria:**
- Users can filter by content type
- Users can filter by novel
- Filters can be combined (e.g. "Working Notes" + "Bleak House")
- Result count and facet counts update immediately
- Filters persist across pagination

---

### Step 2.6 — Exact Phrase Search (#258)

**What:** Support quotation-mark syntax for exact phrase matching (e.g. `"hand drawn maps"`).

**Files to modify:**
- `src/lib/search.js`

**Details:**

MiniSearch does not have native phrase search, so implement it as a two-step process:

1. **Parse the query:** Detect quoted phrases (e.g. `"little dorrit" character list`).
2. **Search:** Run MiniSearch search with all terms using `combineWith: 'AND'` so all terms must be present.
3. **Post-filter:** For quoted phrases, verify that the terms appear adjacently and in order in the document's stored `content` field. This can use a simple regex or string indexOf check.

```js
function parseQuery(query) {
  const phrases = [];
  const terms = [];
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query))) {
    phrases.push(match[1]);
  }
  const remainder = query.replace(phraseRegex, '').trim();
  if (remainder) terms.push(remainder);
  return { phrases, terms };
}

function searchWithPhrases(query) {
  const { phrases, terms } = parseQuery(query);
  const allTerms = [...phrases.flatMap(p => p.split(/\s+/)), ...terms.join(' ').split(/\s+/)].filter(Boolean);

  let results = searchInstance.search(allTerms.join(' '), {
    combineWith: 'AND',
  });

  // Post-filter: verify phrase adjacency
  if (phrases.length > 0) {
    results = results.filter(result => {
      const content = (result.content || '').toLowerCase();
      return phrases.every(phrase => content.includes(phrase.toLowerCase()));
    });
  }

  return results;
}
```

**Acceptance criteria:**
- `"exact phrase"` returns only documents containing that exact phrase
- Unquoted terms still behave as normal (OR by default)
- Mixed queries work: `"bleak house" esther` finds docs with the exact phrase "bleak house" that also mention "esther"
- Edge cases handled: empty quotes, single-word quotes, unclosed quotes

---

### Step 2.7 — Fuzzy/Variant Matching (#259)

**What:** Support fuzzy matching to find spelling variations, abbreviations, and approximate matches.

**Files to modify:**
- `src/lib/search.js`
- `src/components/search/SearchPage.jsx`

**Details:**

1. **Default behavior:** Enable mild fuzzy matching by default:
   ```js
   search(query, { fuzzy: 0.2 });
   ```
   This allows matches within ~20% edit distance (e.g. 1 edit for a 5-letter word).

2. **Toggle:** Add a checkbox on the search page: "Include approximate matches". When unchecked, `fuzzy` is set to `false` for exact-only results.

3. **Prefix matching:** Also enable prefix search for as-you-type behavior:
   ```js
   search(query, { prefix: true, fuzzy: 0.2 });
   ```

**Open question from issue #259:** Whether fuzzy should be toggleable or automatic. **Recommendation:** Default ON with a toggle to disable. Scholars searching for exact Dickens wording may want to turn it off; general users benefit from it being on.

**Acceptance criteria:**
- Search for "Esther" also finds "Ester" (if present in content)
- Fuzzy toggle is visible and functional
- Quoted phrases (#258) are NOT fuzzified (exact match takes priority)

---

### Step 2.8 — Advanced Search Interface (#257)

**What:** Provide an optional advanced search UI with field-specific searching and scope controls.

**Files to create/modify:**
- `src/components/search/AdvancedSearch.jsx` — New component
- `src/components/search/SearchPage.jsx` — Toggle between simple/advanced

**Details:**

1. **"Advanced Search" toggle** below the main search box (collapsed by default)
2. **Content type checkboxes:** Working Notes, Annotations, Site Content (pre-search scope)
3. **Novel filter dropdown/checkboxes:** David Copperfield, Bleak House, Hard Times, Little Dorrit
4. **Field-specific inputs** (optional, stretch goal):
   - Search in Title only
   - Search in Content only
   - Search in Tags only
5. These pre-search filters are passed to MiniSearch's `filter` and `fields` options

**Acceptance criteria:**
- Users can limit search scope before searching
- Content type and novel checkboxes work correctly
- Advanced panel can be toggled open/closed
- URL parameters persist advanced search state (e.g. `?query=esther&type=working-notes&novel=bleak-house`)

---

### Step 2.9 — Stable URLs for Search Results (#264)

**What:** Ensure search results link to stable, bookmarkable URLs with anchored positions in Mirador.

**Status:** Issue notes this is "currently working in search tool."

**Verification steps:**
1. Confirm Working Notes results link to `/notes/{novel}/mirador?canvas={canvasURL}`
2. Confirm Annotation results link to `/notes/{novel}/mirador?canvas={canvasURL}&annotationid={id}`
3. Confirm Site Content results link directly to the page path
4. Verify all links work after migration (regression test from Step 1.5)

**Acceptance criteria:**
- All existing URLs continue to work post-migration
- No broken deep links

---

### Step 2.10 — Scalability (#266)

**What:** Ensure the search system can scale as more novels and annotations are added.

**Details:**

1. **Measure current index size:** Compare `search-data.json` to old `index.js` (11 MB). MiniSearch's serialized format should be significantly smaller.
2. **Lazy loading:** The search data JSON is fetched only when the user visits `/search`, not on every page load.
3. **Compression:** Ensure the web server serves `search-data.json` with gzip/brotli compression. The JSON format compresses extremely well.
4. **Future-proofing:** If the index grows beyond ~5 MB compressed, consider:
   - Splitting the index by novel (load on demand when filtering)
   - Using a Web Worker for search execution to avoid blocking the UI thread

**Acceptance criteria:**
- `search-data.json` is smaller than the old 11 MB `index.js`
- Search page loads and responds quickly (< 2s initial load, < 100ms per query)
- Document the expected growth pattern in code comments

---

### Step 2.11 — "How Search Works" Documentation (#265)

**What:** Write a clear explanation of how search works and display it on the search page.

**Files to modify:**
- `src/components/search/SearchPage.jsx` or `src/pages/search/index.astro`

**Details:**

Add a collapsible "How Search Works" section on the search page that explains:

1. What content is searched (Working Notes, Annotations, Site Content)
2. How relevance is determined (title matches weighted highest, then content/tags; Working Notes prioritized over Annotations over Site Content)
3. How to use exact phrase search (quotation marks)
4. How fuzzy matching works and how to toggle it
5. How to use facets to refine results
6. How to use advanced search filters

**Acceptance criteria:**
- Explanation is present on the search page
- Collapsible (not overwhelming on first visit)
- Accurate reflection of the actual search behavior

---

## Implementation Order

The steps should be executed in this order to minimize risk and enable incremental testing:

```
Phase 1 (Migration):
  1.1  Build script ─────────────────────┐
  1.2  Search client module ─────────────┤
  1.3  Search page UI ──────────────────┤ ← Can demo/test full migration here
  1.4  Clean up legacy files ────────────┤
  1.5  Validation ───────────────────────┘

Phase 2 (Features):
  2.1  Search visibility (#254) ─────────  (independent, can be done anytime)
  2.2  Snippets + highlighting (#262) ──┐
  2.3  Grouped results (#260) ──────────┤ ← Core results display improvements
  2.4  Relevance boosting (#261) ───────┘
  2.5  Faceted refinement (#263) ────────  (builds on 2.3 grouping)
  2.6  Exact phrase search (#258) ──────┐
  2.7  Fuzzy matching (#259) ───────────┤ ← Query capability improvements
  2.8  Advanced search (#257) ──────────┘  (builds on 2.5 facets + 2.6/2.7 query)
  2.9  Stable URLs (#264) ──────────────  (verification only)
  2.10 Scalability (#266) ──────────────  (measurement + optimization)
  2.11 Documentation (#265) ────────────  (last — documents final behavior)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Annotation API changes | Python script is preserved unchanged; if the API changes, only `createindex-parseannotations.py` needs updating |
| MiniSearch search quality differs from Lunr | Step 1.5 includes side-by-side comparison testing. Tokenizer and stemmer settings are matched. |
| Large index size | MiniSearch's serialization is more compact than Lunr's. Gzip compression will further reduce transfer size. Lazy loading prevents impact on non-search pages. |
| CDN removal breaks custom-search features | Step 1.3 rebuilds all UI features from scratch, verified against the current feature set in the parity checklist. |
| Exact phrase post-filtering is slow | The corpus is small (~thousands of documents, not millions). String `includes()` on stored content is negligible at this scale. |

---

## Dependencies

- **Node.js** (already required by Astro)
- **Python 3 + BeautifulSoup + requests** (already required for annotation parsing)
- **MiniSearch** (`npm install minisearch`)
- **No new system-level dependencies**
- **Ruby + ExecJS are removed** as dependencies after migration
