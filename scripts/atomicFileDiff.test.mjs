import { describe, test, expect } from 'bun:test';
import { Window } from 'happy-dom';
import { recordedFileDiff, revisionText, MAX_REVISION_BYTES } from '../src/atomic/fileDiff.ts';
import { EvidenceExplorer } from '../src/atomic/evidenceExplorer.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';
const bytes = (text) => new TextEncoder().encode(text), hash = new Uint8Array(32).fill(3), id = Buffer.from(hash).toString('hex');

describe('Recorded text diff snapshots', () => {
  test('preserves exact text and distinguishes known absent, empty and unavailable revisions', () => {
    expect(revisionText(bytes('\ufeffa\r\n'))).toBe('\ufeffa\r\n');
    expect(revisionText(bytes(''))).toBe('');
    expect(revisionText(undefined, false)).toBe('');
    expect(() => revisionText(undefined)).toThrow('unavailable');
    expect(() => revisionText(undefined, true)).toThrow('unavailable');
    expect(() => revisionText(bytes('x'), false)).toThrow('Invalid');
    expect(() => revisionText(new Uint8Array([255]))).toThrow('Non-UTF-8');
    expect(() => revisionText(bytes('a\0b'))).toThrow('Binary');
    expect(() => revisionText(new Uint8Array(MAX_REVISION_BYTES + 1))).toThrow('too large');
    expect(() => recordedFileDiff({ path: 'src', isDirectory: true })).toThrow('directory');
    const source = bytes('recorded\n'), diff = recordedFileDiff({ path: 'a.ts', before: source, after: bytes('new\n') });
    source.fill(0); expect(diff.before).toBe('recorded\n'); expect(Object.isFrozen(diff)).toBe(true);
  });
  test('handles addition/deletion without replacing unknown data with empty text', () => {
    expect(recordedFileDiff({ path: 'added.ts', beforeExists: false, after: bytes('new\n') }).before).toBe('');
    expect(recordedFileDiff({ path: 'deleted.ts', before: bytes('old\n'), afterExists: false }).after).toBe('');
    expect(() => recordedFileDiff({ path: 'missing.ts', after: bytes('new\n') })).toThrow('unavailable');
    expect(() => recordedFileDiff({ path: 'directory', beforeExists: false, afterExists: false })).toThrow('either side');
  });
  test('only exposes selected, safe, reconstructable files and invalidates stale diff actions', async () => {
    const events = [];
    const files = [
      { path: 'src/a.ts', before: bytes('PRIVATE_BEFORE\n'), after: bytes('PRIVATE_AFTER\n') },
      { path: 'added.ts', beforeExists: false, after: bytes('add\n') },
      { path: 'deleted.ts', before: bytes('delete\n'), afterExists: false },
      { path: '../escape', before: bytes('a'), after: bytes('b') },
      { path: 'missing.ts', after: bytes('not an addition without evidence') },
      { path: 'binary.dat', before: new Uint8Array([0]), after: bytes('x') },
      { path: 'src', isDirectory: true, beforeExists: false, after: bytes('') },
    ];
    const client = { status: async () => ({ view: 'main', files: [] }), views: { list: async () => ({ views: [{ name: 'main', scope: 2 }] }) },
      change: async () => ({ change: { hash: { value: hash }, message: 'Recorded', authors: [], dependencies: [] }, fileContents: files, provenanceLedger: [], provenanceLedgerHashes: [] }) };
    const explorer = new EvidenceExplorer('/repo', client, (op) => op(), (event) => events.push(event), () => {});
    await explorer.inspectView('main', true); await explorer.inspectHistoryHash(id);
    expect(events.at(-1).selection.diffPaths).toEqual(['src/a.ts', 'added.ts', 'deleted.ts']);
    expect(JSON.stringify(events)).not.toContain('PRIVATE_BEFORE');
    expect(explorer.fileDiff(id, 'src/a.ts').after).toBe('PRIVATE_AFTER\n');
    expect(explorer.fileDiff('wrong', 'src/a.ts')).toBeUndefined();
    expect(explorer.fileDiff(id, '../escape')).toBeUndefined();
    expect(explorer.fileDiff(id, 'missing.ts')).toBeUndefined();
    explorer.invalidate(); expect(explorer.fileDiff(id, 'src/a.ts')).toBeUndefined();
    explorer.dispose();
  });
  test('change paths and direct blast-radius files send native-diff requests; indirect files do not', () => {
    const window = new Window(), root = window.document.createElement('div'), sent = [];
    const ui = mountAtomicGraph(root, (event) => sent.push(event));
    ui.receive({ type: 'state', state: { view: 'main', workingCopyView: 'main' } });
    const change = { kind: 'change', id, message: 'Change', authors: [], dependencies: [], signature: 'unknown', provenance: [], provenanceNotice: '',
      affectedPaths: ['src/a.ts'], diffPaths: ['src/a.ts'], blastRadius: { mode: 'structural', context: 'Current KG', warnings: [],
        files: [{ path: 'src/a.ts', hop: 1 }, { path: 'tests/a.ts', hop: 2 }], edges: [{ fromPath: 'tests/a.ts', toPath: 'src/a.ts', relation: 'calls' }] } };
    ui.receive({ type: 'selection', selection: change });
    const link = root.querySelector('button.impact-path'); link.click();
    expect(sent.at(-1)).toEqual({ action: 'openDiff', id, path: 'src/a.ts' });
    root.querySelector('.blast-cell.hop-1').click(); root.querySelector('.blast-file-diff').click();
    expect(sent.at(-1)).toEqual({ action: 'openDiff', id, path: 'src/a.ts' });
    root.querySelector('.blast-cell.hop-2').click(); expect(root.querySelector('.blast-file-diff')).toBeNull();
    const count = sent.length; ui.receive({ type: 'invalidated' }); link.click(); expect(sent.length).toBe(count);
    window.happyDOM.abort();
  });
});
