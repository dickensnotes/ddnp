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

/* ------------------------------------------------------------------ */
/* Saving: MAE's W3C annotation → DDNP's IIIF 2 annotation file        */
/* ------------------------------------------------------------------ */

const IIIF2_CONTEXT = "http://iiif.io/api/presentation/2/context.json";

// Path attributes used by Annonatate, so new targets match the corpus
const PATH_ATTRIBUTES =
  'fill-opacity="0.00001" fill="#00bfff" fill-rule="nonzero" stroke="#ff0000" stroke-width="1" ' +
  'stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" ' +
  'stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" ' +
  'text-anchor="none" style="mix-blend-mode: normal"';

function drawingShapes(maeAnnotation) {
  let drawingState = maeAnnotation?.maeData?.target?.drawingState;
  if (typeof drawingState === "string") drawingState = JSON.parse(drawingState);
  return drawingState?.shapes ?? [];
}

const round = (n) => Math.round(n * 100) / 100;

/** Map a point in a Konva shape's own coordinates to canvas pixels. */
function toCanvas(shape, x, y) {
  const sx = (shape.scaleX ?? 1) * x;
  const sy = (shape.scaleY ?? 1) * y;
  const angle = ((shape.rotation ?? 0) * Math.PI) / 180;
  return [
    (shape.x ?? 0) + sx * Math.cos(angle) - sy * Math.sin(angle),
    (shape.y ?? 0) + sx * Math.sin(angle) + sy * Math.cos(angle),
  ];
}

function pairs(points, dx = 0, dy = 0) {
  const result = [];
  for (let i = 0; i + 1 < points.length; i += 2) result.push([points[i] + dx, points[i + 1] + dy]);
  return result;
}

/**
 * Outline of a MAE shape as polylines in canvas pixels, plus whether each
 * polyline is closed. Ellipses and circles are approximated with 36 points.
 */
export function shapeOutline(shape) {
  const ellipse = (rx, ry) => [
    Array.from({ length: 36 }, (_, i) => {
      const t = (i / 36) * 2 * Math.PI;
      return toCanvas(shape, rx * Math.cos(t), ry * Math.sin(t));
    }),
  ];

  switch (shape.type) {
    case "rectangle": {
      const w = shape.width ?? 0;
      const h = shape.height ?? 0;
      return { closed: true, lines: [[[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => toCanvas(shape, x, y))] };
    }
    case "ellipse":
      return { closed: true, lines: ellipse(shape.radiusX ?? 0, shape.radiusY ?? 0) };
    case "circle":
      return { closed: true, lines: ellipse(shape.radius ?? 0, shape.radius ?? 0) };
    case "polygon":
      return { closed: true, lines: [pairs(shape.points ?? []).map(([x, y]) => toCanvas(shape, x, y))] };
    case "freehand":
      return {
        closed: false,
        lines: (shape.lines ?? []).map((line) =>
          pairs(line.points ?? [], line.x ?? 0, line.y ?? 0).map(([x, y]) => toCanvas(shape, x, y))),
      };
    default: // arrow, line, and anything else drawn as points
      return { closed: false, lines: [pairs(shape.points ?? []).map(([x, y]) => toCanvas(shape, x, y))] };
  }
}

/** Bounding box (integers, canvas pixels) around all shapes, or null. */
export function shapesBoundingBox(shapes) {
  const points = shapes.flatMap((shape) => shapeOutline(shape).lines.flat());
  if (points.length === 0) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  return { x, y, width: Math.ceil(Math.max(...xs)) - x, height: Math.ceil(Math.max(...ys)) - y };
}

/** One Annonatate-style SVG holding a path per shape. */
export function shapesSvg(shapes, makeId = () => crypto.randomUUID()) {
  const paths = shapes.map((shape) => {
    const { closed, lines } = shapeOutline(shape);
    const d = lines
      .filter((line) => line.length > 0)
      .map((line) => `M${line.map(([x, y]) => `${round(x)},${round(y)}`).join("L")}${closed ? "z" : ""}`)
      .join("");
    const prefix = shape.type === "freehand" ? "rough" : shape.type;
    return `<path xmlns="http://www.w3.org/2000/svg" d="${d}" id="${prefix}_${makeId()}" ${PATH_ATTRIBUTES}/>`;
  });
  return `<svg xmlns='http://www.w3.org/2000/svg'>${paths.join("")}</svg>`;
}

const GEOMETRY = ["type", "x", "y", "width", "height", "radius", "radiusX", "radiusY", "scaleX", "scaleY", "rotation"];

function sameGeometry(a, b) {
  return GEOMETRY.every((key) => {
    const [va, vb] = [a[key] ?? (key.startsWith("scale") ? 1 : 0), b[key] ?? (key.startsWith("scale") ? 1 : 0)];
    return typeof va === "number" && typeof vb === "number" ? Math.abs(va - vb) < 0.5 : va === vb;
  });
}

/** Has the user moved, resized, redrawn or deleted the original target? */
export function targetChanged(original, maeAnnotation) {
  const before = toMaeAnnotation(original).maeData.target.drawingState.shapes;
  const after = drawingShapes(maeAnnotation);
  return before.length !== after.length || before.some((shape, i) => !sameGeometry(shape, after[i]));
}

/**
 * Quill writes every space as &nbsp;, which stops the text wrapping. Turn
 * them back into spaces, except where &nbsp; is an element's whole content:
 * `<p>&nbsp;</p>` is how the annotations mark a blank line.
 */
export function normalizeHtml(html) {
  return (html ?? "").replace(/&nbsp;|\u00a0/g, (match, offset, text) =>
    text[offset - 1] === ">" && text[offset + match.length] === "<" ? "&nbsp;" : " ");
}

/** The bare `<uuid>.json` filename for a MAE annotation. */
export function annotationFilename(maeAnnotation) {
  const last = String(maeAnnotation.id ?? "").split("/").pop().split("#")[0];
  // Existing annotations: the id is already the filename
  if (/^[^/]+\.json$/i.test(last)) return last;
  // New ones from MAE: `${canvasId}/annotation/${uuid}`
  if (/^[0-9a-f-]{36}$/i.test(last)) return `${last}.json`;
  return `${crypto.randomUUID()}.json`;
}

/**
 * Convert MAE's annotation into DDNP's IIIF 2 format, in the corpus's key
 * order. Editing keeps the original author, date and any other fields, and
 * keeps the original text and target exactly unless they were changed.
 *
 * `keepOriginalText`: whether the text is unedited. MAE's editor rewrites
 * stored HTML on opening, so callers decide this with `textUnchanged` (see
 * quillHtml.js); without it, only identical text counts as unedited.
 */
export function toDdnpAnnotation(
  maeAnnotation,
  { original, canvas, manifestId, user, keepOriginalText, now = new Date() },
) {
  let resource = [].concat(maeAnnotation.body ?? []).map((body) =>
    body.purpose === "tagging"
      ? { "@type": "oa:Tag", chars: body.value }
      : { "@type": "dctypes:Text", chars: normalizeHtml(body.value), format: "text/html" });

  if (original) {
    const identical = JSON.stringify([].concat(original.resource ?? []).map((r) => r.chars))
      === JSON.stringify([].concat(maeAnnotation.body ?? []).map((b) => b.value));
    if (keepOriginalText ?? identical) resource = original.resource;
  }

  let on;
  if (original && !targetChanged(original, maeAnnotation)) {
    on = original.on;
  } else {
    const shapes = drawingShapes(maeAnnotation);
    const box = shapesBoundingBox(shapes);
    if (!box) throw new Error("Draw a shape on the page to show what this note is about.");
    const originalTarget = Array.isArray(original?.on) ? original.on[0] : original?.on;
    on = [{
      "@type": "oa:SpecificResource",
      full: canvas,
      selector: {
        "@type": "oa:Choice",
        default: { "@type": "oa:FragmentSelector", value: `xywh=${box.x},${box.y},${box.width},${box.height}` },
        item: { "@type": "oa:SvgSelector", value: shapesSvg(shapes) },
      },
      within: originalTarget?.within ?? { "@id": manifestId, "@type": "sc:Manifest" },
    }];
  }

  const {
    "@context": _context, "@id": _id, "@type": _type, motivation: _motivation,
    "oa:annotatedAt": annotatedAt, "oa:annotatedBy": annotatedBy,
    on: _on, resource: _resource, "oa:serializedAt": _serializedAt, ...otherFields
  } = original ?? {};

  return {
    "@context": IIIF2_CONTEXT,
    "@id": original?.["@id"] ?? annotationFilename(maeAnnotation),
    "@type": "oa:Annotation",
    motivation: ["oa:commenting"],
    "oa:annotatedAt": annotatedAt ?? now.toISOString(),
    "oa:annotatedBy": annotatedBy ?? [user],
    on,
    resource,
    "oa:serializedAt": now.toISOString(),
    ...otherFields,
  };
}

/** The full `_annotations/<uuid>.json` file: front matter, then 4-space JSON. */
export function annotationFileText({ canvas, order, annotation }) {
  return `---\ncanvas: "${canvas}"\norder: ${order}\n---\n${JSON.stringify(annotation, null, 4)}`;
}

/* ------------------------------------------------------------------ */
/* Ordering: the `order` front matter sets each canvas's reading order */
/* ------------------------------------------------------------------ */

/**
 * Move one annotation up (-1) or down (+1) in a canvas's sequence of
 * `{ filename, order }` entries, already sorted. Returns the `order` values
 * to write as `[{ filename, from, to }]`; empty if it can't move.
 *
 * When every order is a distinct number, the two neighbours swap values so
 * only two files change. Otherwise (duplicates or missing values, as on a
 * few canvases today) the whole canvas is renumbered 1…n.
 */
export function reorderSequence(sequence, filename, direction) {
  const from = sequence.findIndex((entry) => entry.filename === filename);
  const to = from + direction;
  if (from < 0 || (direction !== -1 && direction !== 1) || to < 0 || to >= sequence.length) return [];

  const orders = sequence.map((entry) => entry.order);
  const distinct = orders.every(Number.isFinite) && new Set(orders).size === orders.length;
  if (distinct) {
    return [
      { filename: sequence[from].filename, from: orders[from], to: orders[to] },
      { filename: sequence[to].filename, from: orders[to], to: orders[from] },
    ];
  }

  const moved = sequence.slice();
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved
    .map((entry, index) => ({ filename: entry.filename, from: entry.order, to: index + 1 }))
    .filter((change) => change.from !== change.to);
}

/** Change the `order:` line in an annotation file's front matter only. */
export function setFileOrder(text, order) {
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)/);
  if (!match || !/^order:/m.test(match[2])) throw new Error("Annotation file has no order in its front matter");
  const frontMatter = match[2].replace(/^order:.*$/m, `order: ${order}`);
  return match[1] + frontMatter + match[3] + text.slice(match[0].length);
}
