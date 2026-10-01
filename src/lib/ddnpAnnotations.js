/**
 * Helpers for DDNP's annotations, which are stored in the
 * dickensnotes/dickens-annotations repo as IIIF Presentation 2
 * (`oa:Annotation`) files, and the W3C / IIIF 3 shape that the
 * Mirador Annotation Editor (MAE) works with.
 */

export const PAGES_BASE = "https://dickensnotes.github.io/dickens-annotations";

// MAE's default shape style (TARGET_TOOL_STATE in MAE's AnnotationFormUtils)
const SHAPE_STYLE = {
  fill: "rgba(100,100,100, 0)",
  stroke: "rgba(255,0, 0, 0.5)",
  strokeWidth: 5,
};

/**
 * URL of the per-canvas annotation list that GitHub Pages publishes,
 * e.g. .../davidcopperfieldtranscription/DCWN01.json → .../annotations/dcwn01-list.json
 */
export function listUrlForCanvas(canvasId) {
  const name = canvasId.split("/").pop().replace(/\.json$/, "").toLowerCase();
  return `${PAGES_BASE}/annotations/${name}-list.json`;
}

/**
 * Split an `_annotations/<uuid>.json` file into its YAML front matter
 * (`canvas`, `order`) and its JSON annotation.
 */
export function parseAnnotationFile(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error("Annotation file has no front matter");
  const [, frontMatter, json] = match;
  const field = (name) =>
    frontMatter.match(new RegExp(`^${name}:\\s*(.*?)\\s*$`, "m"))?.[1];

  return {
    canvas: field("canvas")?.replace(/^["']|["']$/g, ""),
    order: Number(field("order")),
    annotation: JSON.parse(json),
  };
}

function firstTarget(annotation) {
  return Array.isArray(annotation.on) ? annotation.on[0] : annotation.on;
}

/** The annotation's `xywh=` bounding box, in canvas pixels. */
export function boundingBox(annotation) {
  const selector = firstTarget(annotation)?.selector;
  const fragment = selector?.["@type"] === "oa:Choice" ? selector.default : selector;
  const match = fragment?.value?.match(/xywh=(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)/);
  if (!match) return null;
  const [x, y, width, height] = match.slice(1).map(Number);
  return { x, y, width, height };
}

function svgSelectorValue(annotation) {
  const selector = firstTarget(annotation)?.selector;
  if (selector?.["@type"] === "oa:Choice") return selector.item?.value;
  return selector?.["@type"] === "oa:SvgSelector" ? selector.value : undefined;
}

/**
 * Present a DDNP (IIIF 2) annotation to MAE as a W3C annotation.
 *
 * MAE only opens its Note form for annotations carrying `maeData`; anything
 * else falls back to the raw-JSON "expert" editor. So we synthesise
 * `maeData`, using the annotation's bounding box as an editable rectangle.
 * For freehand targets the rectangle is a stand-in: the original SVG is
 * kept unless someone redraws the shape.
 */
export function toMaeAnnotation(annotation) {
  const target = firstTarget(annotation);
  const box = boundingBox(annotation);
  const svg = svgSelectorValue(annotation);

  const body = [].concat(annotation.resource ?? []).map((resource) => ({
    type: "TextualBody",
    purpose: resource["@type"] === "oa:Tag" ? "tagging" : "describing",
    value: resource.chars ?? "",
    ...(resource.format && { format: resource.format }),
  }));

  const selector = [];
  if (svg) selector.push({ type: "SvgSelector", value: svg });
  if (box) {
    selector.push({
      type: "FragmentSelector",
      value: `xywh=${box.x},${box.y},${box.width},${box.height}`,
    });
  }

  const shapes = box
    ? [{ id: `${annotation["@id"]}#target`, type: "rectangle", scaleX: 1, scaleY: 1, ...box, ...SHAPE_STYLE }]
    : [];

  return {
    id: annotation["@id"],
    type: "Annotation",
    motivation: "commenting",
    body,
    target: { source: target?.full, selector },
    creator: [].concat(annotation["oa:annotatedBy"] ?? [])[0],
    creationDate: annotation["oa:annotatedAt"],
    maeData: {
      templateType: "multiple_body",
      tags: [],
      textBody: body.find((b) => b.purpose === "describing"),
      target: {
        drawingState: { currentShape: null, isDrawing: false, shapes },
        svg,
      },
    },
  };
}
