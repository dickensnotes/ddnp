/**
 * Build-time fixes for bugs in Mirador Annotation Editor (MAE) 1.3.3.
 *
 * Each patch replaces exact text in MAE's ES bundle. If MAE's code changes
 * (an upgrade, say), the build warns which patch no longer applies and
 * tests/mae-patches.test.js fails. Remove a patch once MAE fixes the bug.
 */
import { readFile } from "node:fs/promises";

const FILE = /mirador-annotation-editor[\\/]dist[\\/]mirador-annotation-editor\.es\.js$/;

export const PATCHES = [
  {
    // While a shape is edited, MAE re-renders its drawing layer only when the
    // zoom changes (TargetSpatialInput's updateScale skips equal values), so
    // after a pan the shapes are drawn and dragged in the wrong place.
    // Re-render on every viewer movement.
    name: "shape layer follows pans",
    edits: [
      ["[_, T] = vt(n.getScale()),", "[_, T] = vt(n.getScale()), [, __ddnpRefresh] = vt(0),"],
      ["T((q) => q === G ? q : G);", "T((q) => q === G ? q : G), __ddnpRefresh((k) => k + 1);"],
    ],
  },
  {
    // While a shape is selected, MAE's drawing layer (AnnotationDrawing's
    // window keydown handler) takes every Delete, Backspace or Tab as a shape
    // command, including keys typed in the note's text box, so Backspace
    // deletes the shape. Ignore keys typed into text fields, as MAE's own
    // hotkey listener does.
    name: "typing in the note doesn't delete the shape",
    edits: [
      [
        "if (L.stopPropagation(), !!e.currentShape) {",
        "if (L.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(L.target?.tagName ?? \"\")) return;\n    if (L.stopPropagation(), !!e.currentShape) {",
      ],
    ],
  },
];

/** Names of the patches whose target code isn't in `code` exactly once. */
export function unmatchedPatches(code) {
  return PATCHES
    .filter((patch) => !patch.edits.every(([from]) => code.split(from).length === 2))
    .map((patch) => patch.name);
}

/** Patched source, or null if any patch no longer matches MAE's code. */
export function patchMae(code) {
  if (unmatchedPatches(code).length > 0) return null;
  return PATCHES
    .flatMap((patch) => patch.edits)
    .reduce((result, [from, to]) => result.replace(from, () => to), code);
}

const warning = (code) =>
  `MAE patches not applied: mirador-annotation-editor's code has changed (${unmatchedPatches(code).join("; ")}). `
  + "Check whether those bugs are fixed upstream, then update or remove them in scripts/mae-patches.mjs.";

/** Vite plugin for production builds. */
export function maePatches() {
  return {
    name: "ddnp-mae-patches",
    enforce: "pre",
    transform(code, id) {
      if (!FILE.test(id.split("?")[0])) return null;
      const patched = patchMae(code);
      if (!patched) {
        this.warn(warning(code));
        return null;
      }
      return { code: patched, map: null };
    },
  };
}

/** esbuild plugin for the dev server, which pre-bundles MAE without Vite plugins. */
export const maePatchesEsbuild = {
  name: "ddnp-mae-patches",
  setup(build) {
    build.onLoad({ filter: FILE }, async (args) => {
      const code = await readFile(args.path, "utf8");
      const patched = patchMae(code);
      if (!patched) console.warn(warning(code));
      return { contents: patched ?? code, loader: "js" };
    });
  },
};
