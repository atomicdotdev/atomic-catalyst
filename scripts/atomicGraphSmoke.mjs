// Browser checks of the built central view overview, using a read-only backend double.
// Real tree clicks and panel ready/navigation are covered by atomicViewHostSmoke.mjs.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { findPdfBrowserExecutablePath } from '../src/export/browserDiscovery.ts';
import { EvidenceExplorer } from '../src/atomic/evidenceExplorer.ts';

const bytes = (n) => new Uint8Array(32).fill(n);
const files = ['src/greeting.ts', 'src/index.ts', 'tests/greeting.test.ts', 'docs/README.md'];
const calls = [], snapshots = [], opened = [], diffOpened = [];
const viewList = [
  { name: 'main', scope: 2, current: true, changeCount: 1000 },
  { name: 'hello-draft', scope: 1, parent: 'main', changeCount: 1004, ownChangeCount: 4, inheritedChangeCount: 1000 },
  { name: 'unknown-scope', scope: 0, changeCount: 1000 }
];
const makeDetail = (index) => {
  const graph = { version: 3, session_id: 'hello-session', agent_name: 'OpenCode', plan_id: 'HELLO::1',
    nodes: Array.from({ length: 72 }, (_, n) => ({ id: `activity-${index}-${n}`, kind: n === 0 ? 'goal' : n === 1 ? 'exploration' : n === 2 ? 'commitment' : 'execution',
      summary: n === 0 ? `Start work on ${files[index - 1]}` : n === 1 ? 'Read docs/context.md' : n === 2 ? `Edit ${files[index - 1]}` : n === 7 ? '<img src=x onerror=bad()> recorded as text' : `Activity ${index}-${n}: run the greeting checks`,
      tool_name: n === 0 ? null : n === 1 ? 'read' : n === 2 ? 'edit' : 'shell',
      timestamp: 1792051200000 + index * 1000 + n, duration_ms: n * 10,
      detail: JSON.stringify({ path: n === 1 ? 'docs/context.md' : files[index - 1], recorded: true }) })),
    edges: [{ from: `activity-${index}-0`, to: `activity-${index}-1`, kind: 'explored_via' }] };
  return { change: { hash: { value: bytes(index) }, message: `Update ${files[index - 1]}`, authors: [{ name: 'Recorded actor' }], dependencies: [], hasSignature: true },
    provenanceLedger: [{ schema: 'atomic.prov.graph.v1', payload: Buffer.from(JSON.stringify(graph)) }],
     provenanceLedgerHashes: [{ value: bytes(index + 10) }], fileContents: [{ path: files[index - 1], before: Buffer.from('recorded before\n'), after: Buffer.from('recorded after\n') }],
     intentContext: { schemaVersion: 1, changeHash: { value: bytes(index) }, planId: 'HELLO::1', status: 'recorded',
       plans: [{ planId: 'HELLO::1', source: 'provenance_graph', sessionId: 'hello-session', provenanceHash: { value: bytes(index + 10) },
         intent: { id: 'HELLO::1', uid: 'hello', title: 'Make hello interactive', path: '.vault/intents/hello/intent.md' } }],
       associatedIntents: [], warnings: [], validationStatus: 'not_checked', context: 'Recorded declarations; current vault metadata; no validation performed.' },
     blastRadius: { changeHash: { value: bytes(index) }, mode: 'structural', context: 'Recorded sources + current repository KG; not a historical view snapshot.', warnings: [],
       files: [{ path: files[index - 1], hop: 1 }, { path: 'tests/caller.ts', hop: 2 }],
       edges: [{ fromPath: 'tests/caller.ts', toPath: files[index - 1], relation: 'CALLS' }] },
     metadata: { schemaVersion: 1, changeHash: { value: bytes(index) }, affectedPaths: [files[index - 1]], warnings: [],
       graphSummary: { verticesAdded: '3', edgesChanged: '0', contentBytes: '24', filesChanged: '1',
         files: [{ symbol: '+', path: files[index - 1], info: '(+3 vertices: name, inode, content)' }] },
      usage: [{ recordIndex: 0, vendor: 'OpenAI', model: index <= 2 ? 'gpt-test' : 'gpt-test-lite', tool: 'CLI: OpenCode',
        requestId: index <= 2 ? 'request-a' : 'request-b', sessionId: 'hello-session',
        tokens: index <= 2 ? { inputTokens: '1200', outputTokens: '300', totalTokens: '1580', cacheReadTokens: '10000', cacheWriteTokens: '50', reasoningTokens: '80' }
          : { inputTokens: '500', outputTokens: '100', totalTokens: '620', cacheReadTokens: '2000', cacheWriteTokens: '0', reasoningTokens: '20' },
        costMicroUsd: index <= 2 ? '123456' : '76544' }] } };
};
const browser = await puppeteer.launch({ executablePath: await findPdfBrowserExecutablePath(), headless: true });
let phase = 'startup';
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (/violates.*Content Security Policy/i.test(message.text())) errors.push(message.text()); });
  await page.setViewport({ width: 1450, height: 1100 });
  const explorer = new EvidenceExplorer('/fixture/hello', {
    status: async () => ({ view: 'main', files: [] }), views: { list: async () => ({ views: viewList }) },
    log: async (options) => { calls.push(['log', options]); return { entries: [4, 3, 2, 1].map((n) => ({ hash: { value: bytes(n) }, view: 'hello-draft' })) }; },
    change: async (ref, options) => { calls.push(['change', ref.hash[0], options]); return makeDetail(ref.hash[0]); },
    vault: {
      getIntent: async (id) => { calls.push(['getIntent', id]); return { entry: { id, title: 'Make hello interactive',
        body: ':::why\nLet users enter a name and receive a predictable, tested greeting.\n:::', vaultPath: '.vault/intents/hello/intent.md' } }; },
      getSignedIntent: async (id) => { calls.push(['getSignedIntent', id]); return { signatureValid: true, sourceFresh: false,
        signerDid: 'did:key:fixture', signedRevision: { value: bytes(9) }, signedDocument: '{"id":"HELLO::1","text":"</pre><script>bad()</script>"}', reason: 'stored source changed' }; }
    }
  }, (operation) => operation(), (event) => { void page.evaluate((data) => window.postMessage(data, '*'), event); }, (snapshot) => snapshots.push(snapshot));
  await page.exposeFunction('__atomicPost', async (message) => {
     if (message?.action === 'openIntent') { opened.push(message); return; }
     if (message?.action === 'openDiff') { if (explorer.fileDiff(message.id, message.path)) diffOpened.push(message); return; }
    return explorer.handle(message);
  });
  await page.setContent('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'nonce-fixture\'; style-src \'nonce-fixture\'; base-uri \'none\'; form-action \'none\'"><div id="atomic-graph"></div>');
  await page.evaluate((content) => { const style = document.createElement('style'); style.nonce = 'fixture'; style.textContent = content; document.head.append(style); }, await readFile(new URL('../dist/atomic-graph.css', import.meta.url), 'utf8'));
  await page.evaluate(() => {
    window.__acknowledged = [];
    window.acquireVsCodeApi = () => ({ postMessage: async (message) => { await window.__atomicPost(message); window.__acknowledged.push(message); } });
  });
  await page.evaluate((content) => { const script = document.createElement('script'); script.nonce = 'fixture'; script.textContent = content; document.body.append(script); }, await readFile(new URL('../dist/atomic-graph.js', import.meta.url), 'utf8'));
   phase = 'view navigation prompt';
   await page.waitForFunction(() => document.querySelector('main').textContent.includes('select a change hash'));
  assert.equal(calls.length, 0, 'Shared views must not enumerate 1000 changes');
   assert.equal(await page.$('aside, canvas, [aria-label="Evidence inspector"]'), null);

   await explorer.inspectView('hello-draft', true);
   await explorer.inspectHistoryHash(Buffer.from(bytes(1)).toString('hex'));
   phase = 'single change and linked intent';
    await page.waitForSelector('.change-detail');
    assert.match(await page.$eval('.change-plan-id', (node) => node.textContent), /HELLO::1/);
   assert.equal(await page.$eval('.linked-intent h3', (node) => node.textContent), 'Make hello interactive');
  assert.match(await page.$eval('.intent-why', (node) => node.textContent), /predictable, tested greeting/);
  const metrics = await page.$eval('.draft-metrics', (node) => node.textContent);
   assert.match(metrics, /Tool: CLI: OpenCode/); assert.match(metrics, /gpt-test/);
   assert.match(metrics, /1,200 \/ 300/); assert.match(metrics, /10,000 \/ 50 \/ 80/);
   assert.match(metrics, /\$0\.123456/);
   assert.match(await page.$eval('.shacl-status', (node) => node.textContent), /not run by this query/);
    assert.equal(await page.$$eval('.impact-path', (nodes) => nodes.length), 1);
    assert.equal(await page.$eval('.graph-summary', (node) => node.textContent), 'Graph: +3 vertices, ~0 edges, 24 bytes');
    assert.match(await page.$eval('.file-summary', (node) => node.textContent), /\+ src\/greeting.ts \(\+3 vertices: name, inode, content\)/);
  assert.equal(await page.$$eval('.impact-path', (nodes) => nodes.some((node) => node.textContent === 'docs/context.md')), false);
   assert.equal(calls.filter(([name]) => name === 'change').length, 1);
    assert.equal(calls.some(([name]) => name === 'log'), false);
   assert.equal(await page.$('aside, canvas, [aria-label="Evidence inspector"]'), null);

   phase = 'module by hop blast-radius matrix';
   await page.click('button.impact-path');
   await page.waitForFunction(() => window.__acknowledged.some((message) => message.action === 'openDiff'));
   assert.deepEqual(diffOpened.at(-1), { action: 'openDiff', id: Buffer.from(bytes(1)).toString('hex'), path: files[0] });
   assert.match(await page.$eval('.blast-header', (node) => node.textContent), /BLAST RADIUS.*structural \(KG\)/);
   await page.click('.blast-cell.hop-2');
   assert.match(await page.$eval('.blast-drill', (node) => node.textContent), /tests\/caller.ts.*calls src\/greeting.ts/);
   await page.focus('.blast-cell.hop-1'); await page.keyboard.press('Enter');
   assert.match(await page.$eval('.blast-drill', (node) => node.textContent), /src\/greeting.ts.*edited directly/);
   await page.click('.blast-file-diff');
   await page.waitForFunction(() => window.__acknowledged.filter((message) => message.action === 'openDiff').length === 2);
   assert.equal(diffOpened.length, 2);
   await page.click('.blast-footer > button');
   assert.equal(await page.$$eval('.blast-graph canvas', (nodes) => nodes.length), 1);
   assert.match(await page.$eval('.blast-graph', (node) => node.textContent), /Direct edits and callers\/importers/);
   await page.click('.blast-footer > button');
   assert.equal(await page.$eval('.blast-graph', (node) => node.hidden), true);

    phase = 'continuous native ledger';
   assert.equal(await page.$$eval('.activity-row', (nodes) => nodes.length), 72);
   assert.equal(await page.$eval('.activity-kind', (node) => node.textContent), 'goal');
   assert.match(await page.$eval('.activity-summary', (node) => node.textContent), /goal » Start work/);
   assert.equal(await page.$('.overview-card, .overview-fact, .activity-row > summary'), null);
   assert.equal(await page.$eval('.activity-detail', (node) => getComputedStyle(node).display !== 'none'), true);
   await page.click('.ledger-metadata > summary');
   assert.equal(await page.$eval('.ledger-metadata', (node) => node.open), true);
   assert.match(await page.$eval('.ledger-metadata', (node) => node.textContent), /Recorded relationships/);
  if (process.env.ATOMIC_DRAFT_SCREENSHOT) {
     await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: process.env.ATOMIC_DRAFT_SCREENSHOT });
  }
  phase = 'narrow layout and keyboard';
  await page.setViewport({ width: 600, height: 900 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
   await page.focus('.ledger-metadata > summary'); await page.keyboard.press('Enter');
    assert.equal(await page.$eval('.ledger-metadata', (node) => node.open), false);
  await page.setViewport({ width: 1450, height: 1100 });
  assert.equal(await page.$$eval('img', (nodes) => nodes.length), 0);

   phase = 'inline attestation and invalidation';
    await page.click('details.native-supplement:not(.ledger-metadata) > summary');
   await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Open linked intent').click());
  await page.waitForFunction(() => window.__acknowledged.some((message) => message.action === 'openIntent'));
  assert.deepEqual(opened, [{ action: 'openIntent', id: 'HELLO::1' }]);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Inspect stored attestation').click());
   await page.waitForFunction(() => document.querySelector('.stored-attestation')?.textContent.includes('Historical signature: valid'));
   const inline = await page.$eval('.stored-attestation', (node) => node.textContent);
  assert.match(inline, /Stored-source freshness: stored source changed/); assert.match(inline, /Signer trust: unknown/);
  assert.match(inline, /Current editor buffer: not compared/);
  await page.evaluate(() => { window.__oldSigned = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Open exact stored')); window.__oldSigned.click(); });
  await page.waitForFunction(() => window.__acknowledged.some((message) => message.action === 'openSigned'));
  assert.equal(snapshots.length, 1); assert.match(snapshots[0].document, /<script>bad\(\)<\/script>/);
  explorer.invalidate();
   await page.waitForFunction(() => document.querySelector('main').textContent.includes('Repository state changed'));
  await page.evaluate(() => window.__oldSigned.click());
  assert.equal(snapshots.length, 1);
    assert.equal(await page.$('.activity-row, .change-detail, .stored-attestation, .blast-radius, canvas'), null);
  const beforeShared = calls.length;
   await explorer.inspectView('main', true);
   await page.waitForFunction(() => document.querySelector('main').textContent.includes('select a change hash'));
  assert.equal(calls.length, beforeShared, 'Returning to Shared must not load draft data');
   await explorer.inspectView('unknown-scope', true);
   await page.waitForFunction(() => document.querySelector('header').textContent.includes('unknown-scope'));
  assert.equal(calls.length, beforeShared);
  assert.equal(await page.$$eval('script', (nodes) => nodes.length), 1);
  assert.deepEqual(errors, []);
  explorer.dispose();
    console.log('Change detail browser checks passed: lazy selection, native text report, continuous ledger, linked intent/why, recorded usage/files, signed snapshots, stale actions, narrow layout and strict CSP.');
} catch (error) { throw new Error(`Browser smoke failed during ${phase}: ${error.message}`, { cause: error }); }
finally { await browser.close(); }
