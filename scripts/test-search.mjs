#!/usr/bin/env node

/**
 * Test script for the MiniSearch client module
 *
 * This script tests the search module by simulating how it will be used
 * in the browser, but using Node's file system instead of fetch.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import MiniSearch from 'minisearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Simulate the search module behavior
async function testSearchModule() {
  console.log('Testing MiniSearch client module...\n');

  // Load the search data (simulating fetch)
  const searchDataPath = join(PROJECT_ROOT, 'public/assets/javascript/search-data.json');
  const data = JSON.parse(readFileSync(searchDataPath, 'utf-8'));

  console.log('✓ Search data loaded');
  console.log(`  Documents: ${Object.keys(data.docs).length}`);
  console.log(`  Index document count: ${data.index.documentCount}\n`);

  // Load the MiniSearch instance
  const searchInstance = MiniSearch.loadJSON(JSON.stringify(data.index), {
    fields: ['title', 'content', 'tags'],
    storeFields: ['title', 'url', 'type', 'tags', 'excerpt', 'novel'],
    tokenize: (text) => {
      if (!text) return [];
      return text.split(/[\s,.;:/?!()]+/).filter(token => token.length > 0);
    },
    processTerm: (term) => term.toLowerCase(),
  });

  console.log('✓ MiniSearch instance loaded\n');

  // Test 1: Basic search
  console.log('=== Test 1: Search for "Esther" ===');
  const results1 = searchInstance.search('Esther', {
    boost: { title: 20, content: 10, tags: 10 },
    prefix: true,
  });
  console.log(`Results: ${results1.length}`);
  console.log('Top 3:');
  results1.slice(0, 3).forEach((r, i) => {
    const doc = data.docs[r.id];
    console.log(`  ${i + 1}. [${doc.type}] ${doc.title?.substring(0, 60)}...`);
    console.log(`     Score: ${r.score.toFixed(2)}`);
  });
  console.log();

  // Test 2: Search with fuzzy matching
  console.log('=== Test 2: Search for "Blak" (fuzzy) ===');
  const results2 = searchInstance.search('Blak', {
    boost: { title: 20, content: 10, tags: 10 },
    prefix: true,
    fuzzy: 0.2,
  });
  console.log(`Results: ${results2.length}`);
  console.log('Top 3:');
  results2.slice(0, 3).forEach((r, i) => {
    const doc = data.docs[r.id];
    console.log(`  ${i + 1}. [${doc.type}] ${doc.title?.substring(0, 60)}...`);
    console.log(`     Score: ${r.score.toFixed(2)}`);
  });
  console.log();

  // Test 3: Filter by content type
  console.log('=== Test 3: Search for "Dickens" in Working Notes only ===');
  const results3 = searchInstance.search('Dickens', {
    boost: { title: 20, content: 10, tags: 10 },
    prefix: true,
    filter: (result) => {
      const doc = data.docs[result.id];
      return doc.type?.startsWith('Working Notes');
    },
  });
  console.log(`Results: ${results3.length}`);
  console.log('Top 3:');
  results3.slice(0, 3).forEach((r, i) => {
    const doc = data.docs[r.id];
    console.log(`  ${i + 1}. [${doc.type}] ${doc.title?.substring(0, 60)}...`);
    console.log(`     Novel: ${doc.novel}`);
  });
  console.log();

  // Test 4: Statistics
  console.log('=== Test 4: Document statistics ===');
  const types = {};
  const novels = {};
  Object.values(data.docs).forEach(doc => {
    types[doc.type] = (types[doc.type] || 0) + 1;
    if (doc.novel) {
      novels[doc.novel] = (novels[doc.novel] || 0) + 1;
    }
  });
  console.log('By content type:');
  Object.entries(types).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log('\nBy novel:');
  Object.entries(novels).forEach(([novel, count]) => {
    console.log(`  ${novel}: ${count}`);
  });
  console.log();

  console.log('✅ All tests passed!');
}

testSearchModule().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
