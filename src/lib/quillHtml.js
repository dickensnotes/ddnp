/**
 * MAE's text editor (react-quill-new → Quill) rewrites an annotation's HTML
 * into Quill's own markup as soon as the annotation is opened, before anyone
 * types. To tell whether the text was really edited, we run the stored HTML
 * through Quill with MAE's settings and compare. Browser only.
 */

// MAE's DEFAULT_QUILL_CONFIG formats (MAE src/utils.js)
const MAE_FORMATS = [
  "header", "bold", "italic", "underline", "strike", "blockquote",
  "list", "indent", "link", "image", "color", "background",
];

let quillModule = null;

/** The HTML the editor would produce for `html` if nobody touched it. */
export async function quillHtml(html) {
  const { default: Quill } = await (quillModule ??= import("quill"));
  const quill = new Quill(document.createElement("div"), { formats: MAE_FORMATS });
  // Same calls react-quill-new makes when it receives a value
  quill.setContents(quill.clipboard.convert({ html }));
  return quill.getSemanticHTML();
}

const describing = (resources) =>
  resources.filter((r) => r["@type"] !== "oa:Tag").map((r) => r.chars ?? "").join("");
const tags = (values) => JSON.stringify(values.sort());

/** True when the user left the original annotation's text and tags alone. */
export async function textUnchanged(original, maeAnnotation) {
  const resources = [].concat(original.resource ?? []);
  const bodies = [].concat(maeAnnotation.body ?? []);
  const sameTags = tags(resources.filter((r) => r["@type"] === "oa:Tag").map((r) => r.chars))
    === tags(bodies.filter((b) => b.purpose === "tagging").map((b) => b.value));
  const edited = bodies.filter((b) => b.purpose !== "tagging").map((b) => b.value ?? "").join("");
  return sameTags && (await quillHtml(describing(resources))) === edited;
}
