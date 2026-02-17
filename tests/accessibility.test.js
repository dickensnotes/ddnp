/**
 * Accessibility tests for Phase 1A: Skip navigation and main landmarks
 *
 * Tests run against the built dist/ output to verify what users actually receive.
 * Requires a current build: `pnpm run build` before running.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parse } from 'node-html-parser';

// Pages that intentionally don't have the standard layout (known exceptions)
const EXCLUDED_PAGES = [
  '404.html', // Custom error page, not part of the standard layout system
];

function getAllHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      getAllHtmlFiles(fullPath, files);
    } else if (entry.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function relativePath(fullPath, distDir) {
  return fullPath.replace(distDir + '/', '');
}

const DIST_DIR = join(process.cwd(), 'dist');
let htmlFiles = [];

beforeAll(() => {
  htmlFiles = getAllHtmlFiles(DIST_DIR).filter(
    (f) => !EXCLUDED_PAGES.some((excluded) => f.endsWith(excluded))
  );
  expect(htmlFiles.length).toBeGreaterThan(0);
});

describe('Skip navigation link', () => {
  it('every page has a skip link pointing to #main-content', () => {
    const missing = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const skipLink = doc.querySelector('a[href="#main-content"]');
      if (!skipLink) missing.push(relativePath(file, DIST_DIR));
    }
    expect(missing, `Pages missing skip link:\n${missing.join('\n')}`).toHaveLength(0);
  });

  it('skip link text is "Skip to main content"', () => {
    const wrong = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const skipLink = doc.querySelector('a[href="#main-content"]');
      if (skipLink && skipLink.text.trim() !== 'Skip to main content') {
        wrong.push(`${relativePath(file, DIST_DIR)}: "${skipLink.text.trim()}"`);
      }
    }
    expect(wrong, `Pages with incorrect skip link text:\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('skip link appears before the first <nav> element in document order', () => {
    const outOfOrder = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const skipLinkPos = html.indexOf('href="#main-content"');
      const navPos = html.indexOf('<nav');
      if (skipLinkPos === -1 || navPos === -1) continue;
      if (skipLinkPos > navPos) {
        outOfOrder.push(relativePath(file, DIST_DIR));
      }
    }
    expect(outOfOrder, `Pages where skip link comes after <nav>:\n${outOfOrder.join('\n')}`).toHaveLength(0);
  });
});

describe('Main landmark', () => {
  it('every page has a <main> element', () => {
    const missing = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const main = doc.querySelector('main');
      if (!main) missing.push(relativePath(file, DIST_DIR));
    }
    expect(missing, `Pages missing <main> element:\n${missing.join('\n')}`).toHaveLength(0);
  });

  it('every page has exactly one <main> element', () => {
    const multiple = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const mains = doc.querySelectorAll('main');
      if (mains.length !== 1) {
        multiple.push(`${relativePath(file, DIST_DIR)}: ${mains.length} <main> elements`);
      }
    }
    expect(multiple, `Pages with wrong number of <main> elements:\n${multiple.join('\n')}`).toHaveLength(0);
  });

  it('every <main> element has id="main-content"', () => {
    const wrong = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const main = doc.querySelector('main');
      if (main && main.getAttribute('id') !== 'main-content') {
        wrong.push(`${relativePath(file, DIST_DIR)}: id="${main.getAttribute('id')}"`);
      }
    }
    expect(wrong, `Pages where <main> lacks id="main-content":\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('skip link target matches the main element id', () => {
    const mismatched = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const skipLink = doc.querySelector('a[href="#main-content"]');
      const main = doc.querySelector('main');
      if (skipLink && main && main.getAttribute('id') !== 'main-content') {
        mismatched.push(relativePath(file, DIST_DIR));
      }
    }
    expect(mismatched, `Pages where skip link target doesn't match <main> id:\n${mismatched.join('\n')}`).toHaveLength(0);
  });
});

describe('Language attribute', () => {
  it('every page has a lang attribute on the <html> element', () => {
    const missing = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const htmlEl = doc.querySelector('html');
      if (!htmlEl || !htmlEl.getAttribute('lang')) {
        missing.push(relativePath(file, DIST_DIR));
      }
    }
    expect(missing, `Pages missing lang attribute on <html>:\n${missing.join('\n')}`).toHaveLength(0);
  });
});

describe('Image alt text', () => {
  it('logo image inside the nav link is decorative (alt="")', () => {
    // Logo is inside a link (#navlogo) that has sr-only text, so the image is decorative
    const wrong = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const logoLink = doc.querySelector('#navlogo');
      if (!logoLink) continue;
      const logoImg = logoLink.querySelector('img');
      if (!logoImg) continue;
      const alt = logoImg.getAttribute('alt');
      if (alt !== '') {
        wrong.push(`${relativePath(file, DIST_DIR)}: alt="${alt}"`);
      }
    }
    expect(wrong, `Pages where logo image has non-empty alt:\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('homepage card images are decorative (alt="") since their links contain text', () => {
    // Card images are inside <a> elements that already have <h2> title and <p> description,
    // so the images are decorative and should use alt=""
    const indexFile = join(DIST_DIR, 'index.html');
    expect(indexFile, 'Homepage index.html not found in dist/').toBeDefined();
    const html = readFileSync(indexFile, 'utf-8');
    const doc = parse(html);
    const cardImages = doc.querySelectorAll('#main-content section a img');
    expect(cardImages.length, 'Expected at least one card image on homepage').toBeGreaterThan(0);
    const wrong = [];
    for (const img of cardImages) {
      const alt = img.getAttribute('alt');
      if (alt !== '') wrong.push(`alt="${alt}"`);
    }
    expect(wrong, `Card images with non-empty alt:\n${wrong.join('\n')}`).toHaveLength(0);
  });
});

describe('Mobile menu ARIA', () => {
  it('mobile menu button has aria-expanded="false" in initial HTML', () => {
    // JavaScript toggles this dynamically; the static HTML must set the initial state
    const wrong = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const menuBtn = doc.querySelector('#menubtn');
      if (!menuBtn) continue;
      const expanded = menuBtn.getAttribute('aria-expanded');
      if (expanded !== 'false') {
        wrong.push(`${relativePath(file, DIST_DIR)}: aria-expanded="${expanded}"`);
      }
    }
    expect(wrong, `Pages where #menubtn aria-expanded is not "false":\n${wrong.join('\n')}`).toHaveLength(0);
  });

  it('mobile menu button has aria-controls linking to the menu element', () => {
    const wrong = [];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf-8');
      const doc = parse(html);
      const menuBtn = doc.querySelector('#menubtn');
      if (!menuBtn) continue;
      const controls = menuBtn.getAttribute('aria-controls');
      if (controls !== 'menu') {
        wrong.push(`${relativePath(file, DIST_DIR)}: aria-controls="${controls}"`);
      }
    }
    expect(wrong, `Pages where #menubtn aria-controls is not "menu":\n${wrong.join('\n')}`).toHaveLength(0);
  });
});

describe('Page coverage', () => {
  it('at least 20 pages are included in the test run', () => {
    // Guards against the dist/ directory being empty or stale
    expect(htmlFiles.length).toBeGreaterThanOrEqual(20);
  });

  it('each layout type is represented in the build', () => {
    const paths = htmlFiles.map((f) => relativePath(f, DIST_DIR));

    // index.astro (homepage)
    expect(paths).toContain('index.html');

    // page.astro layout (general content pages)
    expect(paths.some((p) => p.startsWith('about/'))).toBe(true);

    // notes.astro layout (Working Notes pages)
    expect(paths.some((p) => p.startsWith('notes/') && !p.includes('mirador'))).toBe(true);

    // mirador-full-screen-layout.astro
    expect(paths.some((p) => p.includes('mirador'))).toBe(true);
  });
});
