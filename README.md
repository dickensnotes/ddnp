# The Digital Dickens Notes Project

The Digital Dickens Notes Project allows users to explore and interpret the ‘Working Notes’ Charles Dickens kept for his novels. Dickens composed and published all of his fifteen novels in monthly or weekly installments, and for many novels he used these Working Notes–one sheet of paper for each installment–to consider character combinations and plot developments; to record titles, events, and key phrases; and to document decisions made or deferred to subsequent numbers.

The DDNP pairs accurate transcriptions of the Working Notes with scholarly introductions and annotations that illuminate their significance for understanding the dynamics of Dickens’s creative process and Victorian serial form.

## Adding or editing text content

In the DDNP, most pages are written in markdown, in `.md` or `.mdx` files found in `src/pages`. Each page is one file, and the URL follows the file path. To edit the General Introduction at `/introduction/general` in the browser, you'd edit the file `src/pages/introduction/general.mdx`.

If you aren't familiar with markdown, Github's [docs](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) on writing in markdown are a great start.

The easiest way to add a new page or modify text content is through Github's online editor. If you're on the repo page in the browser, type `.` to open the codebase in a lightweight version of VS Code in the browser called github.dev. You can find instructions on how to edit files and save changes [here](https://docs.github.com/en/codespaces/the-githubdev-web-based-editor).

The general process will be this:

1. Open the repository in github.dev
2. Create a new branch for your work, or switch to the branch you've been working on.
3. Make changes.
4. Save your changes through Source Control per the [docs](https://docs.github.com/en/codespaces/the-githubdev-web-based-editor).
5. In Github, create PR from your working branch.
6. Merge the PR when you're ready.

## Viewing Specific Annotation in Mirador
You can view a specific annotation by populating the canvas and annotationid property. The annotationid should match the `id` field in the annotation. The canvas should direct mirador to the correct canvas (image) that the annotation is on. 
For example:
[https://tubular-narwhal-84b42b.netlify.app/notes/bleak-house/mirador/?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN04.json&annotationid=00547443-abdb-4f41-bb6b-c3a0cf5076cf.json](https://tubular-narwhal-84b42b.netlify.app/notes/bleak-house/mirador/?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/BHWN04.json&annotationid=00547443-abdb-4f41-bb6b-c3a0cf5076cf.json)

## Running the DDNP locally

The DDNP is built on [Astro](https://astro.build/), uses [TailwindCSS](https://tailwindcss.com/) for styling, and several [React](https://reactjs.org/) libraries, including [Mirador](https://projectmirador.org/).

It also leverages [pnpm](https://pnpm.js.org/) to manage JS dependencies.

To run locally:

1. Ensure you have [Node](https://nodejs.org/) and [pnpm](https://pnpm.js.org/) installed.
2. Ensure you have [Python 3](https://www.python.org/) and [uv](https://docs.astral.sh/uv/) installed (required for search index building).
3. Clone the repository.
4. Run `pnpm install` at the root of the repository to install JavaScript dependencies.
5. Run `uv sync` to install Python dependencies (BeautifulSoup, requests, PyYAML).
6. Run `pnpm run dev` at the root of the repository to run the application.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                                    |
| :--------------------- | :-------------------------------------------------------- |
| `pnpm install`         | Installs JavaScript dependencies                          |
| `uv sync`              | Installs Python dependencies (for search indexing)        |
| `pnpm run dev`         | Starts local dev server at `localhost:4321`               |
| `pnpm run build:index` | Builds search index from annotations, notes, and pages    |
| `pnpm run build`       | Builds search index + production site to `./dist/`        |
| `pnpm run preview`     | Preview your build locally, before deploying              |

Feel free to check [the Astro documentation](https://docs.astro.build) or jump into their [Discord server](https://astro.build/chat) for help with Astro.

## Search Index

The DDNP uses [MiniSearch](https://lucaong.github.io/minisearch/) to index and search across three types of content:
- **Working Notes** (65 text files from 4 novels)
- **Annotations** (fetched from remote IIIF API)
- **Site Content** (MDX pages)

The search index is built automatically during `pnpm run build`, or can be built manually with `pnpm run build:index`. The build process:
1. Fetches annotations from the remote API using Python
2. Indexes Working Notes text files
3. Indexes site content pages
4. Generates `public/assets/javascript/search-data.json` (~4 MB)

**Note:** The search index builder requires Python 3 and uv. Install Python dependencies with `uv sync`.

## Global/window shim

Due to Vite, we have to shim `window` for Mirador to work. We're currently doing this by adding a snippet to the HTML of any page with Mirador.

`<script>window.global = window;</script>`
