/**
 * Integration tests for the search index build pipeline
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';

const INDEX_PATH = './public/assets/javascript/search-data.json';

describe('Search Index Build', () => {
  let indexData;

  beforeAll(() => {
    // Load the built search index
    expect(existsSync(INDEX_PATH)).toBe(true);
    const rawData = readFileSync(INDEX_PATH, 'utf-8');
    indexData = JSON.parse(rawData);
  });

  it('should have docs and index properties', () => {
    expect(indexData).toHaveProperty('docs');
    expect(indexData).toHaveProperty('index');
    expect(typeof indexData.docs).toBe('object');
    expect(typeof indexData.index).toBe('object');
  });

  it('should contain exactly 1121 documents', () => {
    const docCount = Object.keys(indexData.docs).length;
    expect(docCount).toBe(1121);
  });

  it('should contain 1041 annotations', () => {
    const annotations = Object.values(indexData.docs).filter(doc =>
      doc.type.startsWith('Annotations:')
    );
    expect(annotations.length).toBe(1041);
  });

  it('should contain 65 working notes', () => {
    const workingNotes = Object.values(indexData.docs).filter(doc =>
      doc.type.startsWith('Working Notes:')
    );
    expect(workingNotes.length).toBe(65);
  });

  it('should contain 15 site content pages', () => {
    const siteContent = Object.values(indexData.docs).filter(doc =>
      doc.type === 'Site Content'
    );
    expect(siteContent.length).toBe(15);
  });

  it('should have all required fields on each document', () => {
    const requiredFields = ['id', 'title', 'url', 'type', 'content'];
    const docs = Object.values(indexData.docs);

    docs.forEach(doc => {
      requiredFields.forEach(field => {
        expect(doc).toHaveProperty(field);
      });
    });
  });

  it('should have valid URLs for annotations', () => {
    const annotations = Object.values(indexData.docs).filter(doc =>
      doc.type.startsWith('Annotations:')
    );

    annotations.forEach(doc => {
      expect(doc.url).toMatch(/^\/notes\/.+\/mirador\?canvas=.+&annotationid=.+$/);
    });
  });

  it('should have valid URLs for working notes', () => {
    const workingNotes = Object.values(indexData.docs).filter(doc =>
      doc.type.startsWith('Working Notes:')
    );

    workingNotes.forEach(doc => {
      expect(doc.url).toMatch(/^\/notes\/.+\/mirador\?canvas=.+$/);
      expect(doc.url).not.toContain('annotationid');
    });
  });

  it('should have valid URLs for site content', () => {
    const siteContent = Object.values(indexData.docs).filter(doc =>
      doc.type === 'Site Content'
    );

    siteContent.forEach(doc => {
      expect(doc.url).toMatch(/^\//);
      expect(doc.url).not.toContain('mirador');
    });
  });

  it('should have correct breakdown by novel', () => {
    const expectedCounts = {
      'Annotations: Bleak House': 193,
      'Annotations: David Copperfield': 202,
      'Annotations: Hard Times': 105,
      'Annotations: Little Dorrit': 541,
      'Working Notes: Bleak House': 19,
      'Working Notes: David Copperfield': 19,
      'Working Notes: Hard Times': 6,
      'Working Notes: Little Dorrit': 21,
      'Site Content': 15,
    };

    const actualCounts = {};
    Object.values(indexData.docs).forEach(doc => {
      actualCounts[doc.type] = (actualCounts[doc.type] || 0) + 1;
    });

    Object.entries(expectedCounts).forEach(([type, expectedCount]) => {
      expect(actualCounts[type]).toBe(expectedCount);
    });
  });
});
