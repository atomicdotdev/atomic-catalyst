import { describe, test, expect } from 'bun:test';
import { Window } from 'happy-dom';
import { readChangeImpact } from '../src/atomic/changeImpact.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';
const bytes = new Uint8Array(32).fill(4), hash = Buffer.from(bytes).toString('hex');
const fixture = () => ({ changeHash: { value: bytes }, mode: 'structural', context: 'Recorded sources + current repository KG; not a historical view snapshot.', warnings: [],
  files: [{ path: 'src/api.ts', hop: 1 }, { path: '.vault/a.md', hop: 1 }, { path: '.vault/b.md', hop: 1 },
    { path: 'package.json', hop: 1 }, { path: 'tests/api.ts', hop: 2 }, { path: 'src/ui.ts', hop: 2 }],
  edges: [{ fromPath: 'tests/api.ts', toPath: 'src/api.ts', relation: 'calls' }, { fromPath: 'src/ui.ts', toPath: 'src/api.ts', relation: 'includes' }] });
const change = (impact = fixture()) => ({ kind: 'change', id: hash, message: 'Selected change', authors: [], dependencies: [], signature: 'not verified', provenance: [], provenanceNotice: 'Recorded attribution.',
  affectedPaths: fixture().files.filter((file) => file.hop === 1).map((file) => file.path), blastRadius: readChangeImpact(impact, hash) });

describe('Native blast-radius projection and single-change matrix', () => {
  test('validates selected identity, directed structural evidence and bounded unique files', () => {
    const source = fixture();
    expect(readChangeImpact(source, hash).files).toEqual(source.files);
    expect(readChangeImpact(undefined, hash)).toBeUndefined();
    for (const invalid of [{ ...source, changeHash: { value: new Uint8Array(32) } }, { ...source, files: [...source.files, source.files[0]] },
      { ...source, edges: [] }, { ...source, files: [{ path: 'src/api.ts', hop: 3 }] },
      { ...source, mode: 'private' },
      { ...source, edges: [{ fromPath: 'tests/api.ts', toPath: 'src/api.ts', relation: 'CO_CHANGED' }] }]) {
      expect(readChangeImpact(invalid, hash).mode).toBe('unavailable');
    }
  });
  test('groups distinct selected-change files by module and hop with real cell drill-down', () => {
    const window = new Window(), root = window.document.createElement('div');
    window.document.body.append(root);
    const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'feature', workingCopyView: 'main', draft: { changes: [{ affectedPaths: ['unrelated/file.ts'] }], intents: [], warnings: [] } } });
    ui.receive({ type: 'selection', selection: change() });
    expect(root.querySelector('.blast-header').textContent).toContain('BLAST RADIUS');
    expect(root.querySelector('.blast-header').textContent).toContain('structural (KG)');
    expect(root.querySelector('.blast-radius').textContent).not.toContain('unrelated/file.ts');
    const cells = [...root.querySelectorAll('.blast-cell')];
    expect(cells.find((node) => node.getAttribute('aria-label') === '.vault, hop 1: 2 files')).toBeDefined();
    const callers = cells.find((node) => node.getAttribute('aria-label') === 'tests, hop 2: 1 files'); callers.click();
    expect(root.querySelector('.blast-drill').hidden).toBe(false);
    expect(root.querySelector('.blast-drill').textContent).toContain('tests/api.ts');
    expect(root.querySelector('.blast-drill').textContent).toContain('calls src/api.ts');
    expect(callers.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.blast-radius').textContent).not.toMatch(/\d+%/);
    ui.receive({ type: 'invalidated' }); callers.click();
    expect(root.querySelector('.blast-radius')).toBeNull();
    window.happyDOM.abort();
  });
  test('missing analysis is not private or zero; untrusted labels remain text', () => {
    const window = new Window(), root = window.document.createElement('div'); const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'test', workingCopyView: 'test' } });
    const privateImpact = fixture(); privateImpact.mode = 'private'; privateImpact.files = privateImpact.files.filter((file) => file.hop === 1); privateImpact.edges = [];
    ui.receive({ type: 'selection', selection: change(privateImpact) });
    expect(root.querySelector('.blast-mode').textContent).toBe('structural · private change');
    expect(root.querySelector('.blast-cell.hop-2')).toBeNull();
    const missing = change(); delete missing.blastRadius;
    missing.affectedPaths = ['<img src=x onerror=bad()>'];
    ui.receive({ type: 'selection', selection: missing });
    expect(root.querySelector('.blast-mode').textContent).toContain('structural analysis unavailable');
    expect(root.querySelector('.blast-radius').textContent).not.toContain('private change');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.blast-cell').textContent).toBe('1');
    ui.dispose(); window.happyDOM.abort();
  });
});
