/**
 * Fix for a Mirador Annotation Editor (MAE) 1.3.3 bug.
 *
 * While a shape is being edited, MAE draws it on a layer positioned over
 * the image. The layer only re-renders when the zoom level changes, so a
 * pan — or the viewer re-centring when the edit panel opens — leaves the
 * shapes drawn (and dragged) in the wrong place. This makes every viewer
 * movement re-render the layer.
 *
 * The bug is in MAE's TargetSpatialInput: `updateScale` skips the state
 * update when the scale is unchanged. Remove this once MAE fixes it.
 */
import { readFile } from "node:fs/promises";

const FILE = /mirador-annotation-editor[\\/]dist[\\/]mirador-annotation-editor\.es\.js$/;

const PATCHES = [
  // Add a counter to re-render with…
  ["[_, T] = vt(n.getScale()),", "[_, T] = vt(n.getScale()), [, __ddnpRefresh] = vt(0),"],
  // …and bump it on every viewer animation and resize
  ["T((q) => q === G ? q : G);", "T((q) => q === G ? q : G), __ddnpRefresh((k) => k + 1);"],
];

/** Patched source, or null if MAE's code no longer matches. */
export function patchMae(code) {
  if (!PATCHES.every(([from]) => code.split(from).length === 2)) return null;
  return PATCHES.reduce((result, [from, to]) => result.replace(from, to), code);
}

const WARNING =
  "MAE overlay fix did not apply: mirador-annotation-editor's code has changed. " +
  "Check whether the shape-position bug is fixed upstream, then update or remove scripts/mae-overlay-fix.mjs.";

/** Vite plugin for production builds. */
export function maeOverlayFix() {
  return {
    name: "ddnp-mae-overlay-fix",
    enforce: "pre",
    transform(code, id) {
      if (!FILE.test(id.split("?")[0])) return null;
      const patched = patchMae(code);
      if (!patched) {
        this.warn(WARNING);
        return null;
      }
      return { code: patched, map: null };
    },
  };
}

/** esbuild plugin for the dev server, which pre-bundles MAE without Vite plugins. */
export const maeOverlayFixEsbuild = {
  name: "ddnp-mae-overlay-fix",
  setup(build) {
    build.onLoad({ filter: FILE }, async (args) => {
      const code = await readFile(args.path, "utf8");
      const patched = patchMae(code);
      if (!patched) console.warn(WARNING);
      return { contents: patched ?? code, loader: "js" };
    });
  },
};
