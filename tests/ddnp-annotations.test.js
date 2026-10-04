import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import {
  listUrlForCanvas,
  parseAnnotationFile,
  boundingBox,
  toMaeAnnotation,
} from '../src/lib/ddnpAnnotations.js';

const CANVAS = 'https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/DCWN07.json';
const FILE = readFileSync(new URL('./fixtures/ddnp-annotation-file.txt', import.meta.url), 'utf8');

describe('listUrlForCanvas', () => {
  it('maps a canvas to its published, lowercased list', () => {
    expect(listUrlForCanvas(CANVAS)).toBe(
      'https://dickensnotes.github.io/dickens-annotations/annotations/dcwn07-list.json',
    );
    expect(listUrlForCanvas('https://example.org/x/HardTimesTranscription/HTWNMems.json')).toBe(
      'https://dickensnotes.github.io/dickens-annotations/annotations/htwnmems-list.json',
    );
  });
});

describe('parseAnnotationFile', () => {
  it('reads the front matter and the annotation', () => {
    const { canvas, order, annotation } = parseAnnotationFile(FILE);
    expect(canvas).toBe(CANVAS);
    expect(order).toBe(13);
    expect(annotation['@id']).toBe('003d833f-e2ac-49d9-99fa-0260754333dc.json');
  });

  it('rejects a file without front matter', () => {
    expect(() => parseAnnotationFile('{"@id": "x.json"}')).toThrow(/front matter/);
  });
});

describe('toMaeAnnotation', () => {
  const { annotation } = parseAnnotationFile(FILE);
  const mae = toMaeAnnotation(annotation);

  it('keeps the bare-filename id used by annotationid deep links', () => {
    expect(mae.id).toBe('003d833f-e2ac-49d9-99fa-0260754333dc.json');
  });

  it('turns the commentary into a describing TextualBody', () => {
    expect(mae.body).toHaveLength(1);
    expect(mae.body[0]).toMatchObject({ type: 'TextualBody', purpose: 'describing' });
    expect(mae.body[0].value).toBe(annotation.resource[0].chars);
    expect(mae.maeData.textBody).toBe(mae.body[0]);
  });

  it('targets the canvas with both the SVG and the xywh fragment', () => {
    expect(mae.target.source).toBe(CANVAS);
    expect(mae.target.selector).toEqual([
      { type: 'SvgSelector', value: annotation.on[0].selector.item.value },
      { type: 'FragmentSelector', value: 'xywh=1656,1704,261,98' },
    ]);
  });

  it('gives MAE an editable rectangle matching the bounding box', () => {
    expect(boundingBox(annotation)).toEqual({ x: 1656, y: 1704, width: 261, height: 98 });
    expect(mae.maeData.templateType).toBe('multiple_body');
    expect(mae.maeData.target.drawingState.shapes).toEqual([
      expect.objectContaining({ type: 'rectangle', x: 1656, y: 1704, width: 261, height: 98 }),
    ]);
  });

  it('carries the original author and date', () => {
    expect(mae.creator).toBe('Adam Grener');
    expect(mae.creationDate).toBe(annotation['oa:annotatedAt']);
  });
});

describe('GitHubAnnotationAdapter.all', () => {
  const OTHER_CANVAS = CANVAS.replace('DCWN07', 'DCWN08');
  const anno = (id) => ({ ...parseAnnotationFile(FILE).annotation, '@id': id });
  const file = (canvas, order, annotation) =>
    `---\ncanvas: "${canvas}"\norder: ${order}\n---\n${JSON.stringify(annotation)}`;

  // Published list: a, b, c. Branch: edits b, removes c, adds d (this canvas)
  // and e (another canvas).
  const responses = {
    'annotations/dcwn07-list.json': { resources: [anno('a.json'), anno('b.json'), anno('c.json')] },
    'compare/main...mae-poc': {
      files: [
        { filename: '_annotations/b.json', status: 'modified', sha: 'blob-b' },
        { filename: '_annotations/c.json', status: 'removed', sha: 'blob-c' },
        { filename: '_annotations/d.json', status: 'added', sha: 'blob-d' },
        { filename: '_annotations/e.json', status: 'added', sha: 'blob-e' },
        { filename: 'README.md', status: 'modified', sha: 'blob-readme' },
      ],
    },
    'git/blobs/blob-b': file(CANVAS, 2, { ...anno('b.json'), resource: [{ '@type': 'dctypes:Text', chars: 'edited' }] }),
    'git/blobs/blob-d': file(CANVAS, 9, anno('d.json')),
    'git/blobs/blob-e': file(OTHER_CANVAS, 1, anno('e.json')),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const key = Object.keys(responses).find((k) => url.includes(k));
      if (!key) return { ok: false, status: 404 };
      const body = responses[key];
      return {
        ok: true,
        json: async () => body,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
      };
    }));
  });

  it('overlays the branch changes on the published list', async () => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    const page = await new Adapter(CANVAS).all();

    expect(page.type).toBe('AnnotationPage');
    expect(page.items.map((i) => i.id)).toEqual(['a.json', 'b.json', 'd.json']);
    expect(page.items[1].body[0].value).toBe('edited');
  });

  it('never fetches files outside _annotations/', async () => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await new Adapter(CANVAS).all();
    expect(fetch.mock.calls.some(([url]) => url.includes('README') || url.includes('blob-readme'))).toBe(false);
  });
});

describe('sandbox write guard', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  });

  it('only allows the mae-poc branch', async () => {
    const { assertSandboxBranch, SANDBOX_BRANCH } = await import('../src/lib/GitHubAnnotationAdapter.js');
    expect(SANDBOX_BRANCH).toBe('mae-poc');
    expect(assertSandboxBranch('mae-poc')).toBe('mae-poc');
    for (const branch of ['main', 'gh-pages', '', undefined, 'mae-poc ', 'MAE-POC']) {
      expect(() => assertSandboxBranch(branch)).toThrow(/Refusing to write/);
    }
  });

  it('never sends a write aimed at main', async () => {
    const { writeToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await expect(writeToSandbox('PUT', '_annotations/x.json', { branch: 'main', content: '' })).rejects.toThrow(/Refusing to write to "main"/);
    await expect(writeToSandbox('DELETE', '_annotations/x.json', { sha: 'abc' })).rejects.toThrow(/Refusing to write/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses paths outside _annotations/ and non-write methods', async () => {
    const { writeToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await expect(writeToSandbox('PUT', 'img/derivatives/iiif/x/manifest.json', { branch: 'mae-poc' })).rejects.toThrow(/outside _annotations/);
    await expect(writeToSandbox('PUT', '.github/workflows/main.yml', { branch: 'mae-poc' })).rejects.toThrow(/outside _annotations/);
    await expect(writeToSandbox('POST', '_annotations/x.json', { branch: 'mae-poc' })).rejects.toThrow(/method/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends allowed writes to the mae-poc branch', async () => {
    const { writeToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await writeToSandbox('PUT', '_annotations/x.json', { branch: 'mae-poc', content: 'e30=', message: 'test' });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/dickensnotes/dickens-annotations/contents/_annotations/x.json');
    expect(JSON.parse(options.body).branch).toBe('mae-poc');
  });
});
