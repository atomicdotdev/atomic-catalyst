// Calls the actual SCM and panel handlers with a VS Code API double. No Electron.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mock } from 'bun:test';

const commands = new Map(), providers = new Map(), diffs = [], errors = [], panels = [];
const disposable = () => ({ dispose() {} });
let tree;
class Uri {
  constructor(scheme, path, authority = '') { this.scheme = scheme; this.path = path; this.fsPath = path; this.authority = authority; }
  static file(path) { return new Uri('file', path); }
  static from({ scheme, path, authority }) { return new Uri(scheme, path, authority); }
  static joinPath(base, ...parts) { return new Uri(base.scheme, join(base.path, ...parts), base.authority); }
  toString() { return JSON.stringify([this.scheme, this.authority, this.path]); }
}
class EventEmitter { event = () => disposable(); fire() {} dispose() {} }
const workspace = { isTrusted: true, workspaceFolders: [], textDocuments: [], onDidChangeWorkspaceFolders: disposable, onDidGrantWorkspaceTrust: disposable,
  registerTextDocumentContentProvider: (scheme, provider) => { providers.set(scheme, provider); return { dispose: () => providers.delete(scheme) }; } };
mock.module('vscode', () => ({
  Uri, EventEmitter, ThemeIcon: class {}, TreeItemCollapsibleState: { Expanded: 2, Collapsed: 1 }, ViewColumn: { Active: 1, Beside: 2 }, workspace,
  commands: { registerCommand: (name, handler) => { commands.set(name, handler); return disposable(); }, executeCommand: async (name, ...args) => {
    assert.equal(name, 'vscode.diff');
    const [left, right, title, options] = args;
    const before = providers.get(left.scheme).provideTextDocumentContent(left);
    const after = right.scheme === 'atomic-diff' ? providers.get(right.scheme).provideTextDocumentContent(right) : undefined;
    diffs.push({ left, right, title, options, before, after });
  } },
  window: { registerTreeDataProvider: (_id, provider) => { tree = provider; return disposable(); },
    createOutputChannel: () => ({ appendLine() {}, show() {}, dispose() {} }), showErrorMessage: async (message) => { errors.push(message); },
    createWebviewPanel: () => {
      let receive, onDispose, resolveSelection;
      const panel = { title: '', reveal() {}, dispose() { onDispose?.(); }, onDidDispose: (handler) => { onDispose = handler; return disposable(); },
        webview: { asWebviewUri: (uri) => uri.toString(), cspSource: 'vscode-webview:', onDidReceiveMessage: (handler) => { receive = handler; return disposable(); },
          postMessage: async (event) => { if (event.type === 'selection') { panel.selection = event.selection; resolveSelection?.(event.selection); } return true; } },
        receive: (message) => receive(message), waitForSelection: () => new Promise((resolve) => { resolveSelection = resolve; }) };
      panels.push(panel); return panel;
    } },
}));
const { registerAtomicSourceControl } = await import('../src/atomic/sourceControl.ts');
const { RepositorySession } = await import('../src/atomic/model.ts');
const base = join(tmpdir(), 'opencode'); await mkdir(base, { recursive: true });
const root = await mkdtemp(join(base, 'atomic-diff-host-'));
const context = { subscriptions: [], extensionUri: Uri.file('/extension'), extensionPath: '/extension' };
try {
  registerAtomicSourceControl(context);
  let status = { view: 'main', files: [{ path: 'modified.ts', status: 1 }] }, viewOverride, missing = false, binary = false;
  const hash = new Uint8Array(32).fill(9), id = Buffer.from(hash).toString('hex');
  const client = { status: async () => viewOverride ? { ...status, view: viewOverride } : status,
    log: async () => ({ entries: [] }), views: { list: async () => ({ views: [{ name: 'main', current: true, scope: 2 }] }) },
    recordedFile: async () => ({ content: missing ? undefined : binary ? new Uint8Array([0]) : Buffer.from('recorded\n'), view: 'main' }),
    change: async () => ({ change: { hash: { value: hash }, message: 'Selected', authors: [], dependencies: [] }, provenanceLedger: [], provenanceLedgerHashes: [],
      fileContents: [{ path: 'modified.ts', before: Buffer.from('historical before\n'), after: Buffer.from('historical after\n') }] }), vault: {} };
  const owner = { session: new RepositorySession(root, client), scm: { inputBox: {}, dispose() {} }, tracked: {}, untracked: {}, watcher: disposable() };
  tree.repositories.set(root, owner);
  const refresh = async (path, state) => { status = { view: 'main', files: [{ path, status: state }] }; await tree.update(owner); return owner.tracked.resourceStates[0]; };
  const click = async (resource) => { const command = resource.command; await commands.get(command.command)(...command.arguments); };
  await writeFile(join(root, 'modified.ts'), 'working\n');
  const modified = await refresh('modified.ts', 1);
  assert.equal(modified.command.command, 'catalystAtomic.openFileDiff');
  await click(modified);
  assert.equal(diffs.at(-1).before, 'recorded\n'); assert.equal(diffs.at(-1).right.scheme, 'file');
  assert.equal(diffs.at(-1).right.fsPath, join(root, 'modified.ts')); assert.match(diffs.at(-1).title, /Recorded \(main\).*Working Copy/);
  assert.equal(await readFile(join(root, 'modified.ts'), 'utf8'), 'working\n');
  await writeFile(join(root, 'added.ts'), 'new\n'); await click(await refresh('added.ts', 4));
  assert.equal(diffs.at(-1).before, ''); assert.equal(diffs.at(-1).right.scheme, 'file');
  await click(await refresh('deleted.ts', 2));
  assert.equal(diffs.at(-1).before, 'recorded\n'); assert.equal(diffs.at(-1).after, ''); assert.equal(diffs.at(-1).right.scheme, 'atomic-diff');
  const count = diffs.length;
  await click(modified); assert.equal(diffs.length, count, 'stale SCM resource cannot open a different baseline');
  const current = await refresh('modified.ts', 1);
  viewOverride = 'other'; await click(current); assert.equal(diffs.length, count); assert.match(errors.pop(), /state changed/); viewOverride = undefined;
  missing = true; await click(current); assert.equal(diffs.length, count); assert.match(errors.pop(), /unavailable/); missing = false;
  binary = true; await click(current); assert.equal(diffs.length, count); assert.match(errors.pop(), /Binary/); binary = false;
  await symlink(join(root, 'modified.ts'), join(root, 'linked.ts'));
  await click(await refresh('linked.ts', 1)); assert.equal(diffs.length, count); assert.match(errors.pop(), /symlink/);
  await refresh('new.ts', 3); assert.equal(owner.untracked.resourceStates[0].command.command, 'vscode.open');
  await refresh('modified.ts', 1);
  await commands.get('catalystAtomic.showChange')(owner, hash, 'main');
  const panel = panels.at(-1), selected = panel.waitForSelection(); panel.receive({ action: 'ready' }); await selected;
  assert.deepEqual(panel.selection.diffPaths, ['modified.ts']);
  panel.receive({ action: 'openDiff', id, path: 'modified.ts' });
  assert.equal(diffs.at(-1).before, 'historical before\n'); assert.equal(diffs.at(-1).after, 'historical after\n');
  assert.equal(diffs.at(-1).left.scheme, 'atomic-diff'); assert.equal(diffs.at(-1).right.scheme, 'atomic-diff');
  assert.equal(diffs.at(-1).options.viewColumn, 2);
  const frozen = diffs.at(-1), historicalCount = diffs.length;
  workspace.isTrusted = false;
  panel.receive({ action: 'openDiff', id, path: 'modified.ts' }); assert.equal(diffs.length, historicalCount);
  await click(owner.tracked.resourceStates[0]); assert.equal(diffs.length, historicalCount); assert.match(errors.pop(), /Trust/);
  workspace.isTrusted = true;
  for (const message of [{ action: 'openDiff', id, path: '../escape' }, { action: 'openDiff', id: 'wrong', path: 'modified.ts' }]) panel.receive(message);
  assert.equal(diffs.length, historicalCount);
  owner.graph.invalidate(); panel.receive({ action: 'openDiff', id, path: 'modified.ts' }); assert.equal(diffs.length, historicalCount);
  assert.equal(providers.get('atomic-diff').provideTextDocumentContent(frozen.right), 'historical after\n', 'already-open snapshots survive navigation/invalidation');
  assert.throws(() => providers.get('atomic-diff').provideTextDocumentContent(Uri.from({ scheme: 'atomic-diff', path: '/forged.ts' })), /expired/);
  workspace.textDocuments = [{ uri: frozen.left }, { uri: frozen.right }];
  for (let i = 0; i < 130; i++) await tree.diffs.change({ path: 'empty.ts', before: '', after: '' }, id);
  assert.ok(tree.diffs.snapshots.size <= 256, 'zero-byte revisions must not bypass the snapshot-count bound');
  assert.equal(providers.get('atomic-diff').provideTextDocumentContent(frozen.right), 'historical after\n', 'open snapshots are not evicted under pressure');
  workspace.textDocuments = [...tree.diffs.snapshots.keys()].map((key) => ({ uri: { toString: () => key } }));
  await assert.rejects(tree.diffs.change({ path: 'empty.ts', before: '', after: '' }, id), /Close some/);
  workspace.textDocuments = [];
  assert.deepEqual(errors, []);
  console.log('Native diff host checks passed: SCM modified/added/deleted, live right pane, immutable historical sides, no writes, view/path/stale guards, binary/missing failures and untracked plain opens.');
} finally {
  try { context.subscriptions.forEach((item) => item.dispose()); }
  finally { await rm(root, { recursive: true, force: true }); }
}
