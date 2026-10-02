import { describe, it, expect } from 'vitest';
import { readFileSync, realpathSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { patchMae } from '../scripts/mae-overlay-fix.mjs';

const require = createRequire(import.meta.url);
const maeDir = dirname(realpathSync(require.resolve('mirador-annotation-editor/package.json')));
const maeCode = readFileSync(join(maeDir, 'dist/mirador-annotation-editor.es.js'), 'utf8');

describe('MAE overlay fix', () => {
  it('still applies to the installed mirador-annotation-editor', () => {
    const patched = patchMae(maeCode);
    expect(patched).not.toBeNull();
    expect(patched).toContain('[, __ddnpRefresh] = vt(0)');
    expect(patched).toContain('__ddnpRefresh((k) => k + 1)');
  });

  it('refuses to patch code it does not recognise', () => {
    expect(patchMae('const unrelated = true;')).toBeNull();
  });
});
