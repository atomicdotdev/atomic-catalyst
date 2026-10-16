// Explicit integration smoke test. The CLI provisions only a disposable fixture;
// application operations use the packaged in-process runtime, with an unusable daemon endpoint.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openRepository, proto } from '../dist/nodeatomic/index.mjs';

const root = await mkdtemp(join(tmpdir(), 'catalyst-atomic-'));
try {
  execFileSync(process.env.ATOMIC_BIN || 'atomic', ['init', '--no-vault', '--view', 'test', '.'], {
    cwd: root, env: { ...process.env, ATOMIC_SERVICE: 'local', ATOMIC_RPC: '0' }, stdio: 'pipe'
  });
  process.env.ATOMIC_SERVICE = 'reactor';
  process.env.ATOMIC_DAEMON_SOCKET = '/nonexistent/catalyst-atomic.sock';
  const repo = await openRepository(root);
  await writeFile(join(root, 'intent.md'), '# Test intent\n');
  assert.equal((await repo.status()).files.find((f) => f.path === 'intent.md').status,
    proto.FileStatus.FILE_STATUS_UNTRACKED);
  await repo.add(['intent.md']);
  const status = await repo.status();
  assert.equal(status.files.find((f) => f.path === 'intent.md').status, proto.FileStatus.FILE_STATUS_ADDED);
  const expected = status.snapshot ? { viewSnapshot: status.snapshot } : { merkleRoot: status.viewMerkle };
  const recorded = await repo.record('Catalyst packaged consumer smoke', { paths: ['intent.md'], expected });
  const history = await repo.log({ view: status.view, budget: { maxItems: 30 } });
  assert.equal(history.entries[0].message, 'Catalyst packaged consumer smoke');
   const detail = await repo.change({ hash: recorded.change.hash.value }, { includes: { metadata: true, blastRadius: true } });
  assert.equal(detail.change.message, 'Catalyst packaged consumer smoke');
  assert.ok(detail.metadata.graphSummary, 'Packaged addon must expose the native graph summary');
  assert.ok(BigInt(String(detail.metadata.graphSummary.verticesAdded)) > 0n);
  assert.ok(detail.metadata.graphSummary.files.some((file) => file.path === 'intent.md' && file.info.includes('vertices')));
  assert.ok(detail.blastRadius.files.some((file) => file.path === 'intent.md' && file.hop === 1));
  assert.equal(detail.blastRadius.mode, 'partial', 'Markdown without a structural parser is not a known private change');
   assert.deepEqual(Buffer.from(detail.blastRadius.changeHash.value), Buffer.from(recorded.change.hash.value));
   assert.equal(detail.intentContext.schemaVersion, 1);
   assert.deepEqual(Buffer.from(detail.intentContext.changeHash.value), Buffer.from(recorded.change.hash.value));
   assert.equal(detail.intentContext.validationStatus, 'not_checked');
   const baseline = await repo.recordedFile('intent.md');
   assert.equal(baseline.view, status.view);
   assert.equal(Buffer.from(baseline.content).toString('utf8'), '# Test intent\n');
  await repo.views.create('api-created', { fromView: status.view });
  assert.ok((await repo.views.list()).views.some((view) => view.name === 'api-created'));
  await repo.views.delete('api-created');
  await repo.views.create('feature', { parent: status.view, scope: proto.ViewScope.VIEW_SCOPE_DRAFT });
  const cliViews = JSON.parse(execFileSync(process.env.ATOMIC_BIN || 'atomic', ['view', 'list', '--all', '--json'], {
    cwd: root, env: { ...process.env, ATOMIC_SERVICE: 'local', ATOMIC_RPC: '0' }, encoding: 'utf8'
  }));
  assert.equal(cliViews.views.find((view) => view.name === 'feature')?.scope, 'draft', 'Fixture must be a real CLI-confirmed Draft');
  assert.equal((await repo.views.list()).views.find((view) => view.name === 'feature')?.scope,
    proto.ViewScope.VIEW_SCOPE_DRAFT, 'Native ListViews must identify the CLI-confirmed Draft before switching or recording');
  await repo.views.switch('feature');
  assert.equal((await repo.views.list()).views.find((view) => view.name === 'feature')?.scope,
    proto.ViewScope.VIEW_SCOPE_DRAFT, 'SwitchView must preserve a Draft scope');
  assert.ok((await repo.views.list()).views.some((view) => view.name === 'feature' && view.current));
   await writeFile(join(root, 'intent.md'), '# Dirty\n');
   assert.equal(Buffer.from((await repo.recordedFile('intent.md')).content).toString('utf8'), '# Test intent\n', 'Diff baseline is recorded graph content, not the dirty working copy');
  await assert.rejects(repo.views.switch(status.view));
  assert.equal((await repo.views.list()).views.find((view) => view.name === 'feature')?.scope,
    proto.ViewScope.VIEW_SCOPE_DRAFT, 'A rejected dirty switch must preserve the source Draft scope');
  await writeFile(join(root, 'intent.md'), '# Test intent\n');
  // A real draft delta: four own records plus the actual parent history. These
  // are the exact scope/history/file fields the observability projection reads.
  await mkdir(join(root, 'src'));
  for (let i = 0; i < 4; i++) {
    const path = `src/draft-${i}.ts`;
    await writeFile(join(root, path), `export const value = ${i};\n`);
    await repo.add([path]);
    const current = await repo.status();
    await repo.record(`Draft work ${i}`, { paths: [path], expected: current.snapshot ? { viewSnapshot: current.snapshot } : { merkleRoot: current.viewMerkle },
      aiAuthorship: { provider: 'openai', model: 'native-recorded-model', tool: 'opencode', inputTokens: 1200, outputTokens: 300,
        requestId: 'shared-native-request', sessionId: 'native-session' } });
  }
  const draft = (await repo.views.list()).views.find((view) => view.name === 'feature');
  const afterRecords = JSON.parse(execFileSync(process.env.ATOMIC_BIN || 'atomic', ['view', 'list', '--all', '--json'], {
    cwd: root, env: { ...process.env, ATOMIC_SERVICE: 'local', ATOMIC_RPC: '0' }, encoding: 'utf8'
  }));
  assert.equal(afterRecords.views.find((view) => view.name === 'feature')?.scope, 'draft', 'Recorded fixture must remain a CLI-confirmed Draft');
  assert.equal(draft.scope, proto.ViewScope.VIEW_SCOPE_DRAFT,
    JSON.stringify({ native: draft, cli: afterRecords.views.find((view) => view.name === 'feature') }));
  assert.equal(Number(draft.ownChangeCount), 4);
  // init may itself record repository files; do not assume the parent has one record.
  assert.equal(Number(draft.inheritedChangeCount), cliViews.views.find((view) => view.name === status.view).change_count);
  const own = await repo.log({ view: 'feature', allViews: false, budget: { maxItems: 30 } });
  assert.equal(own.entries.length, 4);
  for (const entry of own.entries) {
    const evidence = await repo.change({ hash: entry.hash.value }, { includes: { metadata: true }, includeFileContents: true });
    assert.ok(evidence.fileContents.some((file) => file.path?.startsWith('src/draft-')));
    assert.equal(evidence.metadata.schemaVersion, 1);
    assert.deepEqual(Buffer.from(evidence.metadata.changeHash.value), Buffer.from(entry.hash.value));
    assert.equal(evidence.metadata.usage.length, 1);
    assert.equal(evidence.metadata.usage[0].model, 'native-recorded-model');
    assert.equal(evidence.metadata.usage[0].requestId, 'shared-native-request');
    assert.equal(String(evidence.metadata.usage[0].tokens.inputTokens), '1200');
    assert.equal(String(evidence.metadata.usage[0].tokens.outputTokens), '300');
    assert.equal(String(evidence.metadata.usage[0].costMicroUsd), '0');
    assert.ok(evidence.metadata.affectedPaths.some((file) => file.startsWith('src/draft-')));
    assert.ok(evidence.metadata.graphSummary.files.some((file) => file.path.startsWith('src/draft-') && file.symbol && file.info));
  }
  await repo.views.switch(status.view);
  await repo.views.delete('feature');
  assert.ok(!(await repo.views.list()).views.some((view) => view.name === 'feature'));
   console.log('Packaged native checks passed: change-local blast radius, native graph counts and hunk summaries, Draft scope, four own records, affected paths, decoded AI metadata with shared request IDs/recorded zero cost, and dirty-switch guards.');
} finally {
  await rm(root, { recursive: true, force: true });
}
