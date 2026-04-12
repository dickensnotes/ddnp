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
    it('should return results for "Gradgrind"', () => {
      const results = search('Gradgrind');
      expect(results.length).toBe(31);
    });

    it('should return empty array for nonsense query', () => {
      const results = search('xyzabc123notfound');
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

    it('should support prefix matching for longer terms', () => {
      const exactResults = search('Esth', { prefix: false });
      const prefixResults = search('Esth', { prefix: true });

      // Prefix search should return more results
      expect(prefixResults.length).toBeGreaterThan(exactResults.length);
    });

    it('should support fuzzy matching for longer terms', () => {
      // "Peggoty" is 7 chars, 1 edit from "Peggotty" — within 1-edit max for 7-8 char words
      const results = search('Peggoty');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Fuzzy matching behavior', () => {
    it('"fog" should only match documents containing "fog"', () => {
      const results = search('fog');
      const docs = getAllDocs();
      results.forEach(r => {
        const doc = docs[r.id];
        const text = ((doc?.title || '') + ' ' + (doc?.content || '')).toLowerCase();
        expect(text).toContain('fog');
      });
    });

    it('"fog" should return far fewer results than the old 673', () => {
      const results = search('fog');
      expect(results.length).toBeLessThan(100);
    });

    it('"Jo" should return far fewer results than the old 124', () => {
      const results = search('Jo');
      expect(results.length).toBeLessThan(50);
    });

    it('"shadow" should return results (matches "shadows" via prefix)', () => {
      const results = search('shadow');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"Gradgrind" should return exactly 31 results', () => {
      const results = search('Gradgrind');
      expect(results.length).toBe(31);
    });

    it('"Boythorn" should return results', () => {
      const results = search('Boythorn');
      expect(results.length).toBeGreaterThan(0);
    });

    it('"Merdle" results should mostly contain "merdle"', () => {
      const results = search('Merdle');
      expect(results.length).toBeGreaterThan(0);
      const docs = getAllDocs();
      const merdleResults = results.filter(r => {
        const doc = docs[r.id];
        const text = ((doc?.title || '') + ' ' + (doc?.content || '')).toLowerCase();
        return text.includes('merdle');
      });
      expect(merdleResults.length).toBeGreaterThan(results.length * 0.5);
    });

    it('"pave" results should all contain "pave"', () => {
      const results = search('pave');
      const docs = getAllDocs();
      results.forEach(r => {
        const doc = docs[r.id];
        const text = ((doc?.title || '') + ' ' + (doc?.content || '')).toLowerCase();
        expect(text).toMatch(/pave/);
      });
    });
  });

  describe('Phrase search', () => {
    it('quoted phrase should only return exact phrase matches', () => {
      const results = search('"pave the way"');
      expect(results.length).toBeLessThan(20);
      const docs = getAllDocs();
      results.forEach(r => {
        const doc = docs[r.id];
        const text = ((doc?.title || '') + ' ' + (doc?.content || '')).toLowerCase();
        expect(text).toContain('pave the way');
      });
    });

    it('unquoted multi-word query should use AND logic (fewer results)', () => {
      const results = search('pave the way');
      expect(results.length).toBeLessThan(100);
    });

    it('empty quotes should not break search', () => {
      const results = search('""');
      expect(Array.isArray(results)).toBe(true);
    });

    it('unclosed quote should be treated as regular search', () => {
      const results = search('"shadow');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Prefix matching behavior', () => {
    it('short terms (<=3 chars) should NOT prefix match broadly', () => {
      const results = search('Jo');
      expect(results.length).toBeLessThan(50);
    });

    it('longer terms (>=4 chars) should prefix match', () => {
      const results = search('Esth');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
