import {
  PAGES_BASE,
  annotationFileText,
  annotationFilename,
  listUrlForCanvas,
  parseAnnotationFile,
  reorderSequence,
  setFileOrder,
  toDdnpAnnotation,
  toMaeAnnotation,
} from "./ddnpAnnotations.js";
import { textUnchanged } from "./quillHtml.js";

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

async function fetchJson(url, headers, cache = "default") {
  const response = await fetch(url, { headers, cache });
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return response.json();
}

/**
 * Commit several `_annotations/` files to the sandbox branch at once, as one
 * commit (GitHub's Git Data API). `buildFiles(headSha)` returns the
 * `[{ path, content }]` to write, based on the branch head it is given. The
 * ref is fixed to the sandbox branch, and the update is not forced, so it
 * fails (422) if someone else committed in the meantime.
 */
export async function commitToSandbox(buildFiles, message, headers = {}) {
  const ref = `heads/${assertSandboxBranch(SANDBOX_BRANCH)}`;
  const api = async (path, init = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...headers, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const error = new Error(`${response.status} from ${init.method ?? "GET"} ${path}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };

  const head = (await api(`/git/ref/${ref}`)).object.sha;
  const baseTree = (await api(`/git/commits/${head}`)).tree.sha;
  const files = await buildFiles(head);
  for (const file of files) {
    if (!/^_annotations\/[^/]+\.json$/.test(file.path)) throw new Error(`Refusing to write outside _annotations/: ${file.path}`);
  }
  if (files.length === 0) return null;

  const tree = await api("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTree,
      tree: files.map(({ path, content }) => ({ path, mode: "100644", type: "blob", content })),
    }),
  });
  const commit = await api("/git/commits", {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
  });
  await api(`/git/refs/${ref}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}

/**
 * Every `_annotations/` file the sandbox branch has added, changed or
 * removed relative to `main`, keyed by filename. One compare call per
 * page load (cached), plus one request per changed file.
 */
let branchChangesPromise = null;

export function branchChanges(headers = {}) {
  branchChangesPromise ??= (async () => {
    const compare = await fetchJson(`${API}/compare/main...${SANDBOX_BRANCH}`, headers, "no-store");
    const files = compare.files.filter((f) => /^_annotations\/[^/]+\.json$/.test(f.filename));
    const entries = await Promise.all(
      files.map(async (file) => {
        const name = file.filename.split("/").pop();
        if (file.status === "removed") return [name, { removed: true }];
        const response = await fetch(
          `${API}/contents/${file.filename}?ref=${SANDBOX_BRANCH}`,
          { headers: { ...headers, Accept: "application/vnd.github.raw+json" }, cache: "no-store" },
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

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (base64) =>
  new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

/**
 * `order` of every annotation on `main` (by filename) and the highest per
 * canvas, from the published root index (large, so fetched once, on demand).
 */
let publishedOrdersPromise = null;

function publishedOrders() {
  publishedOrdersPromise ??= fetchJson(`${PAGES_BASE}/`).then((index) => {
    const byFile = new Map();
    const maxByCanvas = new Map();
    for (const entry of index.annotations ?? []) {
      if (entry.filename?.endsWith("-list.json")) continue;
      const json = typeof entry.json === "string" ? JSON.parse(entry.json) : entry.json;
      const target = Array.isArray(json?.on) ? json.on[0] : json?.on;
      const order = Number(entry.order);
      if (!Number.isFinite(order)) continue;
      // `filename` is a full URL; the annotation's @id is the bare filename
      byFile.set(json?.["@id"] ?? String(entry.filename).split("/").pop(), order);
      if (target?.full) maxByCanvas.set(target.full, Math.max(maxByCanvas.get(target.full) ?? 0, order));
    }
    return { byFile, maxByCanvas };
  });
  publishedOrdersPromise.catch(() => { publishedOrdersPromise = null; });
  return publishedOrdersPromise;
}

/**
 * MAE storage adapter backed by GitHub. Constructed per canvas by MAE:
 * `adapter: (canvasId) => new GitHubAnnotationAdapter(canvasId, options)`.
 *
 * Reads the published list for the canvas, overlaid with the sandbox
 * branch's changes. Writes commit `_annotations/<uuid>.json` files to the
 * sandbox branch only (see `writeToSandbox`). Without a token it is
 * read-only.
 */
export default class GitHubAnnotationAdapter {
  constructor(canvasId, { user = "Anonymous", token = null, manifestId } = {}) {
    this.canvasId = canvasId;
    this.user = user;
    this.token = token;
    this.manifestId = manifestId;
    this.annotationPageId = `${listUrlForCanvas(canvasId)}#${SANDBOX_BRANCH}`;
  }

  getStorageAdapterUser() {
    return this.user;
  }

  get #headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /** Whether this adapter can save (it has a token). */
  get canWrite() {
    return Boolean(this.token);
  }

  async all() {
    return {
      id: this.annotationPageId,
      type: "AnnotationPage",
      items: (await this.#sequence()).map((entry) => toMaeAnnotation(entry.annotation)),
    };
  }

  /**
   * The canvas's annotations in reading order: the published list (already
   * sorted by `order` on main), overlaid with the branch's edits, additions,
   * deletions and new `order` values. Sorted by `order`, then published
   * position. Main's `order` values are only fetched when the branch has
   * changed something on this canvas, or when `withOrders` is set.
   */
  async #sequence(withOrders = false) {
    const [published, changes] = await Promise.all([
      fetchJson(listUrlForCanvas(this.canvasId)),
      branchChanges(this.#headers),
    ]);

    const entries = [];
    (published.resources ?? []).forEach((annotation, position) => {
      const filename = annotation["@id"];
      const change = changes.get(filename);
      if (change?.removed) return;
      const onBranch = change && change.canvas === this.canvasId;
      entries.push({
        filename,
        annotation: onBranch ? change.annotation : annotation,
        order: onBranch ? change.order : undefined,
        position,
      });
    });

    const listed = new Set(entries.map((entry) => entry.filename));
    for (const [filename, change] of changes) {
      if (!change.removed && change.canvas === this.canvasId && !listed.has(filename)) {
        entries.push({ filename, annotation: change.annotation, order: change.order, position: Infinity });
      }
    }

    let ordered = false;
    if (withOrders || entries.some((entry) => entry.order !== undefined)) {
      try {
        const { byFile } = await publishedOrders();
        for (const entry of entries) entry.order ??= byFile.get(entry.filename);
        ordered = true;
      } catch (error) {
        // Still show the annotations: published order, branch additions last
        if (withOrders) throw new Error(`Couldn't load the current reading order (${error.message}).`);
        console.warn("Annotation editor: couldn't load reading order;", error);
      }
    }

    const key = (entry) => (Number.isFinite(entry.order) ? entry.order : Infinity);
    return entries.sort((a, b) => (ordered
      ? key(a) - key(b) || a.position - b.position
      : a.position - b.position || key(a) - key(b)) || a.filename.localeCompare(b.filename));
  }

  async get(annotationId) {
    return (await this.all()).items.find((item) => item.id === annotationId) ?? null;
  }

  async create(maeAnnotation) {
    return this.#write(async () => {
      const filename = annotationFilename(maeAnnotation);
      const order = await this.#nextOrder();
      const annotation = toDdnpAnnotation(maeAnnotation, {
        canvas: this.canvasId, manifestId: this.manifestId, user: this.user,
      });
      const file = { canvas: this.canvasId, order, annotation: { ...annotation, "@id": filename } };
      await writeToSandbox("PUT", `_annotations/${filename}`, {
        message: `write ${filename} via DDNP editor`,
        content: toBase64(annotationFileText(file)),
        branch: SANDBOX_BRANCH,
      }, this.#headers);
      (await branchChanges(this.#headers)).set(filename, file);
    });
  }

  async update(maeAnnotation) {
    return this.#write(async () => {
      const filename = annotationFilename(maeAnnotation);
      const { sha, file } = await this.#readFile(filename);
      const annotation = toDdnpAnnotation(maeAnnotation, {
        original: file.annotation,
        canvas: file.canvas,
        manifestId: this.manifestId,
        user: this.user,
        keepOriginalText: await textUnchanged(file.annotation, maeAnnotation),
      });
      const updated = { ...file, annotation };
      await writeToSandbox("PUT", `_annotations/${filename}`, {
        message: `write ${filename} via DDNP editor`,
        content: toBase64(annotationFileText(updated)),
        sha,
        branch: SANDBOX_BRANCH,
      }, this.#headers);
      (await branchChanges(this.#headers)).set(filename, updated);
    });
  }

  async delete(annotationId) {
    return this.#write(async () => {
      const filename = annotationFilename({ id: annotationId });
      const { sha } = await this.#readFile(filename);
      await writeToSandbox("DELETE", `_annotations/${filename}`, {
        message: `delete ${filename} via DDNP editor`,
        sha,
        branch: SANDBOX_BRANCH,
      }, this.#headers);
      (await branchChanges(this.#headers)).set(filename, { removed: true });
    });
  }

  /**
   * Move an annotation one place up (-1) or down (+1) in this canvas's
   * reading order, by rewriting `order` front matter in one commit.
   */
  async move(annotationId, direction) {
    return this.#write(async () => {
      const filename = annotationFilename({ id: annotationId });
      const sequence = await this.#sequence(true);
      const changes = reorderSequence(sequence, filename, direction);
      if (changes.length === 0) return;

      const canvasName = this.canvasId.split("/").pop().replace(/\.json$/, "");
      await commitToSandbox(
        (head) => Promise.all(changes.map(async (change) => ({
          path: `_annotations/${change.filename}`,
          content: setFileOrder(await this.#readRaw(change.filename, head), change.to),
        }))),
        `reorder annotations on ${canvasName} via DDNP editor`,
        this.#headers,
      );

      const branch = await branchChanges(this.#headers);
      for (const change of changes) {
        const entry = sequence.find((e) => e.filename === change.filename);
        branch.set(change.filename, { canvas: this.canvasId, order: change.to, annotation: entry.annotation });
      }
    });
  }

  /** A file's text at a given commit or branch. */
  async #readRaw(filename, ref) {
    const response = await fetch(`${API}/contents/_annotations/${filename}?ref=${ref}`, {
      headers: { ...this.#headers, Accept: "application/vnd.github.raw+json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const error = new Error(`${response.status} reading ${filename}`);
      error.status = response.status;
      throw error;
    }
    return response.text();
  }

  /** Current file and blob sha on the sandbox branch. */
  async #readFile(filename) {
    const json = await fetchJson(
      `${API}/contents/_annotations/${filename}?ref=${SANDBOX_BRANCH}`,
      { ...this.#headers, Accept: "application/vnd.github+json" },
      "no-store",
    );
    return { sha: json.sha, file: parseAnnotationFile(fromBase64(json.content)) };
  }

  /** One past the highest `order` on this canvas, on main or the branch. */
  async #nextOrder() {
    const [{ maxByCanvas }, changes] = await Promise.all([publishedOrders(), branchChanges(this.#headers)]);
    let highest = maxByCanvas.get(this.canvasId) ?? 0;
    for (const change of changes.values()) {
      if (!change.removed && change.canvas === this.canvasId) highest = Math.max(highest, change.order);
    }
    return highest + 1;
  }

  /**
   * Run a write, then return the refreshed page for MAE. MAE ignores
   * rejected promises, so failures are reported to the user here.
   */
  async #write(operation) {
    try {
      if (!this.token) throw new Error("Sign in with a GitHub token to save.");
      await operation();
    } catch (error) {
      window.alert(writeErrorMessage(error));
    }
    return this.all();
  }
}

function writeErrorMessage(error) {
  switch (error.status) {
    case 401:
      return "GitHub didn't accept your token. Sign out and sign in again with a valid token.";
    case 403:
    case 404:
      return "Your token can't write to dickens-annotations. Check it has Contents: Read and write access to that repository.";
    case 409:
    case 422:
      return "Someone else saved a change since you opened this page. Reload the page and try again.";
    default:
      return `Not saved: ${error.message}`;
  }
}
