#!/usr/bin/env node

/**
 * Build Search Index (MiniSearch)
 *
 * Replaces createindex.rb with a Node.js script that:
 * 1. Fetches annotations via Python script
 * 2. Indexes text files from textfiles/
 * 3. Indexes MDX pages from src/pages/
 * 4. Builds a MiniSearch index and exports to JSON
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';
import MiniSearch from 'minisearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration matching the old Lunr setup
const FIELD_BOOSTS = {
  title: 20,
  content: 10,
  tags: 10,
};

const SEARCH_FIELDS = ['title', 'content', 'tags'];
const STORE_FIELDS = ['title', 'url', 'type', 'tags', 'excerpt', 'novel'];

// Custom tokenizer: split on whitespace, punctuation, and quotation marks
function tokenize(text) {
  if (!text) return [];
  return text
    .split(/[\s,.;:/?!()\[\]{}"'\u2018\u2019\u201C\u201D\u2013\u2014]+/)
    .filter(token => token.length > 0);
}

/**
 * Fetch annotations from remote API via Python script
 */
function fetchAnnotations() {
  console.log('Fetching annotations from remote API...');
  const stdout = execSync('uv run python createindex-parseannotations.py', {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50 MB buffer for large annotation data
  });
  return JSON.parse(stdout);
}

/**
 * Extract novel name from content type string
 * e.g. "Working Notes: Bleak House" -> "Bleak House"
 */
function extractNovel(type) {
  if (!type) return null;
  const match = type.match(/(?:Working Notes|Annotations):\s*(.+)/);
  return match ? match[1] : null;
}

/**
 * Strip YAML frontmatter and markdown from MDX content
 */
function processMdxContent(content) {
  // Split on "---" to separate frontmatter
  const parts = content.split(/\n---\n/);

  if (parts.length < 2) {
    // No frontmatter found
    return { frontmatter: {}, body: content };
  }

  // Parse YAML frontmatter (simple key: value parser)
  const frontmatterText = parts[0].replace(/^---\n/, '');
  const frontmatter = {};
  frontmatterText.split('\n').forEach(line => {
    const match = line.match(/^([^:]+):\s*["']?(.+?)["']?$/);
    if (match) {
      frontmatter[match[1].trim()] = match[2].trim();
    }
  });

  // Join remaining parts as body
  const body = parts.slice(1).join('\n---\n');

  // Strip markdown (basic - remove common markdown syntax)
  let stripped = body
    // Remove TOC component
    .split('</TOC>').slice(-1)[0] || body
    // Remove HTML tags
    .replace(/<\/?[^>]*>/g, '')
    // Remove markdown links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove markdown bold/italic
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return { frontmatter, body: stripped };
}

/**
 * Index MDX pages from src/pages/
 */
function indexMdxPages() {
  console.log('Indexing MDX pages...');
  const docs = {};
  const mdxFiles = glob.sync('src/pages/**/*.mdx', { cwd: PROJECT_ROOT });

  mdxFiles.forEach(filepath => {
    const fullPath = join(PROJECT_ROOT, filepath);
    const content = readFileSync(fullPath, 'utf-8');
    const { frontmatter, body } = processMdxContent(content);

    // Generate slug and URL from file path
    let slug = filepath
      .replace('src/pages', '')
      .replace('.mdx', '')
      .replace(/\/index$/, '');

    if (!slug) slug = '/';

    const url = slug;

    docs[slug] = {
      id: slug,
      slug: slug,
      url: url,
      title: frontmatter.title || body.split('\n')[0].substring(0, 100),
      content: body,
      type: 'Site Content',
      novel: null,
      tags: '',
      excerpt: body.substring(0, 300),
    };
  });

  console.log(`  Indexed ${Object.keys(docs).length} MDX pages`);
  return docs;
}

/**
 * Index text files from textfiles/
 */
function indexTextFiles() {
  console.log('Indexing Working Notes text files...');
  const docs = {};
  const textFiles = glob.sync('textfiles/**/*.txt', { cwd: PROJECT_ROOT });

  textFiles.forEach(filepath => {
    const fullPath = join(PROJECT_ROOT, filepath);
    const content = readFileSync(fullPath, 'utf-8');
    const filename = filepath.split('/').pop().replace('.txt', '');

    let novel, contentType, url;

    // Determine novel and URL based on filename prefix
    if (filepath.includes('BH')) {
      novel = 'Bleak House';
      contentType = 'Working Notes: Bleak House';
      const canvasName = filename.replace(/_/g, '');
      url = `/notes/bleak-house/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/bleakhousetranscriptions/${canvasName}.json`;
    } else if (filepath.includes('HT')) {
      novel = 'Hard Times';
      contentType = 'Working Notes: Hard Times';
      const canvasName = filename.replace(/_/g, '');
      url = `/notes/hard-times/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/HardTimesTranscription/${canvasName}.json`;
    } else if (filepath.includes('LD')) {
      novel = 'Little Dorrit';
      contentType = 'Working Notes: Little Dorrit';
      const canvasName = filename.replace(/_/g, '');
      url = `/notes/little-dorrit/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/littledorrittranscription/${canvasName}.json`;
    } else {
      novel = 'David Copperfield';
      contentType = 'Working Notes: David Copperfield';
      const canvasName = filename.replace(/_/g, '');
      url = `/notes/david-copperfield/mirador?canvas=https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif/davidcopperfieldtranscription/${canvasName}.json`;
    }

    // Generate human-readable title
    const title = filename
      .replace('BH', 'Bleak House')
      .replace('HT', 'Hard Times')
      .replace('LD', 'Little Dorrit')
      .replace('DC', 'David Copperfield')
      .replace('WN', 'Working Notes')
      .replace(/_/g, ' ');

    // Clean content
    const cleanedContent = content
      .replace(/<\/?[^>]*>/g, '') // Remove HTML tags
      .replace(/\\n/g, ' ')        // Replace literal \n with spaces
      .trim();

    docs[filename] = {
      id: filename,
      slug: filename,
      url: url,
      title: title,
      content: cleanedContent,
      type: contentType,
      novel: novel,
      tags: '',
      excerpt: cleanedContent.substring(0, 300),
    };
  });

  console.log(`  Indexed ${Object.keys(docs).length} text files`);
  return docs;
}

/**
 * Process annotation documents and add novel field
 */
function processAnnotations(annotationDocs) {
  console.log('Processing annotations...');
  const processed = {};

  Object.entries(annotationDocs).forEach(([key, doc]) => {
    const novel = extractNovel(doc.type);

    // Clean content - preserve actual newlines initially
    let rawContent = (doc.content || '')
      .replace(/<\/?[^>]*>/g, '') // Remove HTML tags
      .replace(/\\n/g, '\n')       // Convert literal \n to actual newlines
      .trim();

    // Try to split on double newlines to separate title from body
    // Common patterns: \n\n, \r\n\r\n, or multiple newlines
    const parts = rawContent.split(/\n\s*\n+/);

    let title, bodyText, excerpt;

    if (parts.length > 1) {
      // First part is likely the title
      title = parts[0].trim();
      // Remaining parts are the body
      bodyText = parts.slice(1).join('\n\n').trim();
      // Use body for excerpt (not title)
      excerpt = bodyText.substring(0, 300);
    } else {
      // No clear separation - fall back to substring
      title = rawContent.substring(0, 100);
      bodyText = rawContent;
      excerpt = rawContent.substring(0, 300);
    }

    // Clean final content (normalize whitespace for search)
    const cleanedContent = rawContent.replace(/\s+/g, ' ').trim();

    processed[key] = {
      id: key,
      slug: key,
      url: doc.url || '',
      title: doc.title || title,
      content: cleanedContent,
      type: doc.type || 'Annotation',
      novel: novel,
      tags: doc.tags || '',
      excerpt: excerpt || '',
    };
  });

  console.log(`  Processed ${Object.keys(processed).length} annotations`);
  return processed;
}

/**
 * Build MiniSearch index
 */
function buildIndex(docs) {
  console.log('Building MiniSearch index...');

  const miniSearch = new MiniSearch({
    fields: SEARCH_FIELDS,
    storeFields: STORE_FIELDS,
    searchOptions: {
      boost: FIELD_BOOSTS,
      prefix: true,
    },
    tokenize: tokenize,
    // Disable stemming to match Lunr config
    processTerm: (term) => term.toLowerCase(),
  });

  // Add all documents to the index
  const docsArray = Object.values(docs);
  miniSearch.addAll(docsArray);

  console.log(`  Indexed ${docsArray.length} documents`);

  return miniSearch;
}

/**
 * Main execution
 */
function main() {
  console.log('Building search index...\n');

  try {
    // 1. Fetch annotations from Python script
    const annotationDocs = fetchAnnotations();
    const processedAnnotations = processAnnotations(annotationDocs);

    // 2. Index MDX pages
    const mdxDocs = indexMdxPages();

    // 3. Index text files
    const textDocs = indexTextFiles();

    // 4. Merge all documents
    const allDocs = {
      ...processedAnnotations,
      ...mdxDocs,
      ...textDocs,
    };

    console.log(`\nTotal documents: ${Object.keys(allDocs).length}`);

    // 5. Build MiniSearch index
    const miniSearch = buildIndex(allDocs);

    // 6. Export to JSON
    const outputPath = join(PROJECT_ROOT, 'public/assets/javascript/search-data.json');
    const exportData = {
      index: miniSearch.toJSON(),
      docs: allDocs,
    };

    writeFileSync(outputPath, JSON.stringify(exportData), 'utf-8');
    console.log(`\n✓ Search index written to ${outputPath}`);

    // Log file size for comparison
    const stats = statSync(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  File size: ${sizeMB} MB`);

  } catch (error) {
    console.error('Error building search index:', error);
    process.exit(1);
  }
}

main();
