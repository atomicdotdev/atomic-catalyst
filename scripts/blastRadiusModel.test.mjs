import { describe, test, expect } from 'bun:test';
import { moduleOf, groupByModule, dependentCounts, reasonsFor, dependentNote, describeEdited, summarize, dependentsHeading, filterFiles, symbolFor }
  from '../webview/src/blastRadiusModel.ts';

const files = [{ path: 'src/api.ts', hop: 1 }, { path: './package.json', hop: 1 }, { path: 'README.md', hop: 1 },
  { path: 'tests/api.ts', hop: 2 }, { path: 'src/ui.ts', hop: 2 }, { path: 'cli/main.ts', hop: 2 }];
const edges = [{ fromPath: 'tests/api.ts', toPath: 'src/api.ts', relation: 'CALLS' }, { fromPath: 'src/ui.ts', toPath: 'src/api.ts', relation: 'INCLUDES' },
  { fromPath: 'cli/main.ts', toPath: 'src/api.ts', relation: 'CALLS' }];

describe('blast radius model', () => {
  test('top-level files share one (root) module instead of becoming their own rows', () => {
    expect(moduleOf('./package.json')).toBe('(root)');
    expect(moduleOf('README.md')).toBe('(root)');
    expect(moduleOf('src/api.ts')).toBe('src');
    expect(groupByModule(files).map(([module, group]) => `${module}:${group.length}`)).toEqual(['(root):2', 'src:2', 'cli:1', 'tests:1']);
  });
  test('dependents are counted per edited file and explained per dependent', () => {
    expect(dependentCounts(edges).get('src/api.ts')).toBe(3);
    expect(reasonsFor('src/ui.ts', edges)).toEqual(['includes src/api.ts']);
    expect(describeEdited('src/api.ts', edges)).toBe('edited directly · 3 dependents');
    expect(describeEdited('README.md', edges)).toBe('edited directly');
    expect(dependentNote('src/api.ts', edges)).toBe('3 dependents');
    expect(dependentNote('README.md', edges)).toBe('');
    expect(describeEdited('x', [{ fromPath: 'a', toPath: 'x', relation: 'CALLS' }])).toBe('edited directly · 1 dependent');
  });
  test('summary and heading never present unknown or partial analysis as zero', () => {
    expect(summarize(files, 'structural')).toBe('3 files edited · 3 dependents in 3 modules');
    expect(summarize(files.filter((file) => file.hop === 1), 'private')).toBe('3 files edited · no dependents found');
    expect(summarize(files.filter((file) => file.hop === 1), 'partial')).toBe('3 files edited · no dependents found');
    expect(summarize([{ path: 'a.md', hop: 1 }], 'unavailable')).toBe('1 file edited · dependents unknown');
    expect(dependentsHeading(3, 'structural')).toBe('Callers & importers · 3');
    expect(dependentsHeading(0, 'private')).toBe('Callers & importers · none found');
    expect(dependentsHeading(0, 'partial')).toBe('Callers & importers · none found');
    expect(dependentsHeading(0, 'unavailable')).toBe('Callers & importers · unknown');
  });
  test('filtering by module and hop is pure', () => {
    const copy = structuredClone(files);
    expect(filterFiles(files, { module: 'src', hop: 2 }).map((file) => file.path)).toEqual(['src/ui.ts']);
    expect(filterFiles(files, { module: '(root)', hop: 1 }).map((file) => file.path)).toEqual(['./package.json', 'README.md']);
    expect(filterFiles(files, undefined)).toBe(files);
    expect(files).toEqual(copy);
  });
  test('file symbols come from the recorded graph summary when present', () => {
    const change = { metadata: { graphSummary: { files: [{ symbol: '+', path: 'src/api.ts', info: '' }] } } };
    expect(symbolFor(change, 'src/api.ts')).toBe('+');
    expect(symbolFor(change, 'missing.ts')).toBe('');
    expect(symbolFor({}, 'src/api.ts')).toBe('');
  });
});
