import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { EvidenceExplorer } from '../src/atomic/evidenceExplorer.ts';
import { summarizeView, viewTreeDescription } from '../src/atomic/model.ts';
import { changeEvidence, parseProvenance } from '../src/atomic/evidence.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';
import { activityType, projectDraft } from '../webview/src/draftProjection.ts';
import { readAtomicWhy } from '../webview/src/helpers/atomicIntentDocument.ts';
import { displayChangeHash } from '../src/shared/atomicHash.ts';

const bytes = (n) => new Uint8Array(32).fill(n), hex = (n) => Buffer.from(bytes(n)).toString('hex');
const graph = (index = 1, count = 2) => ({ version: 3, session_id: `session-${index}`, agent_name: 'OpenCode', plan_id: 'TEST::1',
  nodes: Array.from({ length: count }, (_, n) => ({ id: `${index}-${n}`, kind: n % 2 ? 'execution' : 'exploration', summary: `Action ${index}-${n}`,
    tool_name: n % 2 ? 'shell' : 'read', timestamp: 1000 + index * 100 + n, duration_ms: n, detail: '{"path":"read-only/context.ts"}' })), edges: [] });
const detail = (n, count = 2) => ({ change: { hash: { value: bytes(n) }, message: `Change ${n}`, dependencies: [], authors: [] },
  provenanceLedger: [{ schema: 'atomic.prov.graph.v1', payload: Buffer.from(JSON.stringify(graph(n, count))) }],
  provenanceLedgerHashes: [{ value: bytes(n + 20) }], fileContents: [{ path: `src/file${n}.ts` }] });
function fixture(scope = 1) {
  const calls = [], events = [], paths = [];
  const views = [{ name: 'main', scope: 2, current: true, changeCount: 1000 },
    { name: 'feature', scope, parent: 'main', changeCount: 1004, ownChangeCount: 4, inheritedChangeCount: 1000 }];
  const client = { status: async () => { calls.push(['status']); return { view: 'main', files: [] }; },
    views: { list: async () => { calls.push(['views']); return { views }; }, switch: async () => { throw new Error('Must not switch'); } },
    log: async (options) => { calls.push(['log', options]); return { entries: [4, 3, 2, 1].map((n) => ({ hash: { value: bytes(n) }, view: 'feature' })) }; },
    change: async (ref, options) => { calls.push(['change', ref, options]); return detail(ref.hash[0]); },
    vault: { listIntents: async () => { throw new Error('Never list unrelated repository intents'); },
      getIntent: async (id) => { calls.push(['getIntent', id]); return { entry: { id, title: 'Improve session handling', body: ':::why\nUsers need predictable sessions.\n:::', vaultPath: '.vault/intents/test/intent.md' } }; },
      getSignedIntent: async () => ({}) } };
  return { client, calls, events, views, explorer: new EvidenceExplorer('/repo', client, (op) => op(), (event) => events.push(event), (snapshot) => paths.push(snapshot)) };
}

describe('Authoritative view classification and draft routing', () => {
  test('display hashes use the CLI Base32 encoding rather than internal hex IDs', () => {
    expect(displayChangeHash('00'.repeat(32))).toBe('A'.repeat(52));
    expect(displayChangeHash('ff'.repeat(32))).toBe('7'.repeat(51) + 'Q');
    expect(displayChangeHash('not-a-hash')).toBe('not-a-hash');
  });
  test('focused shared-view inspection loads only the clicked hash and its explicit intent', async () => {
    const { explorer, calls, events } = fixture();
    await explorer.inspectView('main', true);
    await explorer.inspectHistoryHash(hex(2));
    expect(calls.filter(([name]) => name === 'log')).toHaveLength(0);
    expect(calls.filter(([name]) => name === 'change')).toHaveLength(1);
    expect(calls.filter(([name]) => name === 'getIntent')).toEqual([['getIntent', 'TEST::1']]);
    expect(events.at(-1).selection.id).toBe(hex(2));
    expect(explorer.intentFile('TEST::1')).toBe('/repo/.vault/intents/test/intent.md');
  });
  test('navigation fences an in-flight explicit hash read', async () => {
    const { explorer, client, events } = fixture();
    await explorer.inspectView('main', true);
    let release;
    client.change = () => new Promise((resolve) => { release = resolve; });
    const pending = explorer.inspectHistoryHash(hex(2));
    await explorer.inspectView('feature', true);
    release(detail(2)); await pending;
    expect(events.filter((event) => event.type === 'selection')).toHaveLength(0);
    expect(events.at(-1).state.view).toBe('feature');
  });
  test('left-pane descriptions show exact scope and never guess from a name', () => {
    expect(viewTreeDescription({ name: 'feature', scope: 2, changeCount: 1000 })).toBe('Shared · 1000 changes');
    expect(viewTreeDescription({ name: 'main', scope: 1, changeCount: 4, current: true })).toBe('Draft · current · 4 changes');
    expect(viewTreeDescription({ name: 'feature', scope: 1, changeCount: 1004, ownChangeCount: 4, inheritedChangeCount: 1000 }))
      .toBe('Draft · 4 own changes · 1000 inherited');
    expect(viewTreeDescription({ name: 'draft-feature', changeCount: 4 })).toBe('Unknown scope · 4 changes');
    expect(summarizeView({ name: 'main', scope: 9 }).scope).toBe('unknown');
    expect(summarizeView({ name: 'x', scope: 1, ownChangeCount: { toString: () => '4' }, inheritedChangeCount: 1000 }).ownChangeCount).toBe(4);
  });
  test('opening a 1000-change shared view stops before history, detail or vault reads', async () => {
    const { explorer, calls, events } = fixture();
    await explorer.handle({ action: 'ready' });
    expect(calls.map(([name]) => name)).toEqual(['status', 'views']);
    expect(events.at(-1).state.viewInfo.scope).toBe('shared');
    expect(events.at(-1).state.draft).toBeUndefined();
    await explorer.handle({ action: 'more' });
    expect(calls).toHaveLength(2);
  });
  test('a draft click hydrates four own changes, requests affected paths, and does not expand 1000 inherited changes', async () => {
    const { explorer, calls, events } = fixture();
    await explorer.inspectView('feature');
    const state = events.at(-1).state;
    expect(state.view).toBe('feature'); expect(state.workingCopyView).toBe('main');
    expect(state.draft.changes).toHaveLength(4);
    expect(calls.filter(([name]) => name === 'log')[0][1]).toEqual({ view: 'feature', allViews: false, budget: { maxItems: 30 } });
    expect(calls.filter(([name]) => name === 'change')).toHaveLength(4);
    expect(calls.filter(([name]) => name === 'change').every(([, , options]) => options.includeFileContents === true)).toBe(true);
    expect(calls.filter(([name]) => name === 'getIntent')).toEqual([['getIntent', 'TEST::1']]);
    expect(explorer.intentFile('TEST::1')).toBe('/repo/.vault/intents/test/intent.md');
    await explorer.inspectView('main');
    expect(explorer.intentFile('TEST::1')).toBeUndefined();
  });
  test('unknown scope is blocked rather than treated as a draft', async () => {
    const { explorer, calls, events } = fixture(0);
    await explorer.inspectView('feature');
    expect(events.at(-1).state.viewInfo.scope).toBe('unknown');
    expect(calls.some(([name]) => name === 'log')).toBe(false);
  });
  test('a stale in-flight draft detail cannot overwrite a newer shared selection or continue hydration', async () => {
    const { explorer, client, events } = fixture();
    let release, started;
    const waiting = new Promise((resolve) => { started = resolve; });
    let detailCalls = 0;
    client.change = async () => { detailCalls++; started(); return new Promise((resolve) => { release = resolve; }); };
    const old = explorer.inspectView('feature'); await waiting;
    await explorer.inspectView('main'); release(detail(4)); await old;
    expect(events.filter((event) => event.type === 'state').map((event) => event.state.view)).toEqual(['main']);
    expect(detailCalls).toBe(1);
    expect(explorer.intentFile('TEST::1')).toBeUndefined();
  });
  test('partial backend history without a cursor is reported as partial, not complete', async () => {
    const { explorer, client, events } = fixture();
    client.log = async () => ({ entries: [{ hash: { value: bytes(1) } }] });
    await explorer.inspectView('feature');
    expect(events.at(-1).state.draft.warnings.join(' ')).toContain('partial coverage');
    expect(events.at(-1).state.more).toBe(false);
  });
  test('unsafe linked-intent paths never become editor targets and detail failures remain visible', async () => {
    const { explorer, client, events } = fixture();
    client.vault.getIntent = async (id) => ({ entry: { id, title: 'Intent', vaultPath: '../escape' } });
    client.change = async (ref) => { if (ref.hash[0] === 4) throw new Error('Unavailable'); return detail(ref.hash[0]); };
    await explorer.inspectView('feature');
    expect(explorer.intentFile('TEST::1')).toBeUndefined();
    expect(events.at(-1).state.draft.changes).toHaveLength(3);
    expect(events.at(-1).state.draft.warnings.join(' ')).toContain('Unavailable');
  });
});

describe('Draft observability data and central presentation', () => {
  test('native report preserves recorded dates, ledger order, commands and untrusted text', () => {
    const input = detail(1);
    input.change.recordedAt = { seconds: '1791987195', nanos: 0 };
    const change = changeEvidence(input, hex(1));
    expect(change.recordedAt).toBe('2026-10-14T14:13:15.000Z');
    expect(changeEvidence({ ...input, change: { ...input.change, recordedAt: { seconds: 'invalid' } } }, hex(1)).recordedAt).toBeUndefined();
    const nodes = change.provenance[0].nodes;
    nodes[0] = { ...nodes[0], timestamp: 2000, kind: 'execution', toolName: 'bash', detail: '{"command":"printf Alice | npx tsx src/index.ts"}' };
    nodes[1] = { ...nodes[1], timestamp: 1000, label: '<img src=x onerror=bad()>', detail: 'literal <script>bad()</script>' };
    const window = new Window(), root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'hello-world', workingCopyView: 'main' } });
    ui.receive({ type: 'selection', selection: change });
    expect(root.querySelector('header').textContent).toContain('hello-world  atomic change');
    expect(root.textContent).toContain('2026-10-14 14:13:15 UTC');
    expect([...root.querySelectorAll('.activity-row')].map((row) => row.dataset.nodeId)).toEqual(nodes.map((node) => node.id));
    expect(root.querySelector('.activity-detail').textContent).toBe('$ printf Alice | npx tsx src/index.ts');
    expect(root.querySelector('img, script')).toBeNull();
    expect(root.querySelector('.activity-row').querySelector('details')).toBeNull();
    expect(root.querySelector('.linked-intent').parentElement.open).toBe(false);
    window.happyDOM.abort();
  });
  test('missing, unique and multiple intent links are explicit without claiming canonical SHACL or reverse uniqueness', () => {
    const window = new Window(), root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    const change = changeEvidence(detail(1), hex(1));
    ui.receive({ type: 'state', state: { view: 'main', workingCopyView: 'main', viewInfo: { scope: 'shared' } } });
    ui.receive({ type: 'selection', selection: { ...change, provenance: [] } });
    expect(root.querySelector('.intent-link-status').textContent).toContain('not a validation failure');
    expect(root.querySelector('.intent-link-failure')).toBeNull();
    ui.receive({ type: 'selection', selection: change });
    expect(root.querySelector('.intent-link-failure')).toBeNull();
    expect(root.querySelector('.intent-link-status').textContent).toContain('governing plan_id is recorded');
    ui.receive({ type: 'selection', selection: { ...change, provenance: [...change.provenance, { ...change.provenance[0], planId: 'OTHER::2' }] } });
    expect(root.querySelector('.intent-link-ambiguous').textContent).toContain('Multiple recorded governing plan references');
    expect(root.querySelector('.shacl-status').textContent).toContain('not run by this query');
    expect(root.querySelector('.shacl-status').textContent).toContain('not checked');
    window.happyDOM.abort();
  });
  test('preserves real tool/timestamp/duration metadata, not invented file impact', () => {
    const change = changeEvidence(detail(1), hex(1));
    expect(change.provenance[0].nodes[0].toolName).toBe('read');
    expect(change.provenance[0].nodes[0].timestamp).toBe(1100);
    expect(activityType(change.provenance[0].nodes[0])).toBe('read');
    expect(change.affectedPaths).toEqual(['src/file1.ts']);
    expect(change.affectedPaths).not.toContain('read-only/context.ts');
    expect(readAtomicWhy(':::why\nBody without YAML.\n:::')).toBe('Body without YAML.');
    expect(readAtomicWhy('```md\n:::why\nNot a directive.\n:::\n```')).toBe('');
  });
  test('duplicate ledgers are not counted twice, and absent timestamps preserve recorded ordering', () => {
    const a = changeEvidence(detail(1), hex(1)), b = { ...a, id: hex(2) };
    const projection = projectDraft({ changes: [a, b], intents: [], warnings: [] });
    expect(projection.activities).toHaveLength(2); expect(projection.timed).toBe(true);
    const untimed = parseProvenance({ schema: 'atomic.prov.graph.v1', payload: Buffer.from(JSON.stringify({ ...graph(), nodes: graph().nodes.map(({ timestamp, ...node }) => node) })) });
    a.provenance = [untimed];
    expect(projectDraft({ changes: [a], intents: [], warnings: [] }).timed).toBe(false);
  });
  test('the full bounded ledger is visible in native order and stale controls cannot resurrect a change', async () => {
    const { explorer, client, events } = fixture();
    client.change = async (ref) => detail(ref.hash[0], 60);
    await explorer.inspectView('feature');
    const window = new Window(), root = window.document.createElement('div'), sent = [];
    window.document.body.append(root);
    const ui = mountAtomicGraph(root, (message) => sent.push(message));
    ui.receive(events.at(-1));
    const state = events.at(-1).state;
    ui.receive({ type: 'selection', selection: state.draft.changes[0] });
    expect(root.querySelectorAll('.activity-row')).toHaveLength(60);
    expect(root.querySelector('.activity-kind').textContent).toBe('exploration');
    expect(root.querySelector('.activity-summary').textContent).toContain('exploration » Action 4-0 [read]');
    expect(root.querySelector('.activity-detail').textContent).toBe('read-only/context.ts');
    expect(root.querySelector('.activity-row > summary')).toBeNull();
    expect(root.querySelector('.overview-card, .overview-fact')).toBeNull();
    expect([...root.querySelectorAll('.native-section > h2')].slice(0, 2).map((item) => item.textContent))
      .toEqual(['=== Attestation ===', '=== Change Ledger ===']);
    expect(root.querySelector('aside, canvas, [aria-label="Evidence inspector"]')).toBeNull();
    expect(root.querySelector('.linked-intent h3').textContent).toBe('Improve session handling');
    expect(root.querySelector('.intent-why').textContent).toContain('Users need predictable sessions.');
    expect(root.querySelector('.draft-metrics').textContent).toContain('Not available');
    expect(root.querySelectorAll('.impact-path')).toHaveLength(1);
    const staleOpen = [...root.querySelectorAll('button')].find((item) => item.textContent === 'Open linked intent');
    await explorer.inspectView('main'); ui.receive(events.at(-1)); staleOpen.click();
    expect(root.textContent).toContain('select a change hash'); expect(root.querySelector('.change-detail')).toBeNull();
    expect(sent).toEqual([]);
    window.happyDOM.abort();
  });
});
