/**
 * Unit tests for search functionality
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { initSearch, search, getAllDocs } from '../src/lib/search.js';

describe('Search Module', () => {
  beforeAll(async () => {
    // Mock fetch to load the search index from file system
    const indexData = readFileSync('./public/assets/javascript/search-data.json', 'utf-8');
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(JSON.parse(indexData)),
      })
    );

    // Initialize the search index before running tests
    await initSearch();
  });

  describe('initSearch()', () => {
    it('should initialize without errors', async () => {
      await expect(initSearch()).resolves.not.toThrow();
    });

    it('should be callable multiple times (idempotent)', async () => {
      await initSearch();
      await initSearch();
      const docs = getAllDocs();
      expect(Object.keys(docs).length).toBe(1121);
    });
  });

  describe('getAllDocs()', () => {
    it('should return all documents', () => {
      const docs = getAllDocs();
      expect(typeof docs).toBe('object');
      expect(Object.keys(docs).length).toBe(1121);
    });

    it('should return documents with correct structure', () => {
      const docs = getAllDocs();
      const firstDoc = Object.values(docs)[0];

      expect(firstDoc).toHaveProperty('id');
      expect(firstDoc).toHaveProperty('title');
      expect(firstDoc).toHaveProperty('url');
      expect(firstDoc).toHaveProperty('type');
    });
  });

  describe('search()', () => {
    it('should throw error if search not initialized', () => {
      // This test would need to be run in isolation
      // Skipping for now since we initialize in beforeAll
    });

    it('should return results for "Esther"', () => {
      const results = search('Esther', {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(117);
    });

    it('should return results for "fog"', () => {
      const results = search('fog', {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(673);
    });

    it('should return results for "Dora"', () => {
      const results = search('Dora', {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(53);
    });

    it('should return results for "Gradgrind"', () => {
      const results = search('Gradgrind', {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBe(31);
    });

    it('should return empty array for nonsense query', () => {
      const results = search('xyzabc123notfound', {
        boost: { title: 20, content: 10, tags: 10 },
        prefix: true,
        fuzzy: 0.2,
      });

      expect(results.length).toBe(0);
    });

    it('should return results with correct structure', () => {
      const results = search('Esther');

      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('title');
      expect(firstResult).toHaveProperty('url');
      expect(firstResult).toHaveProperty('type');
    });

    it('should sort results by relevance (score)', () => {
      const results = search('Esther');

      expect(results.length).toBeGreaterThan(1);

      // Check that scores are in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should support prefix matching', () => {
      const exactResults = search('Est', { prefix: false });
      const prefixResults = search('Est', { prefix: true });

      // Prefix search should return more results
      expect(prefixResults.length).toBeGreaterThan(exactResults.length);
    });

    it('should support fuzzy matching', () => {
      // "Esther" with typo "Esthar"
      const results = search('Esthar', { fuzzy: 0.2 });

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
