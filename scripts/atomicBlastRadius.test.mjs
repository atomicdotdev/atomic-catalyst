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

describe('Blast-radius file list is visible by default and the matrix filters it', () => {
  const mount = (selection) => {
    const window = new Window(), root = window.document.createElement('div'); window.document.body.append(root);
    const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'feature', workingCopyView: 'main' } });
    ui.receive({ type: 'selection', selection });
    return { window, root, ui };
  };
  test('every file and its structural reason is readable without pressing a cell', () => {
    const { window, root } = mount(change());
    const drill = root.querySelector('.blast-drill');
    expect(drill.hidden).toBe(false);
    expect(root.querySelector('.blast-summary').textContent).toBe('4 files edited · 2 dependents in 2 modules');
    expect(drill.textContent).toContain('src/api.ts');
    expect(drill.textContent).toContain('2 dependents');
    expect(drill.textContent.match(/edited directly/gi)).toHaveLength(1);
    expect(drill.textContent).toContain('tests/api.ts');
    expect(drill.textContent).toContain('calls src/api.ts');
    expect(drill.textContent).toContain('includes src/api.ts');
    expect(root.querySelector('.blast-header').textContent).not.toContain('changed:');
    expect(root.querySelector('.blast-explanation')).toBeNull();
    window.happyDOM.abort();
  });
  test('pressing a cell narrows the list; show-all or a second press restores it', () => {
    const { window, root } = mount(change());
    const cell = [...root.querySelectorAll('.blast-cell')].find((node) => node.getAttribute('aria-label') === 'tests, hop 2: 1 files');
    cell.click();
    const drill = root.querySelector('.blast-drill');
    expect(drill.textContent).toContain('tests · hop 2');
    [...root.querySelectorAll('.blast-cell')].find((node) => node.getAttribute('aria-label') === 'src, hop 1: 1 files').click();
    expect(drill.textContent).toContain('src/api.ts edited directly · 2 dependents');
    cell.click();
    expect(drill.textContent).toContain('tests/api.ts');
    expect(drill.textContent).not.toContain('src/ui.ts');
    expect(root.querySelector('.blast-matrix').dataset.filtered).toBe('true');
    root.querySelector('.blast-show-all').click();
    expect(drill.textContent).toContain('src/ui.ts');
    expect(cell.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('.blast-matrix').dataset.filtered).toBe('false');
    cell.click(); cell.click();
    expect(drill.textContent).toContain('src/ui.ts');
    expect(root.querySelector('.blast-show-all')).toBeNull();
    window.happyDOM.abort();
  });
  test('directories recorded by the native graph are listed apart and never counted as edited files', () => {
    const files = [{ path: '.vault/intents', hop: 1 }, { path: '.vault/intents/X', hop: 1 }, { path: '.vault/intents/X/intent.md', hop: 1 }, { path: 'hello.py', hop: 1 }];
    const paths = files.map((file) => file.path);
    const selection = { ...change(), affectedPaths: paths,
      blastRadius: { mode: 'partial', context: 'Partial KG coverage.', warnings: [], files, edges: [] },
      metadata: { usage: [], affectedPaths: paths, warnings: [], graphSummary: { verticesAdded: '4', edgesChanged: '0', contentBytes: '9', filesChanged: '4', files: [
        { symbol: '📁+', path: '.vault/intents', info: '(+2 vertices: name, inode)' }, { symbol: '📁+', path: '.vault/intents/X', info: '(+2 vertices: name, inode)' },
        { symbol: '±', path: '.vault/intents/X/intent.md', info: '(43 hunks)' }, { symbol: '+', path: 'hello.py', info: '(3 hunks)' }] } } };
    const { window, root } = mount(selection);
    expect(root.querySelector('.blast-summary').textContent).toBe('2 files edited · no dependents found');
    const labels = [...root.querySelectorAll('.blast-cell')].map((node) => node.getAttribute('aria-label'));
    expect(labels).toHaveLength(2);
    expect(labels).toEqual(expect.arrayContaining(['.vault, hop 1: 1 files', '(root), hop 1: 1 files']));
    expect(root.querySelector('.blast-legend')).toBeNull();
    expect([...root.querySelectorAll('.blast-matrix th')].map((th) => th.textContent)).not.toContain('total');
    const drill = root.querySelector('.blast-drill').textContent;
    expect(drill).toContain('Edited directly · 2');
    expect(drill).toContain('Directories created · 2');
    expect(drill).toContain('.vault/intents/X');
    expect(drill).toContain('Callers & importers · none found');
    expect(drill).not.toContain('none found · partial coverage');
    expect(drill).toContain('not proof of zero impact');
    expect(root.querySelector('.blast-dirs').textContent).not.toContain('📁');
    window.happyDOM.abort();
    const full = mount(change());
    expect(full.root.querySelector('.blast-legend')).not.toBeNull();
    expect([...full.root.querySelectorAll('.blast-matrix th')].map((th) => th.textContent)).toContain('total');
    full.window.happyDOM.abort();
  });
  test('missing analysis lists dependents as unknown and groups top-level files under (root)', () => {
    const missing = change(); delete missing.blastRadius;
    const { window, root } = mount(missing);
    expect(root.querySelector('.blast-summary').textContent).toBe('4 files edited · dependents unknown');
    expect(root.querySelector('.blast-drill').textContent).toContain('Callers & importers · unknown');
    expect(root.querySelector('.blast-drill').textContent).not.toMatch(/\b0 dependents/);
    expect([...root.querySelectorAll('.blast-cell')].some((node) => node.getAttribute('aria-label') === '(root), hop 1: 1 files')).toBe(true);
    window.happyDOM.abort();
  });
});
