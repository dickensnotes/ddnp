# Search Functionality Evaluation

> Date: 2026-02-09
> Related Issues: #254, #255, #256, #257, #258, #259, #260, #261, #262, #263, #264, #265, #266

## 1. Current Search Architecture

### Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Search engine | Lunr.js v2.3.6 | Client-side full-text search. Last published to npm **5 years ago** (v2.3.9). Effectively unmaintained. |
| Search UI | [jekyll-lunr-js-custom-search](https://dnoneill.github.io/jekyll-lunr-js-custom-search/) | External CDN-hosted library providing facets, pagination, sorting, and results rendering. Depends on jQuery. |
| Index builder | `createindex.rb` (Ruby) + `createindex-parseannotations.py` (Python) | Runs at build time. Produces `public/assets/javascript/index.js` (~11 MB). |
| Site framework | Astro (static site generator) | Uses Preact + React components, Tailwind CSS, MDX pages. |

### How the Index Is Built

1. **`createindex-parseannotations.py`** fetches annotation JSON from `https://dickensnotes.github.io/dickens-annotations`, parses IIIF annotation bodies with BeautifulSoup, extracts text content/tags/metadata, and outputs a JSON dict of documents.
2. **`createindex.rb`** calls the Python script, then:
   - Iterates MDX pages in `src/pages/**/*.mdx` — strips markdown/HTML, adds as "Site Content" docs.
   - Iterates text files in `textfiles/**/*.txt` (65 files across 4 novels) — adds as "Working Notes: {Novel}" docs.
   - Merges all docs, builds a Lunr index in-memory via ExecJS, and writes the serialized index + raw docs to `public/assets/javascript/index.js`.

### Content Types Indexed

| Type | Source | Count |
|------|--------|-------|
| Working Notes | `textfiles/{Novel}/*.txt` | 65 files (4 novels) |
| Annotations | Remote IIIF JSON | ~thousands per novel |
| Site Content | `src/pages/**/*.mdx` | ~15-20 pages |

### Current Lunr Configuration

- **Fields & boosts:** `title` (20), `content` (10), `tags` (10), `url` (1), `type` (1, also facet field)
- **Pipeline:** Stemmer disabled, stop word filter disabled
- **Tokenizer:** Custom separator `/[\s,.;:/?!()]+/`
- **Fuzzy search fields:** Empty (not configured)

### Current Search UI Features

- Single search input on `/search`
- Faceted sidebar filtering by `type` (e.g. "Working Notes: Bleak House", "Annotations: David Copperfield", "Site Content")
- Sort by relevance, name A-Z, name Z-A
- Result count, pagination
- Basic result display: title (linked), URL, tags, type
- Search accessible via "Using the DDNP" dropdown menu

---

## 2. Requirements from GitHub Issues

### Parent User Story (#255)

> As a scholar using Dickens Notes, I want a search tool that allows me to search across Dickens's working notes, editorial annotations, and site content, while clearly distinguishing between these layers and prioritizing Dickens's text.

### Feature Requirements

| Issue | Requirement | Category |
|-------|-------------|----------|
| **#254** | Move search to top nav with magnifying glass icon | UI/UX |
| **#256** | Single unified search across all content types | Core (exists) |
| **#257** | Advanced search with checkboxes for content types + novel filters | Query |
| **#258** | Exact phrase search with quotation marks | Query |
| **#259** | Fuzzy/variant matching (spellings, abbreviations, partial matches) | Query |
| **#260** | Results grouped/labeled by type with novel filter + spacing | Results display |
| **#261** | Relevance boosting: Working Notes > Annotations > Site Content | Ranking |
| **#262** | Text snippets with search term highlighting | Results display |
| **#263** | Post-search faceted refinement by type and novel | Results display |
| **#264** | Stable URLs linking to anchored Mirador locations | Linking (exists) |
| **#265** | "How Search Works" documentation on search page | Documentation |
| **#266** | Scalable as more material is added | Performance |

---

## 3. Gap Analysis: Lunr.js vs. Requirements

### Can Lunr.js Deliver?

| Issue | Lunr Support | Verdict | Notes |
|-------|-------------|---------|-------|
| **#254** Search visibility | N/A (UI only) | **Yes** | No library dependency |
| **#256** Unified search | Already exists | **Done** | — |
| **#257** Advanced search | Partial | **Possible** | Field-specific search exists; UI/filter logic needs building |
| **#258** Exact phrase search | **Not supported** | **No** | [Open since 2014](https://github.com/olivernn/lunr.js/issues/62). Lunr tokenizes queries; no phrase-order matching. |
| **#259** Fuzzy matching | Basic | **Partial** | Tilde syntax (`term~1`) exists but [known bugs](https://github.com/olivernn/lunr.js/issues/375), limited edit distance, inconsistent results. |
| **#260** Grouped results | Partial | **Possible** | Facets exist via external plugin; grouping requires custom UI work. |
| **#261** Type-based relevance | **Not supported** | **No** | Lunr supports field-level boost but [not per-document-type boost](https://github.com/olivernn/lunr.js/issues/317). All "content" fields boost equally regardless of doc type. |
| **#262** Snippets + highlighting | **Not built-in** | **No** | [No snippet/highlight API](https://github.com/olivernn/lunr.js/issues/97). Lunr doesn't store source text. Would require building from scratch using undocumented position metadata. |
| **#263** Faceted refinement | Partial | **Possible** | External plugin provides basic facets; needs enhancement for novel-level filtering. |
| **#264** Stable URLs | Already working | **Done** | — |
| **#265** Documentation | N/A (content only) | **Yes** | No library dependency |
| **#266** Scalability | **Concerning** | **Risk** | 11 MB index loaded entirely client-side. Will grow linearly with content. No chunked loading support. |

### Critical Blockers

1. **Exact phrase search (#258)** — Fundamental gap with no workaround. Lunr tokenizes all queries into individual terms with no positional/order awareness.
2. **Snippets with highlighting (#262)** — Lunr stores no source text and has no snippet API. Building this custom would be substantial and fragile.
3. **Per-type relevance boosting (#261)** — Lunr can only boost by field at index time, not by document category at query time.

### Maintenance Risk

- Last npm release: **5+ years ago**
- 100+ open GitHub issues, no active triage
- Any bugs encountered must be patched locally
- jQuery dependency via the custom-search CDN library adds further maintenance burden

---

## 4. Recommended Replacement: MiniSearch

### Why MiniSearch?

| Criteria | Lunr.js | **MiniSearch** | Pagefind | FlexSearch |
|----------|---------|------------|----------|------------|
| Actively maintained | No (5 yrs stale) | **Yes** (v7.2.0, 2025) | Yes | Sporadic |
| Bundle size | ~100 KB | **~20 KB** min+gz | ~70 KB | ~6 KB |
| Exact phrase search | No | Post-filter viable | No | No |
| Fuzzy search | Basic, buggy | **Robust, configurable** | Limited | Basic |
| Field boosting | Build-time only | **Build + query time** | Limited | No |
| Document-type boosting | No | **Yes** (`boostDocument`) | No | No |
| Highlighting / match info | No | **Yes, built-in** | Yes | No |
| Faceted search | External plugin | **Built-in filter API** | Yes | No |
| Custom JSON indexing | Yes | **Yes** | HTML-focused | Yes |
| Index serialization | Yes | **Yes** (`exportIndex`/`loadIndex`) | Chunked | No |
| jQuery dependency | Yes (via CDN plugin) | **No** | No | No |

### Why Not the Alternatives?

- **Pagefind:** Excellent for HTML-based static sites, but DDNP indexes remote IIIF annotation JSON and local text files. Pagefind's Node API could handle this but it's not the library's primary design target.
- **FlexSearch:** Fast but poorly documented, unstable API across versions, no built-in highlighting or facets.
- **Orama:** Heavier, more server-oriented; overkill for this client-side use case.

### How MiniSearch Resolves Each Gap

| Gap | MiniSearch Solution |
|-----|-------------------|
| **Exact phrase (#258)** | Use `combineWith: 'AND'` + `tokenize` option to require all terms, then post-filter results by verifying term adjacency in stored source text. MiniSearch's `match` metadata provides field + term positions. |
| **Fuzzy matching (#259)** | Built-in `fuzzy` option with configurable threshold (e.g. `fuzzy: 0.2`). Can be toggled per-search via search options. |
| **Type-based boosting (#261)** | `boostDocument(id, term, storedFields)` callback at search time. Return higher values for Working Notes, medium for Annotations, lower for Site Content. |
| **Snippets + highlighting (#262)** | `match` info in results provides matched terms per field. Combined with stored `content` field, generate snippets and wrap matched terms in `<mark>` tags. |
| **Faceted refinement (#263)** | `filter` option at search time to include/exclude by type or novel. No external plugin needed. |
| **Scalability (#266)** | ~20 KB library + smaller serialized index. `exportIndex`/`loadIndex` for fast startup. Efficient trie-based data structures. |

---

## 5. Sources

- [Lunr.js — Exact phrase matching (Issue #62)](https://github.com/olivernn/lunr.js/issues/62)
- [Lunr.js — Fuzzy search bugs (Issue #375)](https://github.com/olivernn/lunr.js/issues/375)
- [Lunr.js — Highlighting (Issue #97)](https://github.com/olivernn/lunr.js/issues/97)
- [Lunr.js — Per-document boost (Issue #317)](https://github.com/olivernn/lunr.js/issues/317)
- [MiniSearch documentation](https://lucaong.github.io/minisearch/)
- [MiniSearch GitHub](https://github.com/lucaong/minisearch)
- [MiniSearch exact match (Issue #216)](https://github.com/lucaong/minisearch/issues/216)
- [Pagefind documentation](https://pagefind.app/)
- [Lunr.js npm](https://www.npmjs.com/package/lunr)
- [MiniSearch npm](https://www.npmjs.com/package/minisearch)
