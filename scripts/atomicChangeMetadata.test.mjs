import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readChangeMetadata } from '../src/atomic/changeMetadata.ts';
import { changeEvidence } from '../src/atomic/evidence.ts';
import { summarizeRecordedUsage, formatRecordedCost } from '../webview/src/recordedUsage.ts';
import { mountAtomicGraph } from '../webview/src/atomicGraphView.ts';

const bytes = (n) => new Uint8Array(32).fill(n), hex = (n) => Buffer.from(bytes(n)).toString('hex');
const usage = (overrides = {}) => ({ recordIndex: 0, vendor: 'OpenAI', model: 'gpt-test', tool: 'CLI: OpenCode',
  requestId: 'request-1', sessionId: 'session-1', sessionSlug: 'hello', stepCount: 3,
  tokens: { inputTokens: '1200', outputTokens: '300', totalTokens: '1580', cacheReadTokens: '10000', cacheWriteTokens: '50', reasoningTokens: '80' },
  costMicroUsd: '123456', ...overrides });
const metadata = (n, entries = [usage()]) => ({ schemaVersion: 1, changeHash: { value: bytes(n) }, usage: entries, affectedPaths: ['src/real.ts'], warnings: [] });
const graphSummary = (overrides = {}) => ({ verticesAdded: '180', edgesChanged: '1', contentBytes: '7755', filesChanged: '1',
  files: [{ symbol: '±', path: 'src/index.ts', info: '(5 hunks: 1x +1 span, ~1 edge: replace; 4x +1 span: new content)' }], ...overrides });
const change = (n, meta = metadata(n)) => changeEvidence({ change: { hash: { value: bytes(n) }, message: `Change ${n}`, authors: [], dependencies: [] },
  provenanceLedger: [], provenanceLedgerHashes: [], metadata: meta, fileContents: [] }, hex(n));

describe('Decoded canonical change metadata boundary', () => {
  test('native graph summaries retain exact counters and text rows, distinguish absent/zero and reject malformed data', () => {
    const read = (graph) => readChangeMetadata({ ...metadata(1), graphSummary: graph }, hex(1));
    const summary = graphSummary({ verticesAdded: { toString: () => '18446744073709551615' } });
    expect(read(summary).graphSummary.verticesAdded).toBe('18446744073709551615');
    expect(read(summary).graphSummary.files).toEqual(summary.files);
    expect(read(undefined).graphSummary).toBeUndefined();
    expect(read(graphSummary({ verticesAdded: '0', edgesChanged: '0', contentBytes: '0', filesChanged: '0', files: [] })).graphSummary.filesChanged).toBe('0');
    for (const graph of [graphSummary({ verticesAdded: 9007199254740992 }), graphSummary({ edgesChanged: '-1' }),
      graphSummary({ contentBytes: '18446744073709551616' }), graphSummary({ files: [null] }),
      graphSummary({ files: [...summary.files, ...summary.files] }), graphSummary({ files: Array(2001).fill(summary.files[0]) })]) {
      expect(read(graph).status).toBe('invalid');
      expect(read(graph).graphSummary).toBeUndefined();
    }
  });
  test('preserves uint64 precision, source hash and whitelisted fields only', () => {
    const raw = metadata(1, [usage({ tokens: { ...usage().tokens, inputTokens: { toString: () => '18446744073709551615' } },
      prompt: 'PRIVATE_PROMPT', reasoningText: 'PRIVATE_REASONING' })]);
    const data = readChangeMetadata(raw, hex(1));
    expect(data.status).toBe('available');
    expect(data.usage[0].tokens.input).toBe('18446744073709551615');
    expect(data.usage[0].costMicroUsd).toBe('123456');
    expect(JSON.stringify(data)).not.toContain('PRIVATE_');
    expect(change(1, raw).affectedPaths).toEqual(['src/real.ts']);
  });
  test('missing, empty and recorded-zero metadata are distinct', () => {
    expect(readChangeMetadata(undefined, hex(1)).status).toBe('unavailable');
    expect(readChangeMetadata(metadata(1, []), hex(1)).usage).toEqual([]);
    const zero = change(1, metadata(1, [usage({ costMicroUsd: '0', tokens: Object.fromEntries(Object.keys(usage().tokens).map((key) => [key, '0'])) })]));
    const totals = summarizeRecordedUsage([zero]);
    expect(totals.totals.input).toBe('0'); expect(totals.costMicroUsd).toBe('0');
    expect(formatRecordedCost(totals.costMicroUsd)).toBe('$0.000000');
    expect(summarizeRecordedUsage([change(1, metadata(1, []))]).totals).toBeUndefined();
  });
  test('unsupported, malformed, duplicate, unsafe or cross-change metadata fails closed', () => {
    expect(readChangeMetadata({ ...metadata(1), schemaVersion: 99 }, hex(1)).status).toBe('unsupported');
    for (const raw of [metadata(2), metadata(1, [usage(), usage()]),
      metadata(1, [usage({ tokens: { ...usage().tokens, inputTokens: 9007199254740992 } })]),
      metadata(1, [usage({ costMicroUsd: '-1' })]), metadata(1, [usage({ costMicroUsd: '18446744073709551616' })])]) {
      expect(readChangeMetadata(raw, hex(1)).status).toBe('invalid');
    }
  });
});

test('webview renders native counts, symbols and hunk descriptions as text, with a truthful old-addon fallback', () => {
  const window = new Window(), root = window.document.createElement('div');
  const ui = mountAtomicGraph(root, () => {});
  ui.receive({ type: 'state', state: { view: 'test', workingCopyView: 'test' } });
  const render = (summary) => ui.receive({ type: 'selection', selection: change(1, { ...metadata(1), graphSummary: summary }) });
  render(graphSummary());
  expect(root.querySelector('.graph-summary').textContent).toBe('Graph: +180 vertices, ~1 edges, 7755 bytes');
  expect(root.querySelector('.file-summary').textContent).toBe('± src/index.ts (5 hunks: 1x +1 span, ~1 edge: replace; 4x +1 span: new content)');
  expect(root.textContent).toContain('Files changed: 1');
  render(graphSummary({ files: [{ symbol: '📁+', path: '<img src=x onerror=bad()>', info: '<script>bad()</script>' }] }));
  expect(root.querySelector('img, script')).toBeNull();
  expect(root.querySelector('.file-summary').textContent).toContain('<script>bad()</script>');
  render(graphSummary({ verticesAdded: '0', edgesChanged: '0', contentBytes: '0', filesChanged: '0', files: [] }));
  expect(root.querySelector('.graph-summary').textContent).toBe('Graph: +0 vertices, ~0 edges, 0 bytes');
  expect(root.textContent).toContain('Files changed: 0');
  render(undefined);
  expect(root.querySelector('.graph-summary')).toBeNull();
  expect(root.textContent).toContain('Install the current nodeatomic native addon');
  expect(root.textContent).not.toContain('Files changed: 0');
  expect(root.textContent).toContain('src/real.ts');
  window.happyDOM.abort();
});

describe('Recorded usage aggregation', () => {
  test('one request covering multiple changes is counted once, not once per change', () => {
    const result = summarizeRecordedUsage([change(1), change(2), change(3), change(4)]);
    expect(result.records).toHaveLength(1);
    expect(result.totals).toEqual({ input: '1200', output: '300', total: '1580', cacheRead: '10000', cacheWrite: '50', reasoning: '80' });
    expect(result.costMicroUsd).toBe('123456'); expect(result.partial).toBe(false);
  });
  test('different requests in one session are not collapsed; arithmetic stays exact above JS integer range', () => {
    const a = change(1, metadata(1, [usage({ tokens: { ...usage().tokens, inputTokens: '9007199254740993' }, costMicroUsd: '9007199254740993' })]));
    const b = change(2, metadata(2, [usage({ requestId: 'request-2', tokens: { ...usage().tokens, inputTokens: '1' }, costMicroUsd: '1' })]));
    const result = summarizeRecordedUsage([a, b]);
    expect(result.records).toHaveLength(2); expect(result.totals.input).toBe('9007199254740994'); expect(result.costMicroUsd).toBe('9007199254740994');
    expect(formatRecordedCost(result.costMicroUsd)).toBe('$9,007,199,254.740994');
  });
  test('missing request IDs are not guessed across changes, but per-change values remain available', () => {
    const a = change(1, metadata(1, [usage({ requestId: undefined })]));
    const b = change(2, metadata(2, [usage({ requestId: undefined })]));
    const combined = summarizeRecordedUsage([a, b]);
    expect(combined.totals).toBeUndefined(); expect(combined.excludedUnidentified).toBe(2);
    expect(combined.models).toContain('OpenAI · gpt-test');
    expect(summarizeRecordedUsage([a]).totals.input).toBe('1200');
  });
  test('conflicting repeated identities are excluded, and partial cost never becomes a zero', () => {
    const a = change(1), b = change(2, metadata(2, [usage({ costMicroUsd: '999' })]));
    const conflict = summarizeRecordedUsage([a, b]);
    expect(conflict.conflicts).toBe(1); expect(conflict.costMicroUsd).toBeUndefined(); expect(conflict.totals).toBeUndefined();
    const missingCost = summarizeRecordedUsage([change(1, metadata(1, [usage({ costMicroUsd: undefined })]))]);
    expect(missingCost.totals.input).toBe('1200'); expect(missingCost.costMicroUsd).toBeUndefined(); expect(missingCost.costMissing).toBe(1);
    expect(summarizeRecordedUsage([a, { ...change(2), metadata: undefined }]).partial).toBe(true);
  });
});

test('webview displays recorded model/token breakdown/cost and inline per-change attribution', () => {
  const window = new Window(), root = window.document.createElement('div');
  const changes = [change(1), change(2)];
  const ui = mountAtomicGraph(root, () => {});
  ui.receive({ type: 'state', state: { repository: '/repo', view: 'draft', views: ['draft'],
    viewInfo: { name: 'draft', scope: 'draft', current: true }, viewSummaries: [], nodes: [], edges: [], intents: [], more: false,
    workingCopyView: 'draft', workingCopyFiles: 0, draft: { changes, intents: [], warnings: [] } } });
  ui.receive({ type: 'selection', selection: changes[0] });
  const metrics = root.querySelector('.draft-metrics').textContent;
  expect(metrics).toContain('OpenCode'); expect(metrics).toContain('gpt-test'); expect(metrics).toContain('1,200 / 300');
  expect(metrics).toContain('10,000 /'); expect(metrics).toContain('/ 80 /'); expect(metrics).toContain('$0.123456');
  expect(root.querySelectorAll('.recorded-usage')).toHaveLength(1);
  expect(root.querySelector('.recorded-usage').textContent).toContain('Request ID: request-1');
  expect(root.querySelector('aside, canvas')).toBeNull();
  window.happyDOM.abort();
});
