import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { reorderSequence, setFileOrder, parseAnnotationFile, annotationFileText } from '../src/lib/ddnpAnnotations.js';

const CANVAS = 'https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/DCWN07.json';
const FILE = readFileSync(new URL('./fixtures/ddnp-annotation-file.txt', import.meta.url), 'utf8');
const seq = (...orders) => orders.map((order, i) => ({ filename: `${'abc'[i] ?? i}.json`, order }));

describe('reorderSequence', () => {
  it('swaps two distinct neighbours, changing only their files', () => {
    expect(reorderSequence(seq(1, 2, 3), 'b.json', -1)).toEqual([
      { filename: 'b.json', from: 2, to: 1 },
      { filename: 'a.json', from: 1, to: 2 },
    ]);
    expect(reorderSequence(seq(1, 5, 9), 'b.json', 1)).toEqual([
      { filename: 'b.json', from: 5, to: 9 },
      { filename: 'c.json', from: 9, to: 5 },
    ]);
  });

  it('does nothing at the ends, for unknown ids, or for other directions', () => {
    expect(reorderSequence(seq(1, 2, 3), 'a.json', -1)).toEqual([]);
    expect(reorderSequence(seq(1, 2, 3), 'c.json', 1)).toEqual([]);
    expect(reorderSequence(seq(1, 2, 3), 'zzz.json', 1)).toEqual([]);
    expect(reorderSequence(seq(1, 2, 3), 'b.json', 2)).toEqual([]);
  });

  it('renumbers the canvas 1…n when orders are duplicated', () => {
    // e.g. LDWN11, where each order appears twice: a=1, b=1, c=2
    // moving c up gives a, c, b → orders 1, 2, 3; only b changes
    expect(reorderSequence(seq(1, 1, 2), 'c.json', -1)).toEqual([
      { filename: 'b.json', from: 1, to: 3 },
    ]);
  });

  it('renumbers when an order is missing', () => {
    expect(reorderSequence(seq(1, undefined, 3), 'b.json', -1)).toEqual([
      { filename: 'b.json', from: undefined, to: 1 },
      { filename: 'a.json', from: 1, to: 2 },
    ]);
  });
});

describe('setFileOrder', () => {
  it('changes only the order line in the front matter', () => {
    const updated = setFileOrder(FILE, 4);
    expect(updated).toBe(FILE.replace('order: 13', 'order: 4'));
    expect(parseAnnotationFile(updated).order).toBe(4);
  });

  it('leaves "order:" text in the body alone', () => {
    const text = annotationFileText({ canvas: CANVAS, order: 2, annotation: { '@id': 'x.json', note: 'order: 99' } });
    expect(setFileOrder(text, 7)).toBe(text.replace('order: 2', 'order: 7'));
  });

  it('refuses a file without an order', () => {
    expect(() => setFileOrder('---\ncanvas: "x"\n---\n{}', 1)).toThrow(/no order/);
  });
});

describe('commitToSandbox', () => {
  const API = 'https://api.github.com/repos/dickensnotes/dickens-annotations';
  let calls;

  beforeEach(() => {
    vi.resetModules();
    calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      calls.push({ url, method: options.method ?? 'GET', body: options.body && JSON.parse(options.body) });
      const ok = (body) => ({ ok: true, status: 200, json: async () => body });
      if (url.endsWith('/git/ref/heads/mae-poc')) return ok({ object: { sha: 'head1' } });
      if (url.endsWith('/git/commits/head1')) return ok({ tree: { sha: 'tree0' } });
      if (url.endsWith('/git/trees')) return ok({ sha: 'tree1' });
      if (url.endsWith('/git/commits')) return ok({ sha: 'commit1' });
      if (url.endsWith('/git/refs/heads/mae-poc')) return ok({});
      return { ok: false, status: 404, json: async () => ({}) };
    }));
  });

  it('makes one commit on mae-poc, based on the current head, without forcing', async () => {
    const { commitToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    const sha = await commitToSandbox(async (head) => [
      { path: '_annotations/a.json', content: `A at ${head}` },
      { path: '_annotations/b.json', content: 'B' },
    ], 'reorder', { Authorization: 'Bearer t' });

    expect(sha).toBe('commit1');
    expect(calls.map((c) => `${c.method} ${c.url.replace(API, '')}`)).toEqual([
      'GET /git/ref/heads/mae-poc',
      'GET /git/commits/head1',
      'POST /git/trees',
      'POST /git/commits',
      'PATCH /git/refs/heads/mae-poc',
    ]);
    expect(calls[2].body).toEqual({
      base_tree: 'tree0',
      tree: [
        { path: '_annotations/a.json', mode: '100644', type: 'blob', content: 'A at head1' },
        { path: '_annotations/b.json', mode: '100644', type: 'blob', content: 'B' },
      ],
    });
    expect(calls[3].body).toEqual({ message: 'reorder', tree: 'tree1', parents: ['head1'] });
    expect(calls[4].body).toEqual({ sha: 'commit1', force: false });
  });

  it('refuses files outside _annotations/ before writing anything', async () => {
    const { commitToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await expect(commitToSandbox(async () => [{ path: '.github/workflows/main.yml', content: 'x' }], 'm'))
      .rejects.toThrow(/outside _annotations/);
    expect(calls.some((c) => c.method !== 'GET')).toBe(false);
  });

  it('reports a moved branch as a 422 instead of overwriting', async () => {
    const real = fetch.getMockImplementation();
    fetch.mockImplementation(async (url, options = {}) => (options.method === 'PATCH'
      ? { ok: false, status: 422, json: async () => ({}) }
      : real(url, options)));
    const { commitToSandbox } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await expect(commitToSandbox(async () => [{ path: '_annotations/a.json', content: 'x' }], 'm'))
      .rejects.toMatchObject({ status: 422 });
  });
});

describe('GitHubAnnotationAdapter.move', () => {
  const API = 'https://api.github.com/repos/dickensnotes/dickens-annotations';
  const base = parseAnnotationFile(FILE).annotation;
  const anno = (id) => ({ ...base, '@id': id });
  const fileFor = (id, order) => annotationFileText({ canvas: CANVAS, order, annotation: anno(id) });
  const ORDERS = { 'a.json': 1, 'b.json': 2, 'c.json': 3 };
  let tree;

  beforeEach(() => {
    vi.resetModules();
    tree = null;
    vi.doMock('../src/lib/quillHtml.js', () => ({ textUnchanged: async () => false }));
    vi.stubGlobal('window', { alert: vi.fn() });
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
      const method = options.method ?? 'GET';
      if (url.endsWith('/annotations/dcwn07-list.json')) return ok({ resources: ['a.json', 'b.json', 'c.json'].map(anno) });
      if (url === 'https://dickensnotes.github.io/dickens-annotations/') {
        // As published: filename is a full URL, order a number
        return ok({ annotations: Object.entries(ORDERS).map(([filename, order]) => ({ filename: `https://dickensnotes.github.io/dickens-annotations/annotations/${filename}`, order, json: anno(filename) })) });
      }
      if (url.includes('/compare/main...mae-poc')) return ok({ files: [] });
      if (url.endsWith('/git/ref/heads/mae-poc')) return ok({ object: { sha: 'head1' } });
      if (url.endsWith('/git/commits/head1')) return ok({ tree: { sha: 'tree0' } });
      const raw = url.match(/contents\/_annotations\/(\w\.json)\?ref=head1$/);
      if (raw) return ok(fileFor(raw[1], ORDERS[raw[1]]));
      if (url.endsWith('/git/trees') && method === 'POST') { tree = JSON.parse(options.body).tree; return ok({ sha: 'tree1' }); }
      if (url.endsWith('/git/commits') && method === 'POST') return ok({ sha: 'commit1' });
      if (url.endsWith('/git/refs/heads/mae-poc') && method === 'PATCH') return ok({});
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    }));
  });

  const adapter = async (token = 't0ken') => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    return new Adapter(CANVAS, { token, user: 'Anna Gibson' });
  };

  it('moves an annotation up by swapping two order values in one commit', async () => {
    const page = await (await adapter()).move('c.json', -1);

    expect(tree.map((t) => [t.path, parseAnnotationFile(t.content).order])).toEqual([
      ['_annotations/c.json', 2],
      ['_annotations/b.json', 3],
    ]);
    expect(tree[0].content).toBe(fileFor('c.json', 3).replace('order: 3', 'order: 2'));
    expect(page.items.map((i) => i.id)).toEqual(['a.json', 'c.json', 'b.json']);
    expect(window.alert.mock.calls).toEqual([]);
  });

  it('keeps the new order on the next page load', async () => {
    const first = await adapter();
    await first.move('a.json', 1);
    // Same module (cached branch changes), new adapter instance
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    const page = await new Adapter(CANVAS, {}).all();
    expect(page.items.map((i) => i.id)).toEqual(['b.json', 'a.json', 'c.json']);
  });

  it('does nothing at the top of the list', async () => {
    const page = await (await adapter()).move('a.json', -1);
    expect(tree).toBeNull();
    expect(page.items.map((i) => i.id)).toEqual(['a.json', 'b.json', 'c.json']);
  });

  it('does not write without a token', async () => {
    await (await adapter(null)).move('c.json', -1);
    expect(tree).toBeNull();
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Sign in/));
  });
});

describe('reading order when the published index is unavailable', () => {
  const base = parseAnnotationFile(FILE).annotation;
  const anno = (id) => ({ ...base, '@id': id });

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../src/lib/quillHtml.js', () => ({ textUnchanged: async () => false }));
    vi.stubGlobal('window', { alert: vi.fn() });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
      if (url.endsWith('/annotations/dcwn07-list.json')) return ok({ resources: ['a.json', 'b.json'].map(anno) });
      if (url.includes('/compare/main...mae-poc')) return ok({ files: [{ filename: '_annotations/n.json', status: 'added' }] });
      if (url.includes('/contents/_annotations/n.json')) return ok(annotationFileText({ canvas: CANVAS, order: 1, annotation: anno('n.json') }));
      return { ok: false, status: 503, json: async () => ({}), text: async () => '' };
    }));
  });

  it('still lists the annotations, in published order with additions last', async () => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    const page = await new Adapter(CANVAS, {}).all();
    expect(page.items.map((i) => i.id)).toEqual(['a.json', 'b.json', 'n.json']);
  });

  it('refuses to move rather than guess', async () => {
    const { default: Adapter } = await import('../src/lib/GitHubAnnotationAdapter.js');
    await new Adapter(CANVAS, { token: 't' }).move('b.json', -1);
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/reading order/));
    expect(fetch.mock.calls.some(([, o]) => o?.method && o.method !== 'GET')).toBe(false);
  });
});
