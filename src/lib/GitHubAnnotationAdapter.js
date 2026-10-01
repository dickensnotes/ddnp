import { listUrlForCanvas, parseAnnotationFile, toMaeAnnotation } from "./ddnpAnnotations.js";

export const ANNOTATIONS_REPO = "dickensnotes/dickens-annotations";
// The POC reads and writes this branch only. GitHub Pages and the repo's
// Actions run from `main`, so nothing on this branch is published.
export const SANDBOX_BRANCH = "mae-poc";

const API = `https://api.github.com/repos/${ANNOTATIONS_REPO}`;

/**
 * Throw unless `branch` is the sandbox branch. GitHub tokens can't be
 * limited to a branch and `main` is unprotected, so this check is what
 * keeps the editor test from writing to the published annotations.
 */
export function assertSandboxBranch(branch) {
  if (branch !== SANDBOX_BRANCH || branch === "main") {
    throw new Error(
      `Refusing to write to "${branch}": the editor test may only write to "${SANDBOX_BRANCH}".`,
    );
  }
  return branch;
}

/**
 * The only way the adapter writes to GitHub: a contents-API request
 * (PUT or DELETE) whose body names the branch, checked before sending.
 */
export async function writeToSandbox(method, path, body, headers = {}) {
  if (!["PUT", "DELETE"].includes(method)) throw new Error(`Unexpected write method ${method}`);
  if (!/^_annotations\/[^/]+\.json$/.test(path)) throw new Error(`Refusing to write outside _annotations/: ${path}`);
  assertSandboxBranch(body?.branch);

  const response = await fetch(`${API}/contents/${path}`, {
    method,
    headers: { ...headers, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = new Error(`${response.status} writing ${path}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

/**
 * Every `_annotations/` file the sandbox branch has added, changed or
 * removed relative to `main`, keyed by filename. One compare call per
 * page load (cached), plus one request per changed file.
 */
let branchChangesPromise = null;

export function branchChanges(headers = {}) {
  branchChangesPromise ??= (async () => {
    const compare = await fetchJson(`${API}/compare/main...${SANDBOX_BRANCH}`, headers);
    const files = compare.files.filter((f) => /^_annotations\/[^/]+\.json$/.test(f.filename));
    const entries = await Promise.all(
      files.map(async (file) => {
        const name = file.filename.split("/").pop();
        if (file.status === "removed") return [name, { removed: true }];
        const response = await fetch(
          `${API}/contents/${file.filename}?ref=${SANDBOX_BRANCH}`,
          { headers: { ...headers, Accept: "application/vnd.github.raw+json" } },
        );
        if (!response.ok) throw new Error(`${response.status} fetching ${file.filename}`);
        return [name, parseAnnotationFile(await response.text())];
      }),
    );
    return new Map(entries);
  })();
  branchChangesPromise.catch(() => { branchChangesPromise = null; });
  return branchChangesPromise;
}

/**
 * MAE storage adapter backed by GitHub. Constructed per canvas by MAE:
 * `adapter: (canvasId) => new GitHubAnnotationAdapter(canvasId, options)`.
 *
 * Reading only, for now: annotations come from the published list for the
 * canvas, overlaid with the sandbox branch's changes.
 */
export default class GitHubAnnotationAdapter {
  constructor(canvasId, { user = "Anonymous" } = {}) {
    this.canvasId = canvasId;
    this.user = user;
    this.annotationPageId = `${listUrlForCanvas(canvasId)}#${SANDBOX_BRANCH}`;
  }

  getStorageAdapterUser() {
    return this.user;
  }

  async all() {
    const [published, changes] = await Promise.all([
      fetchJson(listUrlForCanvas(this.canvasId)),
      branchChanges(),
    ]);

    const annotations = [];
    for (const annotation of published.resources ?? []) {
      const change = changes.get(annotation["@id"]);
      if (change?.removed) continue;
      annotations.push(change && change.canvas === this.canvasId ? change.annotation : annotation);
    }

    const publishedIds = new Set(annotations.map((a) => a["@id"]));
    const added = [...changes.values()]
      .filter((c) => !c.removed && c.canvas === this.canvasId && !publishedIds.has(c.annotation["@id"]))
      .sort((a, b) => a.order - b.order)
      .map((c) => c.annotation);

    return {
      id: this.annotationPageId,
      type: "AnnotationPage",
      items: [...annotations, ...added].map(toMaeAnnotation),
    };
  }

  async get(annotationId) {
    return (await this.all()).items.find((item) => item.id === annotationId) ?? null;
  }

  async create() {
    return this.#notConnected();
  }

  async update() {
    return this.#notConnected();
  }

  async delete() {
    return this.#notConnected();
  }

  async #notConnected() {
    window.alert("Saving to GitHub isn't connected yet; your change was not saved.");
    return this.all();
  }
}
