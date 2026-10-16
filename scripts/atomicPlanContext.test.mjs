import { describe, test, expect } from 'bun:test';
import { Window } from 'happy-dom';
import { readChangeIntentContext } from '../src/atomic/changeIntentContext.ts';
import { intentReferences } from '../src/shared/changeIntentContext.ts';
import { EvidenceExplorer } from '../src/atomic/evidenceExplorer.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';
const bytes = (n) => new Uint8Array(32).fill(n), id = Buffer.from(bytes(1)).toString('hex');
const uid = '01M4XSNK5A0XSSTRMMPHPZWD1Q', human = 'HELL::continuouslee::1', path = `.vault/intents/${uid}/intent.md`;
const identity = { id: human, uid, title: 'Build a Hello World TypeScript CLI', path };
const context = () => ({ schemaVersion: 1, changeHash: { value: bytes(1) }, status: 'missing', plans: [],
  associatedIntents: [{ path, intent: identity, commitmentNodeIds: ['edit-8', 'edit-17'], patchNodeIds: ['patch-28'], provenanceHashes: [{ value: bytes(2) }] }],
  warnings: [], validationStatus: 'not_checked', context: 'Recorded declarations + current vault identity; not historical or validated.' });
const binding = (overrides = {}) => ({ planId: uid, source: 'provenance_graph', sessionId: 'session-1', provenanceHash: { value: bytes(2) }, intent: identity, ...overrides });
const evidence = (value) => ({ kind: 'change', id, message: 'Hello world', authors: [], dependencies: [], signature: 'not verified', provenance: [], provenanceNotice: 'Recorded data.', intentContext: readChangeIntentContext(value, id) });

describe('Native change-local plan and intent context', () => {
  test('legacy causal edit associations do not become a plan_id or a validation failure', () => {
    const change = evidence(context());
    expect(change.intentContext.planId).toBeUndefined();
    expect(intentReferences(change)).toEqual([{ id: human, identity, governing: false, edited: true }]);
    const window = new Window(), root = window.document.createElement('div');
    const ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'main', workingCopyView: 'main' } });
    ui.receive({ type: 'selection', selection: change });
    expect(root.querySelector('.change-plan-id').textContent).toContain('Not recorded');
    expect(root.querySelector('.change-intent-associations').textContent).toContain(human);
    expect(root.querySelector('.linked-intent h3').textContent).toBe(identity.title);
    expect(root.querySelector('.linked-intent').textContent).toContain('edit-8, edit-17 — committed_via → patch-28');
    expect(root.querySelector('.linked-intent').textContent).toContain('not itself a governing declaration');
    expect(root.textContent).not.toContain('Intent-link requirement failed');
    expect(root.querySelector('.shacl-status').textContent).toContain('not run by this query');
    window.happyDOM.abort();
  });
  test('recorded IDs retain their source and native canonical alias instead of guessing in JS', () => {
    const input = { ...context(), status: 'recorded', planId: uid, plans: [binding(), binding({ source: 'session_turn', turnNumber: 0 })] };
    const change = evidence(input), references = intentReferences(change);
    expect(change.intentContext.planId).toBe(uid);
    expect(references).toEqual([{ id: human, identity, governing: true, edited: true }]);
    const window = new Window(), root = window.document.createElement('div'), ui = mountAtomicGraph(root, () => {});
    ui.receive({ type: 'state', state: { view: 'main', workingCopyView: 'main' } }); ui.receive({ type: 'selection', selection: change });
    expect(root.querySelector('.change-plan-id').textContent).toContain(uid);
    expect(root.querySelector('.linked-intent').textContent).toContain('session_turn · session session-1 · turn 0 (zero-based)');
    expect(root.querySelector('.intent-link-status').textContent).toContain('not a validation or signature result');
    const other = { id: 'HELL::continuouslee::2', uid: 'other', title: 'Other intent edited', path: '.vault/intents/other/intent.md' };
    const withOtherEdit = evidence({ ...input, associatedIntents: [...input.associatedIntents, { path: other.path, intent: other, commitmentNodeIds: [], patchNodeIds: [], provenanceHashes: [] }] });
    expect(intentReferences(withOtherEdit).filter((reference) => reference.governing)).toHaveLength(1);
    ui.receive({ type: 'selection', selection: withOtherEdit });
    expect(root.querySelector('.intent-link-ambiguous')).toBeNull();
    expect(root.querySelector('.change-plan-id').textContent).toContain(uid);
    window.happyDOM.abort();
  });
  test('source identity, schema, sources, safe paths and consistency fail closed', () => {
    const input = { ...context(), status: 'recorded', planId: uid, plans: [binding()] };
    for (const invalid of [{ ...input, schemaVersion: 99 }, { ...input, changeHash: { value: bytes(9) } },
      { ...input, plans: [binding({ source: 'filename_guess' })] }, { ...input, plans: [binding({ source: 'session_turn' })] },
      { ...input, plans: [binding({ turnNumber: -1 })] }, { ...input, validationStatus: 'passed' },
      { ...input, associatedIntents: [{ ...context().associatedIntents[0], path: '.vault/intents/../../escape' }] },
      { ...input, planId: 'unrecorded-plan' }, { ...input, status: 'missing' }, { ...input, status: 'ambiguous' }]) {
      expect(readChangeIntentContext(invalid, id).status).toBe('unavailable');
    }
    expect(readChangeIntentContext(undefined, id)).toBeUndefined();
    const invalid = evidence({ ...input, changeHash: { value: bytes(9) } });
    invalid.provenance = [{ planId: 'DO-NOT-BORROW', nodes: [], edges: [], available: true, schema: 'atomic.prov.graph.v1' }];
    expect(intentReferences(invalid)).toEqual([]);
  });
  test('the host fetches native resolved associations by canonical ID and uses the native source path', async () => {
    const calls = [], events = [];
    const graph = { version: 3, session_id: 'session-1', plan_id: null, nodes: [], edges: [] };
    const client = { status: async () => ({ view: 'main', files: [] }), views: { list: async () => ({ views: [{ name: 'main', scope: 2 }] }) },
      change: async () => ({ change: { hash: { value: bytes(1) }, message: 'Legacy hello', authors: [], dependencies: [] },
        provenanceLedger: [{ schema: 'atomic.prov.graph.v1', payload: Buffer.from(JSON.stringify(graph)) }], provenanceLedgerHashes: [{ value: bytes(2) }], intentContext: context() }),
      vault: { getIntent: async (reference) => { calls.push(reference); return { entry: { id: human, title: identity.title, body: ':::why\nBuild a runnable CLI.\n:::', vaultPath: null } }; } } };
    const explorer = new EvidenceExplorer('/repo', client, (op) => op(), (event) => events.push(event), () => {});
    await explorer.inspectView('main', true); await explorer.inspectHistoryHash(id);
    expect(calls).toEqual([human]); expect(explorer.intentFile(human)).toBe(`/repo/${path}`);
    expect(events.at(-1).selection.intentContext.planId).toBeUndefined();
    const state = events.findLast((event) => event.type === 'state').state;
    expect(state.draft.intents[0].canOpenSource).toBe(true);
    explorer.invalidate(); expect(explorer.intentFile(human)).toBeUndefined();
  });
});
