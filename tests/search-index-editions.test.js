/**
 * The search indexer must not fail the build on annotations for an edition
 * the site doesn't publish yet.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';

const RUN_INDEXER = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('indexer', 'createindex-parseannotations.py')
indexer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(indexer)
print(json.dumps(indexer.index_documents(json.load(sys.stdin))))
`;

function indexDocuments(annotations) {
  const result = spawnSync(
    'uv',
    ['run', '--with-requirements', 'requirements.txt', 'python', '-c', RUN_INDEXER],
    { input: JSON.stringify(annotations), encoding: 'utf-8' },
  );
  expect(result.status, result.stderr).toBe(0);
  return { docs: JSON.parse(result.stdout), stderr: result.stderr };
}

const IIIF = 'https://dickensnotes.github.io/dickens-annotations/canvas/img/derivatives/iiif';

function annotationOn(folder, id) {
  return {
    filename: `https://dickensnotes.github.io/dickens-annotations/annotations/${id}`,
    json: {
      '@id': id,
      on: [{ full: `${IIIF}/${folder}/PAGE01.json` }],
      resource: [{ '@type': 'dctypes:Text', chars: '<p>A note</p>' }],
    },
  };
}

describe('Search indexer editions', () => {
  it('indexes annotations on a published edition', () => {
    const { docs } = indexDocuments([annotationOn('HardTimesTranscription', 'a.json')]);
    expect(docs['a.json'].type).toBe('Annotations: Hard Times');
    expect(docs['a.json'].content).toBe('A note');
    expect(docs['a.json'].url).toBe(
      `/notes/hard-times/mirador?canvas=${IIIF}/HardTimesTranscription/PAGE01.json&annotationid=a.json`,
    );
  });

  it('skips annotations on other editions, and says so in the build log', () => {
    const { docs, stderr } = indexDocuments([
      annotationOn('HardTimesTranscription', 'a.json'),
      annotationOn('edwindroodtranscriptions', 'b.json'),
      annotationOn('edwindroodtranscriptions', 'c.json'),
    ]);
    expect(Object.keys(docs)).toEqual(['a.json']);
    expect(stderr).toContain('skipped 2 annotation(s) on edwindroodtranscriptions');
  });

  it('leaves annotation lists out', () => {
    const list = annotationOn('HardTimesTranscription', 'htwn01-list.json');
    expect(indexDocuments([list]).docs).toEqual({});
  });
});
