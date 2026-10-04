/**
 * The annotation ordering plugin (src/components/annotationOrdering.jsx)
 * depends on how MAE and Mirador are built inside. These checks read the
 * installed packages' original source (from their source maps), so an
 * upgrade that changes any of it fails here instead of the Up/Down buttons
 * silently disappearing.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, realpathSync } from 'fs';
import { join } from 'path';

// Not require.resolve: mirador's package exports don't include package.json
const packageDir = (name) => realpathSync(join(process.cwd(), 'node_modules', name));

/** Original source files from every source map in a package's dist/. */
function sources(name) {
  const dist = join(packageDir(name), 'dist');
  const files = new Map();
  for (const file of readdirSync(dist).filter((f) => f.endsWith('.map'))) {
    const map = JSON.parse(readFileSync(join(dist, file), 'utf8'));
    map.sources.forEach((source, i) => {
      if (map.sourcesContent?.[i]) files.set(source.replace(/^.*?\/src\//, 'src/'), map.sourcesContent[i]);
    });
  }
  return files;
}

const source = (files, path) => {
  const text = files.get(path);
  if (!text) throw new Error(`${path} not found in the installed package's source maps`);
  return text;
};

describe('MAE internals the ordering plugin relies on', () => {
  const mae = sources('mirador-annotation-editor');

  it('exports canvasAnnotationsPlugin and includes it in its default plugin list', () => {
    const index = source(mae, 'src/index.js');
    expect(index).toMatch(/export \{[^}]*\bcanvasAnnotationsPlugin\b[^}]*\}/);
    expect(index).toMatch(/const annotationPlugins = \[[^\]]*\bcanvasAnnotationsPlugin\b[^\]]*\];\s*export default annotationPlugins;/);
  });

  it('wraps CanvasAnnotations and renders the TargetComponent it is given, with its own list item', () => {
    const plugin = source(mae, 'src/plugins/canvasAnnotationsPlugin.jsx');
    expect(plugin).toMatch(/target: 'CanvasAnnotations'/);
    expect(plugin).toMatch(/mode: 'wrap'/);
    expect(plugin).toMatch(/listContainerComponent: CanvasListItem/);
    expect(plugin).toMatch(/<TargetComponent \{\.\.\.props\} \/>/);
  });

  it('renders the list item children inside the <li>', () => {
    const item = source(mae, 'src/CanvasListItem.jsx');
    expect(item).toMatch(/<li \{\.\.\.props\}>\s*\{props\.children\}\s*<\/li>/);
  });
});

describe('Mirador internals the ordering plugin relies on', () => {
  const mirador = sources('mirador');

  it('renders each annotation with the listContainerComponent, passing its id', () => {
    const list = source(mirador, 'src/components/CanvasAnnotations.jsx');
    expect(list).toMatch(/component=\{listContainerComponent\}/);
    expect(list).toMatch(/annotationid=\{annotation\.id\}/);
    for (const prop of ['annotations', 'selectAnnotation', 'windowId']) {
      expect(list).toMatch(new RegExp(`^\\s+${prop}[,= ]`, 'm'));
    }
  });

  it('passes canvasId to CanvasAnnotations', () => {
    const panel = source(mirador, 'src/components/WindowSideBarAnnotationsPanel.jsx');
    expect(panel).toMatch(/<CanvasAnnotations[^>]*canvasId=\{canvasId\}/s);
  });
});
