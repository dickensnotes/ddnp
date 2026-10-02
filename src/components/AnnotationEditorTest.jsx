import React, { useState } from "react";
import MiradorEditor from "./MiradorEditor";
import { ANNOTATIONS_REPO, SANDBOX_BRANCH } from "../lib/GitHubAnnotationAdapter.js";

const STORAGE_KEY = "ddnp-annotation-editor-test";
const NEW_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the session lasts until the page is reloaded
  }
}

function signOut() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored
  }
  // Mirador has no clean way to re-initialise, so start again
  window.location.reload();
}

/** Check the token can see the annotations repo before using it. */
async function checkToken(token) {
  const response = await fetch(`https://api.github.com/repos/${ANNOTATIONS_REPO}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (response.status === 401) throw new Error("GitHub didn't accept that token. Check you copied all of it.");
  if (!response.ok) throw new Error(`That token can't see ${ANNOTATIONS_REPO}. Check its repository access.`);
}

function SignIn({ onSignIn, onBrowse }) {
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await checkToken(token.trim());
      onSignIn({ name: name.trim(), token: token.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Annotation editor test</h1>
        <p className="mt-3 text-gray-700">
          Edits you save here go to the <strong>{SANDBOX_BRANCH}</strong> test branch of{" "}
          <code>{ANNOTATIONS_REPO}</code>. They do not change the published annotations or this website.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="editor-name" className="block font-medium text-gray-900">Your name</label>
            <p id="editor-name-help" className="text-sm text-gray-600">As it should appear on annotations you create.</p>
            <input
              id="editor-name"
              aria-describedby="editor-name-help"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-gray-400 px-3 py-2"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="editor-token" className="block font-medium text-gray-900">GitHub token</label>
            <div id="editor-token-help" className="text-sm text-gray-600">
              <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                Create a fine-grained token
              </a>{" "}
              with:
              <ul className="ml-5 mt-1 list-disc">
                <li>Resource owner: <strong>dickensnotes</strong></li>
                <li>Repository access: only <strong>dickens-annotations</strong></li>
                <li>Repository permissions: <strong>Contents → Read and write</strong></li>
              </ul>
              It is stored in this browser only. Sign out to remove it.
            </div>
            <input
              id="editor-token"
              aria-describedby="editor-token-help"
              type="password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded border border-gray-400 px-3 py-2 font-mono"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          {error && <p role="alert" className="text-red-700">{error}</p>}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={checking}
              className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {checking ? "Checking token…" : "Sign in"}
            </button>
            <button type="button" onClick={onBrowse} className="text-blue-700 underline">
              Just look around (saving off)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Unlisted test page: sign in with a GitHub token, then annotate in Mirador.
 * Saves go to the sandbox branch only.
 */
export default function AnnotationEditorTest({ loadedManifest }) {
  const [session, setSession] = useState(loadSession);

  if (!session) {
    return (
      <SignIn
        onSignIn={(next) => {
          saveSession(next);
          setSession(next);
        }}
        onBrowse={() => setSession({ readOnly: true })}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100 px-4 py-1.5 text-sm text-amber-950">
        <span>
          {session.readOnly
            ? "Saving is off. Sign in with a GitHub token to save."
            : <>Test editor: saving to the <strong>{SANDBOX_BRANCH}</strong> test branch as <strong>{session.name}</strong>. The published annotations are not changed.</>}
        </span>
        <button type="button" onClick={signOut} className="underline">
          {session.readOnly ? "Sign in" : "Sign out"}
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <MiradorEditor
          loadedManifest={loadedManifest}
          token={session.token ?? null}
          user={session.name ?? "Anonymous"}
        />
      </div>
    </div>
  );
}
