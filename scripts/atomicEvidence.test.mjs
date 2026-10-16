import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { changeEvidence, dependencyGraph, intentEvidence, parseProvenance } from '../src/atomic/evidence.ts';
import { EvidenceExplorer } from '../src/atomic/evidenceExplorer.ts';
import { signedSnapshotHtml } from '../src/atomic/evidenceHtml.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';
import { evidenceForest, renderEvidenceTree } from '../webview/src/atomicEvidenceTree.ts';
import { queryGraphData, queryGraphSimulation, queryNodeRadius, QUERY_NODE_COLORS } from '../webview/src/atomicDependencyGraph.ts';
import { projectDraft } from '../webview/src/draftProjection.ts';

const bytes = (n) => new Uint8Array(32).fill(n);
const hex = (n) => Buffer.from(bytes(n)).toString('hex');
const ledger = (graph, schema = 'atomic.prov.graph.v1') => ({ schema, payload: Buffer.from(JSON.stringify(graph)) });
const provenance = () => ({ version: 3, agent_name: 'test-agent', session_id: 'session-1', plan_id: 'TEST::1',
  nodes: [{ id: 'goal', kind: 'goal', summary: 'User request' }, { id: 'test', kind: 'verification', summary: 'Tests were reported passing' }],
  edges: [{ from: 'goal', to: 'test', kind: 'led_to' }] });
const signedDocument = '{\n  "id": "TEST::1", "proof": {"value": "stored"}\n}\n';
const verification = () => ({ valid: false, signatureValid: true, sourceFresh: false,
  signedDocument, signedRevision: { value: bytes(9) }, signerDid: 'did:key:test', reason: 'source changed' });
const detail = () => ({ change: { hash: { value: bytes(1) }, message: 'Implement feature', authors: [{ name: 'Recorded actor' }],
  hasSignature: true, dependencies: [] }, provenanceLedger: [ledger(provenance())], provenanceLedgerHashes: [{ value: bytes(7) }] });
function fixture() {
  const events = [], calls = [], snapshots = [];
  const entries = [{ hash: { value: bytes(1) }, message: 'Change 1', dependencies: [{ value: bytes(2) }] }];
  const client = {
    status: async () => ({ view: 'dev', files: [] }),
    views: { list: async () => ({ views: [{ name: 'dev', scope: 1 }, { name: 'feature', scope: 1 }, { name: 'main', scope: 2, changeCount: 1000 }] }) },
    log: async (options) => { calls.push(['log', options]); return { entries: [...entries] }; },
    change: async (ref, options) => { calls.push(['change', ref, options]); return detail(); },
    vault: {
      listIntents: async (...args) => { calls.push(['listIntents', ...args]); return { entries: [{ id: 'TEST::1', title: 'Intent 1' }] }; },
      getIntent: async (id) => { calls.push(['getIntent', id]); return { entry: { id, title: 'Intent 1', body: ':::why\nMake recorded work understandable.\n:::', vaultPath: '.vault/intents/test/intent.md' } }; },
      getSignedIntent: async (...args) => { calls.push(['getSignedIntent', ...args]); return verification(); }
    }
  };
  const explorer = new EvidenceExplorer('/repo', client, (op) => op(), (event) => events.push(event), (snapshot) => snapshots.push(snapshot));
  return { explorer, client, events, calls, snapshots };
}

const draftState = (changes = [changeEvidence(detail(), hex(1))]) => ({ repository: '/repo', view: 'feature', views: ['feature', 'main'],
  viewInfo: { name: 'feature', scope: 'draft', current: false, ownChangeCount: changes.length, inheritedChangeCount: 1000 },
  viewSummaries: [{ name: 'feature', scope: 'draft', current: false }, { name: 'main', scope: 'shared', current: true }],
  nodes: [], edges: [], intents: [{ id: 'TEST::1', title: 'Intent 1' }], more: false, workingCopyView: 'main', workingCopyFiles: 0,
  draft: { changes, intents: [{ id: 'TEST::1', title: 'Intent 1', body: ':::why\nMake recorded work understandable.\n:::', canOpenSource: true }], warnings: [] } });

describe('Atomic evidence semantics', () => {
  test('dependency graph retains unloaded references and deduplicates edges', () => {
    const entry = { hash: { value: bytes(1) }, message: 'Change', dependencies: [{ value: bytes(2) }, { value: bytes(2) }] };
    const graph = dependencyGraph([entry, entry]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id === hex(2)).loaded).toBe(false);
    expect(graph.edges).toEqual([{ from: hex(1), to: hex(2), label: 'depends on' }]);
  });
  test('valid signature and stale source stay separate; combined valid is not used', () => {
    const { selection, snapshot } = intentEvidence('TEST::1', verification());
    expect(selection.signature).toBe('valid');
    expect(selection.source).toBe('stored source changed');
    expect(selection.trust).toBe('unknown');
    expect(selection.buffer).toBe('not compared');
    expect(snapshot.document).toBe(signedDocument);
  });
  test('unknown signer verification is not an invalid signature', () => {
    const result = intentEvidence('TEST::1', { ...verification(), signatureValid: null });
    expect(result.selection.signature).toBe('not verified');
    expect(intentEvidence('TEST::1', { ...verification(), signatureValid: false }).selection.signature).toBe('invalid');
  });
  test('malformed signed documents or missing revision fail closed', () => {
    expect(() => intentEvidence('TEST::1', { ...verification(), signedDocument: '{bad' })).toThrow();
    expect(() => intentEvidence('TEST::1', { ...verification(), signedRevision: null })).toThrow();
    expect(() => intentEvidence('TEST::1', { ...verification(), signedDocument: '[]' })).toThrow();
    expect(intentEvidence('TEST::1', { reason: 'no document' }).selection.canOpenSigned).toBe(false);
  });
  test('signature presence and recorded verification activities never imply verification', () => {
    const evidence = changeEvidence(detail(), hex(1));
    expect(evidence.signature).toContain('not verified');
    expect(evidence.provenance[0].nodes[1].kind).toBe('verification');
    expect(evidence.provenanceNotice).toContain('not independent proof');
    expect(() => changeEvidence(detail(), hex(2))).toThrow('does not match');
  });
  test('supported provenance exposes recorded causal edges and an explicit plan ID', () => {
    const parsed = parseProvenance(ledger(provenance()), hex(7));
    expect(parsed.available).toBe(true);
    expect(parsed.planId).toBe('TEST::1');
    expect(parsed.edges).toEqual([{ from: 'goal', to: 'test', label: 'led_to' }]);
  });
  test('unknown, malformed, dangling, duplicate, oversized or future provenance fails closed', () => {
    const invalid = [
      ledger(provenance(), 'unknown.schema'),
      { schema: 'atomic.prov.graph.v1', payload: Buffer.from('{bad') },
      ledger({ ...provenance(), version: 99 }),
      ledger({ ...provenance(), nodes: [provenance().nodes[0], provenance().nodes[0]] }),
      ledger({ ...provenance(), edges: [{ from: 'missing', to: 'test', kind: 'led_to' }] }),
      { schema: 'atomic.prov.graph.v1', payload: new Uint8Array(2 * 1024 * 1024 + 1) }
    ];
    for (const item of invalid) {
      const parsed = parseProvenance(item);
      expect(parsed.available).toBe(false);
      expect(parsed.nodes).toEqual([]);
      expect(parsed.reason).toBeTruthy();
    }
  });
  test('signed snapshot HTML escapes all data and permits no scripts or network', () => {
    const html = signedSnapshotHtml({ intentId: '<img onerror=alert(1)>', signer: '<script>bad()</script>', revision: hex(9),
      document: '{"text":"</pre><script>bad()</script>"}' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;/pre&gt;');
    expect(html).toContain("default-src 'none'");
  });
});

describe('Evidence explorer request boundary', () => {
  test('only explicitly linked intents are read repository-wide; view inspection never switches the working view', async () => {
    const { explorer, events, calls } = fixture();
    await explorer.handle({ action: 'ready' });
    await explorer.handle({ action: 'view', view: 'feature' });
    expect(events.at(-1).state.view).toBe('feature');
    expect(events.at(-1).state.workingCopyView).toBe('dev');
    expect(calls.filter(([name]) => name === 'listIntents')).toEqual([]);
    expect(calls.filter(([name]) => name === 'getIntent')).toEqual([['getIntent', 'TEST::1'], ['getIntent', 'TEST::1']]);
    await explorer.handle({ action: 'intent', id: 'TEST::1' });
    expect(calls.at(-1)).toEqual(['getSignedIntent', 'TEST::1']);
  });
  test('unlisted subjects, arbitrary views, paths and service dispatch are ignored', async () => {
    const { explorer, calls } = fixture();
    await explorer.handle({ action: 'ready' });
    const count = calls.length;
    for (const message of [{ action: 'intent', id: 'arbitrary' }, { action: 'change', id: hex(8) },
      { action: 'view', view: 'unknown' }, { action: 'call', method: '/Mutation', path: '/tmp/file' }, null]) await explorer.handle(message);
    expect(calls).toHaveLength(count);
  });
  test('explicit host history navigation loads a selected change outside the overview page', async () => {
    const { explorer, client, events } = fixture();
    await explorer.handle({ action: 'ready' });
    client.change = async () => ({ ...detail(), change: { ...detail().change, hash: { value: bytes(8) } } });
    await explorer.inspectHistoryHash(hex(8));
    const state = events.filter((event) => event.type === 'state').at(-1).state;
    expect(state.nodes.find((node) => node.id === hex(8))).toBeUndefined();
    expect(events.filter((event) => event.type === 'selection').at(-1).selection.id).toBe(hex(8));
  });
  test('vault failure does not hide the change graph', async () => {
    const { explorer, client, events } = fixture();
    client.vault.getIntent = async () => { throw new Error('vault unavailable'); };
    await explorer.handle({ action: 'ready' });
    expect(events.at(-1).type).toBe('state');
    expect(events.at(-1).state.nodes.length).toBeGreaterThan(0);
    expect(events.at(-1).state.draft.intents[0].notice).toContain('vault unavailable');
  });
  test('a later selection discards an older attestation response', async () => {
    const { explorer, client, events, snapshots } = fixture();
    await explorer.handle({ action: 'ready' });
    let release;
    client.vault.getSignedIntent = () => new Promise((resolve) => { release = resolve; });
    const pending = explorer.handle({ action: 'intent', id: 'TEST::1' });
    await explorer.handle({ action: 'change', id: hex(1) });
    release(verification());
    await pending;
    expect(events.filter((e) => e.type === 'selection').map((e) => e.selection.kind)).toEqual(['change']);
    await explorer.handle({ action: 'openSigned' });
    expect(snapshots).toHaveLength(0);
  });
  test('refresh/invalidation fences pending reads and signed snapshots stay immutable', async () => {
    const { explorer, events, snapshots } = fixture();
    await explorer.handle({ action: 'ready' });
    await explorer.handle({ action: 'intent', id: 'TEST::1' });
    await explorer.handle({ action: 'openSigned' });
    expect(snapshots[0].document).toBe(signedDocument);
    explorer.invalidate();
    await explorer.handle({ action: 'openSigned' });
    expect(snapshots).toHaveLength(1);
    expect(events.at(-1).type).toBe('invalidated');
    expect(snapshots[0].document).toBe(signedDocument);
  });
  test('dispose suppresses an in-flight result', async () => {
    const { explorer, client, events } = fixture();
    let release;
    client.status = () => new Promise((resolve) => { release = resolve; });
    const pending = explorer.handle({ action: 'ready' });
    explorer.dispose();
    release({ view: 'dev', files: [] });
    await pending;
    expect(events.map((event) => event.type)).toEqual(['busy']);
  });
  test('history continuation keeps its view and explicit cursor', async () => {
    const { explorer, client, events, calls } = fixture();
    const cursor = { token: new Uint8Array([1]) };
    client.log = async (options) => {
      calls.push(['log', options]);
      return options.cursor ? { entries: [{ hash: { value: bytes(2) }, message: 'Earlier', dependencies: [] }] }
        : { entries: [{ hash: { value: bytes(1) }, message: 'Later', dependencies: [{ value: bytes(2) }] }], nextCursor: cursor };
    };
    await explorer.handle({ action: 'ready' });
    await explorer.handle({ action: 'more' });
    expect(calls.filter(([name]) => name === 'log').at(-1)[1]).toEqual({ view: 'dev', allViews: false, cursor, budget: { maxItems: 30 } });
    expect(events.at(-1).state.nodes.find((node) => node.id === hex(2)).loaded).toBe(true);
  });
});

describe('Draft overview inline evidence', () => {
  test('renders stale-but-valid evidence separately and clears signed actions on invalidation', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const sent = [];
    const ui = mountAtomicGraph(root, (message) => sent.push(message));
    ui.receive({ type: 'state', state: draftState() });
    ui.receive({ type: 'selection', selection: intentEvidence('TEST::1', verification()).selection });
    const inspector = root.querySelector('.stored-attestation');
    expect(inspector.textContent).toContain('Historical signature: valid');
    expect(inspector.textContent).toContain('Stored-source freshness: stored source changed');
    expect(inspector.textContent).toContain('Signer trust: unknown');
    expect(inspector.textContent).toContain('Current editor buffer: not compared');
    [...inspector.querySelectorAll('button')].find((b) => b.textContent.includes('Open exact')).click();
    expect(sent).toEqual([{ action: 'openSigned' }]);
    ui.receive({ type: 'invalidated' });
    expect(root.querySelector('.stored-attestation')).toBeNull();
    expect(root.textContent).toContain('Repository state changed');
    window.happyDOM.abort();
  });
  test('renders untrusted evidence as text, not executable HTML', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    const evidence = changeEvidence(detail(), hex(1));
    evidence.message = '</p><img onerror="bad()"><script>bad()</script>';
    evidence.provenance[0].nodes[0].label = '<img src=x>';
    ui.receive({ type: 'state', state: draftState([evidence]) });
    ui.receive({ type: 'selection', selection: evidence });
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root.textContent).toContain('<img');
    window.happyDOM.abort();
  });
  test('selected change shows its linked intent and actions, not an aggregate dashboard', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    const state = draftState(); ui.receive({ type: 'state', state });
    expect(root.querySelector('.activity-row')).toBeNull();
    ui.receive({ type: 'selection', selection: state.draft.changes[0] });
    expect(root.querySelectorAll('.activity-row')).toHaveLength(2);
    expect(root.querySelector('canvas, svg, aside, [aria-label="Evidence inspector"]')).toBeNull();
    expect(root.querySelector('.change-files')).not.toBeNull();
    expect(root.querySelector('.linked-intent').textContent).toContain('Make recorded work understandable.');
    window.happyDOM.abort();
  });
});

describe('Semantic relationship tree', () => {
  const nodes = ['goal', 'explore', 'edit', 'check', 'isolated'].map((id) => ({ id, label: `Full ${id} summary without truncation`, kind: id, loaded: true }));
  const edges = [
    { from: 'goal', to: 'check', label: 'led_to' },
    { from: 'goal', to: 'explore', label: 'explored_via' },
    { from: 'explore', to: 'edit', label: 'committed_via' },
    { from: 'edit', to: 'check', label: 'verified_by' },
    { from: 'check', to: 'goal', label: 'references' },
    { from: 'goal', to: 'edit', label: 'led_to' }
  ];
  test('forest retains every edge once and every node once, including cycles, shared children and disconnected roots', () => {
    const roots = evidenceForest(nodes, edges);
    const stack = [...roots], ids = [], recorded = [];
    while (stack.length) {
      const entry = stack.pop();
      ids.push(entry.node.id);
      for (const group of entry.groups.values()) for (const item of group) {
        recorded.push(item.edge);
        if (item.child) stack.push(item.child);
      }
    }
    expect(ids.sort()).toEqual(nodes.map((node) => node.id).sort());
    expect(recorded).toHaveLength(edges.length);
    for (const edge of edges) expect(recorded).toContain(edge);
    expect(roots.map((entry) => entry.node.id)).toContain('isolated');
    const goal = roots.find((entry) => entry.node.id === 'goal');
    expect(goal.groups.get('explored_via')[0].child.node.id).toBe('explore');
    expect(goal.groups.get('led_to').every((item) => !item.child)).toBe(true);
  });
  test('relationship links reveal collapsed descendants, focus exact targets and never send host requests', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    window.document.body.append(root);
    renderEvidenceTree(root, nodes, edges);
    expect(root.querySelectorAll('.tree-node')).toHaveLength(nodes.length);
    expect(root.querySelectorAll('.relationship-index a')).toHaveLength(edges.length);
    expect(root.querySelectorAll('.tree-reference')).toHaveLength(3);
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'Collapse all').click();
    expect([...root.querySelectorAll('.tree-roots details')].every((details) => !details.open)).toBe(true);
    root.querySelector('.relationship-index a[data-to="check"]').click();
    const target = root.querySelector('[data-node-id="check"] > details > summary');
    expect(window.document.activeElement).toBe(target);
    for (let parent = target.parentElement; parent !== root; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') expect(parent.open).toBe(true);
    }
    expect(target.textContent).toContain(nodes[3].label);
    root.querySelector('.tree-reference a[data-to="goal"]').click();
    expect(window.document.activeElement).toBe(root.querySelector('[data-node-id="goal"] > details > summary'));
    [...root.querySelectorAll('button')].find((button) => button.textContent === 'Expand all').click();
    expect([...root.querySelectorAll('.tree-roots details')].every((details) => details.open)).toBe(true);
    window.happyDOM.abort();
  });
  test('empty, self-referencing and untrusted evidence stays safe; mounted trees have unique link targets', () => {
    const window = new Window();
    const a = window.document.createElement('div'), b = window.document.createElement('div');
    renderEvidenceTree(a, [], []);
    expect(a.textContent).toContain('No recorded nodes');
    const unsafe = { id: '"<script>bad()</script>', label: '<img onerror=bad()>', kind: '<b>goal</b>', loaded: false };
    const loop = { from: unsafe.id, to: unsafe.id, label: '<script>relationship</script>' };
    for (const root of [a, b]) {
      renderEvidenceTree(root, [unsafe], [loop]);
      expect(root.querySelector('script, img, b')).toBeNull();
      expect(root.textContent).toContain(unsafe.label);
      expect(root.textContent).toContain('Reference outside loaded evidence');
      expect(root.querySelectorAll('.tree-node')).toHaveLength(1);
      expect(root.querySelectorAll('.tree-reference')).toHaveLength(1);
    }
    expect(a.querySelector('.tree-node-heading').id).not.toBe(b.querySelector('.tree-node-heading').id);
    window.happyDOM.abort();
  });
  test('long chains do not recurse on the JavaScript stack', () => {
    const nodes = Array.from({ length: 5000 }, (_, index) => ({ id: String(index), label: String(index), kind: 'execution', loaded: true }));
    const edges = nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id, label: 'led_to' }));
    const roots = evidenceForest(nodes, edges);
    expect(roots).toHaveLength(1);
    let entry = roots[0], count = 1;
    while (entry.groups.size) { entry = entry.groups.get('led_to')[0].child; count++; }
    expect(count).toBe(5000);
  });
});

describe('Atomic query graph visual boundary', () => {
  test('D3 uses copies of backend DTOs, retaining exact directed and unloaded references', () => {
    const nodes = [{ id: 'edge-0', kind: 'change', label: '<img onerror=bad()>', loaded: true },
      { id: 'node-0', kind: 'change', label: 'Outside loaded history', loaded: false }];
    const edges = [{ from: 'edge-0', to: 'node-0', label: 'depends on' }];
    const graph = queryGraphData(nodes, edges);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source.id).toBe('edge-0');
    expect(graph.links[0].target.id).toBe('node-0');
    expect(graph.links[0].kind).toBe('depends on');
    expect(graph.nodes[1].loaded).toBe(false);
    expect(graph.nodes[0].label).toBe('<img onerror=bad()>');
    queryGraphSimulation(graph.nodes, graph.links, 800, 600).stop().tick(240);
    expect(nodes[0].x).toBeUndefined();
    expect(edges[0].source).toBeUndefined();
  });
  test('D3 handles cyclic and disconnected references with finite positions using the CLI palette and force parameters', () => {
    const nodes = ['a', 'b', 'c', 'isolated'].map((id) => ({ id, kind: 'change', label: id, loaded: true }));
    const edges = [{ from: 'a', to: 'b', label: 'depends on' }, { from: 'b', to: 'a', label: 'depends on' }];
    const graph = queryGraphData(nodes, edges);
    const simulation = queryGraphSimulation(graph.nodes, graph.links, 800, 600).stop();
    simulation.tick(240);
    for (const node of graph.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
    expect(new Set(graph.nodes.map((node) => `${node.x}:${node.y}`)).size).toBe(4);
    expect(QUERY_NODE_COLORS.change).toBe('#e74c3c');
    expect(QUERY_NODE_COLORS.intent).toBe('#1abc9c');
    expect(queryNodeRadius('change')).toBe(4);
    expect(queryNodeRadius('module')).toBe(14);
    expect(simulation.force('link').distance()(graph.links[0], 0, graph.links)).toBe(80);
    expect(simulation.force('charge').strength()(graph.nodes[0], 0, graph.nodes)).toBe(-30);
  });
});

describe('Draft observability projection', () => {
  test('activity details stay inline without host calls, and shared routing clears all draft work', () => {
    const window = new Window(), root = window.document.createElement('div'), sent = [];
    const ui = mountAtomicGraph(root, (message) => sent.push(message));
    const evidence = changeEvidence(detail(), hex(1));
    ui.receive({ type: 'state', state: draftState([evidence]) });
    ui.receive({ type: 'selection', selection: evidence });
    const row = root.querySelector('[data-node-id="goal"]');
    expect(row.querySelector('summary')).toBeNull();
    root.querySelector('.ledger-metadata summary').click();
    const metadata = root.querySelector('.ledger-metadata');
    expect(metadata.open).toBe(true);
    expect(metadata.textContent).toContain('Recorded relationships');
    expect(metadata.textContent).toContain('led_to');
    expect(root.textContent).toContain('not independent proof');
    expect(sent).toEqual([]);
    const shared = draftState(); shared.view = 'main'; shared.viewInfo = shared.viewSummaries[1];
    ui.receive({ type: 'state', state: shared });
    expect(root.textContent).toContain('select a change hash');
    expect(root.querySelector('.draft-hero, .activity-row, .blast-radius')).toBeNull();
    ui.receive({ type: 'selection', selection: evidence });
    expect(root.querySelector('.change-detail')).not.toBeNull();
    window.happyDOM.abort();
  });
  test('signature, freshness, trust and buffer remain separate inline facts', () => {
    const window = new Window(), root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: draftState() });
    ui.receive({ type: 'selection', selection: intentEvidence('TEST::1', verification()).selection });
    const states = root.querySelectorAll('.stored-attestation .native-fact');
    expect(states.length).toBeGreaterThanOrEqual(4);
    expect(states[1].textContent).toContain('Historical signature: valid');
    expect(states[2].textContent).toContain('stored source changed');
    expect(states[4].textContent).toContain('unknown');
    expect(states[5].textContent).toContain('not compared');
    window.happyDOM.abort();
  });
  test('shared ledgers are deduplicated and paths come only from recorded affected files', () => {
    const a = changeEvidence(detail(), hex(1)); a.affectedPaths = ['src/a.ts'];
    const b = { ...a, id: hex(2), affectedPaths: ['src/b.ts'] };
    const data = projectDraft({ changes: [a, b], intents: [], warnings: [] });
    expect(data.activities).toHaveLength(2);
    expect(data.activities[0].changes.sort()).toEqual([hex(1), hex(2)]);
    expect(data.files.map(([path]) => path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(data.files.some(([path]) => path.includes('User request'))).toBe(false);
  });
});
