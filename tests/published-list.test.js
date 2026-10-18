import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchPublishedList } from '../src/lib/GitHubAnnotationAdapter.js';

const CANVAS = 'https://dickensnotes.github.io/dickens-annotations/canvas/prototype/proto-ds-wn-01.json';

const respondWith = (status, body = {}) => vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})));

afterEach(() => vi.unstubAllGlobals());

describe('fetchPublishedList', () => {
  it('reads the canvas list from GitHub Pages', async () => {
    respondWith(200, { resources: [{ '@id': 'a.json' }] });
    expect(await fetchPublishedList(CANVAS)).toEqual({ resources: [{ '@id': 'a.json' }] });
    expect(fetch).toHaveBeenCalledWith(
      'https://dickensnotes.github.io/dickens-annotations/annotations/proto-ds-wn-01-list.json',
      expect.anything(),
    );
  });

  it('treats a canvas with no published list as having no annotations', async () => {
    respondWith(404);
    expect(await fetchPublishedList(CANVAS)).toEqual({ resources: [] });
  });

  it('still fails on other errors', async () => {
    respondWith(500);
    await expect(fetchPublishedList(CANVAS)).rejects.toThrow('500');
  });
});
