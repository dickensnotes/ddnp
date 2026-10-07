import { describe, it, expect } from 'vitest';
import { readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { PATCHES, patchMae, unmatchedPatches } from '../scripts/mae-patches.mjs';

const maeDir = realpathSync(join(process.cwd(), 'node_modules', 'mirador-annotation-editor'));
const maeCode = readFileSync(join(maeDir, 'dist/mirador-annotation-editor.es.js'), 'utf8');

describe('MAE patches', () => {
  it('all still apply to the installed mirador-annotation-editor', () => {
    expect(unmatchedPatches(maeCode)).toEqual([]);
    expect(patchMae(maeCode)).not.toBeNull();
  });

  it('re-renders the shape layer on every viewer movement', () => {
    const patched = patchMae(maeCode);
    expect(patched).toContain('[, __ddnpRefresh] = vt(0)');
    expect(patched).toContain('__ddnpRefresh((k) => k + 1)');
  });

  it('ignores keys typed into text fields before treating Delete/Backspace as "delete shape"', () => {
    const patched = patchMae(maeCode);
    const guard = 'if (L.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(L.target?.tagName ?? "")) return;';
    const at = patched.indexOf(guard);
    expect(at).toBeGreaterThan(-1);
    // the guard comes right before the handler's Delete/Backspace branch
    expect(patched.indexOf('L.key === "Delete" || L.key === "Backspace"', at) - at).toBeLessThan(250);
  });

  it('names the patch that no longer matches, and patches nothing then', () => {
    const changed = maeCode.replace('if (L.stopPropagation(), !!e.currentShape) {', 'if (somethingElse) {');
    expect(unmatchedPatches(changed)).toEqual([PATCHES[1].name]);
    expect(patchMae(changed)).toBeNull();
  });
});
