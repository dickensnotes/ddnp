/**
 * MiniSearch Client Module
 *
 * Loads the pre-built MiniSearch index and provides search functionality.
 * The index is built at build time by scripts/build-search-index.mjs
 */

import MiniSearch from 'minisearch';

// Module state
let searchInstance = null;
let docs = null;

/**
 * Initialize the search instance by loading the pre-built index
 * @returns {Promise<void>}
 */
export async function initSearch() {
  if (searchInstance) {
    console.log('Search already initialized');
    return;
  }

  console.log('Loading search index...');
  const response = await fetch('/assets/javascript/search-data.json');
  const data = await response.json();

  // Store documents for retrieval
  docs = data.docs;

  // Load the serialized MiniSearch index
  searchInstance = MiniSearch.loadJSON(JSON.stringify(data.index), {
    fields: ['title', 'content', 'tags'],
    storeFields: ['title', 'url', 'type', 'tags', 'excerpt', 'novel'],
    tokenize: (text) => {
      if (!text) return [];
      return text.split(/[\s,.;:/?!()]+/).filter(token => token.length > 0);
    },
    processTerm: (term) => term.toLowerCase(),
  });

  console.log(`Search index loaded: ${Object.keys(docs).length} documents`);
}

/**
 * Search the index
 * @param {string} query - Search query string
 * @param {Object} options - Search options (passed to MiniSearch)
 * @returns {Array} Search results with id, score, match, and stored fields
 */
export function search(query, options = {}) {
  if (!searchInstance) {
    throw new Error('Search not initialized. Call initSearch() first.');
  }

  // Default search options matching the build configuration
  const defaultOptions = {
    boost: { title: 20, content: 10, tags: 10 },
    prefix: true,
    fuzzy: 0.2,
  };

  return searchInstance.search(query, {
    ...defaultOptions,
    ...options,
  });
}

/**
 * Get a document by ID
 * @param {string} id - Document ID
 * @returns {Object|undefined} Document object or undefined if not found
 */
export function getDoc(id) {
  return docs?.[id];
}

/**
 * Get all documents (useful for faceting/filtering)
 * @returns {Object} All documents keyed by ID
 */
export function getAllDocs() {
  return docs || {};
}

/**
 * Check if search is initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return searchInstance !== null;
}

/**
 * Get search statistics
 * @returns {Object} Stats about the search index
 */
export function getStats() {
  if (!searchInstance) {
    return { initialized: false };
  }

  const docCount = Object.keys(docs).length;
  const types = {};
  const novels = {};

  Object.values(docs).forEach(doc => {
    types[doc.type] = (types[doc.type] || 0) + 1;
    if (doc.novel) {
      novels[doc.novel] = (novels[doc.novel] || 0) + 1;
    }
  });

  return {
    initialized: true,
    documentCount: docCount,
    byType: types,
    byNovel: novels,
  };
}
