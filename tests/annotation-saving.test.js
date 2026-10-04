import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import {
  parseAnnotationFile,
  toMaeAnnotation,
  toDdnpAnnotation,
  annotationFileText,
  shapesBoundingBox,
  shapesSvg,
  targetChanged,
  normalizeHtml,
} from '../src/lib/ddnpAnnotations.js';

const CANVAS = 'https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/DCWN07.json';
const MANIFEST = 'https://dickensnotes.github.io/dickens-annotations/img/derivatives/iiif/davidcopperfieldtranscription/manifest.json';
const FILE = readFileSync(new URL('./fixtures/ddnp-annotation-file.txt', import.meta.url), 'utf8');
const NOW = new Date('2026-10-01T12:00:00.000Z');

const original = () => parseAnnotationFile(FILE).annotation;

// What MAE produced for a new note in the spike (see the MAE spike notes)
const newMaeAnnotation = () => ({
  id: `${CANVAS}/annotation/89299d80-d745-4205-a37e-8d7aec35acc3`,
  body: [{ type: 'TextualBody', purpose: 'describing', value: '<p><strong>MAE&nbsp;spike</strong>&nbsp;-&nbsp;a&nbsp;note.</p>' }],
  motivation: 'commenting',
  target: { source: CANVAS, selector: [{ type: 'SvgSelector', value: "<svg stroke='rgb(255,0,0'/>" }, { type: 'FragmentSelector', value: `${CANVAS}#` }] },
  maeData: {
    templateType: 'multiple_body',
    target: {
      drawingState: JSON.stringify({ shapes: [{ type: 'rectangle', x: 1605.18, y: 388.87, width: 368.78, height: 128.41, scaleX: 1, scaleY: 1 }] }),
    },
  },
});

describe('toDdnpAnnotation: editing an existing annotation', () => {
  it('reproduces the file exactly when nothing changed (apart from serializedAt)', () => {
    const before = original();
    const after = toDdnpAnnotation(toMaeAnnotation(before), { original: before, canvas: CANVAS, now: NOW });
    expect(after).toEqual({ ...before, 'oa:serializedAt': NOW.toISOString() });
    expect(Object.keys(after)).toEqual(Object.keys(before));

    const text = annotationFileText({ canvas: CANVAS, order: 13, annotation: after });
    expect(text).toBe(FILE.replace(/"oa:serializedAt": "[^"]+"/, `"oa:serializedAt": "${NOW.toISOString()}"`));
  });

  it('saves new text without touching the target, and fixes &nbsp;', () => {
    const before = original();
    const mae = toMaeAnnotation(before);
    mae.body[0].value = '<p>New&nbsp;commentary&nbsp;here.</p>';
    const after = toDdnpAnnotation(mae, { original: before, canvas: CANVAS, now: NOW });
    expect(after.resource).toEqual([{ '@type': 'dctypes:Text', chars: '<p>New commentary here.</p>', format: 'text/html' }]);
    expect(after.on).toEqual(before.on);
    expect(after['oa:annotatedBy']).toEqual(['Adam Grener']);
    expect(after['oa:annotatedAt']).toBe(before['oa:annotatedAt']);
  });

  it('keeps the stored HTML exactly when the editor only re-serialised it', () => {
    const before = original();
    const mae = toMaeAnnotation(before);
    mae.body[0].value = '<p>Quill&nbsp;markup&nbsp;of&nbsp;the&nbsp;same&nbsp;text</p>';
    const after = toDdnpAnnotation(mae, { original: before, canvas: CANVAS, keepOriginalText: true, now: NOW });
    expect(after.resource).toBe(before.resource);
  });

  it('builds a new target when the shape is moved, keeping id, author and manifest', () => {
    const before = original();
    const mae = toMaeAnnotation(before);
    const [shape] = mae.maeData.target.drawingState.shapes;
    mae.maeData.target.drawingState = JSON.stringify({ shapes: [{ ...shape, x: shape.x + 100 }] });
    expect(targetChanged(before, mae)).toBe(true);

    const after = toDdnpAnnotation(mae, { original: before, canvas: CANVAS, now: NOW });
    expect(after['@id']).toBe(before['@id']);
    expect(after.on[0].selector.default.value).toBe('xywh=1756,1704,261,98');
    expect(after.on[0].selector.item.value).toMatch(/^<svg xmlns='http:\/\/www\.w3\.org\/2000\/svg'><path .*d="M1756,1704L2017,1704L2017,1802L1756,1802z" id="rectangle_/);
    expect(after.on[0].within).toEqual(before.on[0].within);
    expect(after['oa:annotatedBy']).toEqual(['Adam Grener']);
  });
});

describe('toDdnpAnnotation: a new annotation', () => {
  const after = toDdnpAnnotation(newMaeAnnotation(), { canvas: CANVAS, manifestId: MANIFEST, user: 'Anna Gibson', now: NOW });

  it('uses the corpus format and key order', () => {
    expect(Object.keys(after)).toEqual(['@context', '@id', '@type', 'motivation', 'oa:annotatedAt', 'oa:annotatedBy', 'on', 'resource', 'oa:serializedAt']);
    expect(after).toMatchObject({
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@id': '89299d80-d745-4205-a37e-8d7aec35acc3.json',
      '@type': 'oa:Annotation',
      motivation: ['oa:commenting'],
      'oa:annotatedAt': NOW.toISOString(),
      'oa:annotatedBy': ['Anna Gibson'],
    });
  });

  it('targets the canvas with xywh first and a clean SVG second', () => {
    expect(after.on).toHaveLength(1);
    expect(after.on[0]).toMatchObject({
      '@type': 'oa:SpecificResource',
      full: CANVAS,
      within: { '@id': MANIFEST, '@type': 'sc:Manifest' },
    });
    expect(after.on[0].selector['@type']).toBe('oa:Choice');
    expect(after.on[0].selector.default).toEqual({ '@type': 'oa:FragmentSelector', value: 'xywh=1605,388,369,130' });
    expect(after.on[0].selector.item['@type']).toBe('oa:SvgSelector');
    expect(after.on[0].selector.item.value).not.toContain('rgb(255,0,0');
  });

  it('stores the text as HTML without &nbsp;', () => {
    expect(after.resource).toEqual([{ '@type': 'dctypes:Text', chars: '<p><strong>MAE spike</strong> - a note.</p>', format: 'text/html' }]);
  });

  it('refuses to save a new note without a shape', () => {
    const mae = newMaeAnnotation();
    mae.maeData.target.drawingState = JSON.stringify({ shapes: [] });
    expect(() => toDdnpAnnotation(mae, { canvas: CANVAS, manifestId: MANIFEST, user: 'x' })).toThrow(/no shape recorded/);
  });
});

describe('normalizeHtml', () => {
  it('turns the editor\'s &nbsp; between words into spaces', () => {
    expect(normalizeHtml('<p><strong>MAE&nbsp;spike</strong>&nbsp;-&nbsp;a&nbsp;note.</p>'))
      .toBe('<p><strong>MAE spike</strong> - a note.</p>');
  });

  it('keeps blank-line paragraphs', () => {
    expect(normalizeHtml('<p>one</p><p>&nbsp;</p><p>two&nbsp;three</p>'))
      .toBe('<p>one</p><p>&nbsp;</p><p>two three</p>');
  });
});

describe('shape geometry', () => {
  it('accounts for scale and rotation', () => {
    expect(shapesBoundingBox([{ type: 'rectangle', x: 10, y: 10, width: 50, height: 20, scaleX: 2, scaleY: 1 }]))
      .toEqual({ x: 10, y: 10, width: 100, height: 20 });
    expect(shapesBoundingBox([{ type: 'rectangle', x: 100, y: 100, width: 50, height: 20, rotation: 90 }]))
      .toEqual({ x: 80, y: 100, width: 20, height: 50 });
  });

  it('traces freehand lines as open "rough" paths', () => {
    const freehand = { type: 'freehand', x: 0, y: 0, lines: [{ points: [10, 10, 20, 15, 30, 40], x: 0, y: 0 }] };
    expect(shapesBoundingBox([freehand])).toEqual({ x: 10, y: 10, width: 20, height: 30 });
    const svg = shapesSvg([freehand], () => 'id1');
    expect(svg).toContain('d="M10,10L20,15L30,40"');
    expect(svg).toContain('id="rough_id1"');
  });

  it('combines several shapes into one box and one SVG', () => {
    const shapes = [
      { type: 'rectangle', x: 0, y: 0, width: 10, height: 10 },
      { type: 'circle', x: 100, y: 100, radius: 10 },
    ];
    expect(shapesBoundingBox(shapes)).toEqual({ x: 0, y: 0, width: 110, height: 110 });
    expect(shapesSvg(shapes).match(/<path /g)).toHaveLength(2);
  });
});

describe('GitHubAnnotationAdapter writes', () => {
  const API = 'https://api.github.com/repos/dickensnotes/dickens-annotations';
  const PUBLISHED = original();
  const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
  let writes;

  beforeEach(() => {
    vi.resetModules();
    writes = [];
    // Quill needs a browser; the real comparison is checked in the browser
    vi.doMock('../src/lib/quillHtml.js', () => ({ textUnchanged: async () => false }));
    vi.stubGlobal('window', { alert: vi.fn() });
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
      if (options.method === 'PUT' || options.method === 'DELETE') {
        writes.push({ url, method: options.method, body: JSON.parse(options.body), headers: options.headers });
        return ok({});
      }
      if (url === 'https://dickensnotes.github.io/dickens-annotations/') {
        return ok({ annotations: [{ filename: `https://dickensnotes.github.io/dickens-annotations/annotations/${PUBLISHED['@id']}`, order: 13, json: PUBLISHED }] });
      }
      if (url.endsWith('/annotations/dcwn07-list.json')) return ok({ resources: [PUBLISHED] });
      if (url.includes('/compare/main...mae-poc')) return ok({ files: [] });
      if (url.startsWith(`${API}/contents/_annotations/${PUBLISHED['@id']}?ref=mae-poc`)) {
        return ok({ sha: 'abc123', content: b64(FILE) });
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }));
  });

  const adapter = async (options = { token: 't0ken', user: 'Anna Gibson', manifestId: MANIFEST }) => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    return new Adapter(CANVAS, options);
  };

  it('creates a file on mae-poc, ordered after the canvas\'s last annotation', async () => {
    const page = await (await adapter()).create(newMaeAnnotation());

    expect(writes).toHaveLength(1);
    const [write] = writes;
    expect(write.method).toBe('PUT');
    expect(write.url).toBe(`${API}/contents/_annotations/89299d80-d745-4205-a37e-8d7aec35acc3.json`);
    expect(write.body.branch).toBe('mae-poc');
    expect(write.body.sha).toBeUndefined();
    expect(write.body.message).toBe('Add DCWN07: "MAE spike - a note."\n\nFile: _annotations/89299d80-d745-4205-a37e-8d7aec35acc3.json\n\nSaved with the DDNP annotation editor.');
    expect(write.headers.Authorization).toBe('Bearer t0ken');

    const saved = parseAnnotationFile(Buffer.from(write.body.content, 'base64').toString('utf8'));
    expect(saved.canvas).toBe(CANVAS);
    expect(saved.order).toBe(14);
    expect(saved.annotation['oa:annotatedBy']).toEqual(['Anna Gibson']);

    expect(page.items.map((i) => i.id)).toEqual([PUBLISHED['@id'], '89299d80-d745-4205-a37e-8d7aec35acc3.json']);
  });

  it('updates with the current sha and keeps the front matter', async () => {
    const mae = toMaeAnnotation(original());
    mae.body[0].value = '<p>Edited</p>';
    const page = await (await adapter()).update(mae);

    const [write] = writes;
    expect(write.body).toMatchObject({ branch: 'mae-poc', sha: 'abc123' });
    const saved = parseAnnotationFile(Buffer.from(write.body.content, 'base64').toString('utf8'));
    expect(saved).toMatchObject({ canvas: CANVAS, order: 13 });
    expect(saved.annotation.resource[0].chars).toBe('<p>Edited</p>');
    expect(saved.annotation.on).toEqual(PUBLISHED.on);
    expect(page.items[0].body[0].value).toBe('<p>Edited</p>');
  });

  it('deletes with the current sha', async () => {
    const page = await (await adapter()).delete(PUBLISHED['@id']);
    expect(writes).toEqual([expect.objectContaining({ method: 'DELETE' })]);
    expect(writes[0].body).toMatchObject({ branch: 'mae-poc', sha: 'abc123' });
    expect(page.items).toEqual([]);
  });

  it('does not write without a token, and says so', async () => {
    await (await adapter({ user: 'x' })).create(newMaeAnnotation());
    expect(writes).toEqual([]);
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Sign in/));
  });

  it('reports a conflict instead of overwriting', async () => {
    const real = fetch.getMockImplementation();
    fetch.mockImplementation(async (url, options = {}) =>
      options.method === 'PUT' ? { ok: false, status: 409, json: async () => ({}) } : real(url, options));
    await (await adapter()).update(toMaeAnnotation(original()));
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Someone else saved/));
  });
});

describe('commit messages', () => {
  it('labels an annotation by its citation ID and heading', async () => {
    const { annotationLabel } = await import('../src/lib/ddnpAnnotations.js');
    const anno = (chars) => ({ resource: [{ '@type': 'dctypes:Text', chars }] });
    expect(annotationLabel(anno('<p><em>DC.I.R7</em></p><p><strong>Black whiskers and black dog.</strong></p><p>This note…</p>')))
      .toBe('DC.I.R7 Black whiskers and black dog.');
    expect(annotationLabel(anno('<p dir="ltr"><em>LD.XIX-XX.L12</em></p> <p dir="ltr"><strong>Arthur&rsquo;s&nbsp;refusal</strong></p>')))
      .toBe('LD.XIX-XX.L12 Arthur’s refusal');
    expect(annotationLabel(anno('<p>TEST ANNOTATION: BARGE</p>'))).toBe('TEST ANNOTATION: BARGE');
    expect(annotationLabel(anno('<p>' + 'word '.repeat(30) + '</p>'))).toMatch(/^word( word)+…$/);
    expect(annotationLabel(anno('<p>' + 'word '.repeat(30) + '</p>')).length).toBeLessThanOrEqual(50);
    expect(annotationLabel(anno(''))).toBe('(no text)');
  });

  it('says what changed, where, and which file', async () => {
    const { commitMessage } = await import('../src/lib/ddnpAnnotations.js');
    const annotation = { resource: [{ '@type': 'dctypes:Text', chars: '<p><em>DC.VII.R8</em></p><p>Littimer.</p>' }] };
    const canvas = 'https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/DCWN07.json';
    expect(commitMessage('edit', { canvas, annotation, filename: 'abc.json' })).toBe(
      'Edit DCWN07: "DC.VII.R8 Littimer."\n\nFile: _annotations/abc.json\n\nSaved with the DDNP annotation editor.',
    );
    expect(commitMessage('down', { canvas, annotation, changes: [{ filename: 'abc.json', from: 2, to: 3 }, { filename: 'def.json', from: 3, to: 2 }] })).toBe(
      'Move down DCWN07: "DC.VII.R8 Littimer."\n\nReading order:\n  _annotations/abc.json: 2 → 3\n  _annotations/def.json: 3 → 2\n\nSaved with the DDNP annotation editor.',
    );
    expect(() => commitMessage('rename', { canvas, annotation })).toThrow(/Unknown/);
  });
});
