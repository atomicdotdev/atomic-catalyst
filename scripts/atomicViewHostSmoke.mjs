// Host-module smoke with a VS Code API double; not an Electron/installed-extension test.
// Kept in a separate process so the vscode mock cannot leak into other unit suites.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import { displayChangeHash } from '../src/shared/atomicHash.ts';

const commands = new Map(), panels = [];
let provider;
const disposable = () => ({ dispose() {} });
class EventEmitter { event = () => disposable(); fire() {} dispose() {} }
mock.module('vscode', () => ({
  EventEmitter, ThemeIcon: class { constructor(id) { this.id = id; } }, TreeItemCollapsibleState: { Expanded: 2, Collapsed: 1 }, ViewColumn: { Active: 1, Beside: 2 },
  Uri: { file: (fsPath) => ({ fsPath }), joinPath: (base, ...parts) => ({ fsPath: [base.fsPath, ...parts].join('/') }) },
  commands: { registerCommand: (id, handler) => { commands.set(id, handler); return disposable(); }, executeCommand: async () => {} },
  workspace: { isTrusted: true, workspaceFolders: [], onDidChangeWorkspaceFolders: disposable, onDidGrantWorkspaceTrust: disposable },
  window: {
    createOutputChannel: () => ({ appendLine() {}, show() {}, dispose() {} }),
    registerTreeDataProvider: (_id, value) => { provider = value; return disposable(); }, showErrorMessage: (message) => { throw new Error(message); },
    createWebviewPanel: () => {
       let receive, resolveState, resolveSelection;
      const panel = { title: '', reveal() {}, dispose() {}, onDidDispose: () => disposable(),
        webview: { asWebviewUri: (uri) => uri.fsPath, cspSource: 'vscode-webview:',
          onDidReceiveMessage: (handler) => { receive = handler; return disposable(); },
           postMessage: async (event) => { if (event.type === 'selection') { panel.lastSelection = event.selection; resolveSelection?.(event.selection); } if (event.type === 'state') { panel.lastState = event.state; resolveState?.(event.state); } return true; } },
         receive: (message) => receive(message), waitForSelection: () => new Promise((resolve) => { resolveSelection = resolve; }),
         waitForState: () => new Promise((resolve) => { resolveState = resolve; }) };
      panels.push(panel); return panel;
    }
  }
}));
const { registerAtomicSourceControl } = await import('../src/atomic/sourceControl.ts');
const { RepositorySession } = await import('../src/atomic/model.ts');
registerAtomicSourceControl({ subscriptions: [], extensionUri: { fsPath: '/extension' }, extensionPath: '/extension' });

const calls = [];
const views = { views: [{ name: 'main', scope: 2, current: true, changeCount: 1000 },
  { name: 'draft-feature', scope: 1, changeCount: 1000, ownChangeCount: 0, inheritedChangeCount: 1000, parent: 'main' }] };
const hash = new Uint8Array(32).fill(7), cursor = { token: new Uint8Array([1]) };
const client = { status: async () => ({ view: 'main', files: [] }), views: { list: async () => views,
  switch: async () => { throw new Error('View click must not switch the working copy'); } },
  log: async (options) => { calls.push(options); return options.cursor ? { entries: [] } : { entries: [{ hash: { value: hash }, message: 'Selected change' }], nextCursor: cursor }; },
  change: async () => ({ change: { hash: { value: hash }, message: 'Selected change', authors: [], dependencies: [] }, provenanceLedger: [], provenanceLedgerHashes: [] }), vault: {} };
const session = new RepositorySession('/repository', client); session.status = { view: 'main', files: [] }; session.views = views;
const owner = { session, scm: {}, tracked: {}, untracked: {}, watcher: disposable() };
// Inject one discovered repository into the provider double instead of loading a real addon.
provider.repositories.set('/repository', owner);
const nodes = provider.getChildren()[0].children.find((node) => node.label === 'Views').children;
const shared = nodes.find((node) => node.label === 'main'), draft = nodes.find((node) => node.label === 'draft-feature');
assert.match(shared.description, /^Shared · current/); assert.match(draft.description, /^Draft/);
assert.equal(shared.command.command, 'catalystAtomic.openView');

await commands.get(shared.command.command)(...shared.command.arguments);
assert.equal(panels.length, 1);
const panel = panels[0], first = panel.waitForState();
panel.receive({ action: 'ready' });
assert.equal((await first).viewInfo.scope, 'shared'); assert.equal(calls.length, 0);
const next = panel.waitForState(); await commands.get(draft.command.command)(...draft.command.arguments);
assert.equal((await next).view, 'draft-feature'); assert.equal(panels.length, 1);
assert.equal(panel.lastState.viewInfo.scope, 'draft'); assert.equal(session.status.view, 'main');
assert.deepEqual(calls, []); // View clicks no longer hydrate a dashboard.
assert.equal(shared.collapsibleState, 1);
const rows = await provider.getChildren(shared);
assert.equal(rows[0].label, 'Selected change'); assert.equal(rows[0].description, displayChangeHash(Buffer.from(hash).toString('hex')).slice(0, 12));
assert.deepEqual(rows[0].command.arguments, [owner, hash, 'main']);
const selection = panel.waitForSelection();
await commands.get(rows[0].command.command)(...rows[0].command.arguments);
await selection;
assert.equal(panel.lastSelection.id, Buffer.from(hash).toString('hex'));
assert.equal(panel.lastState.view, 'main'); assert.equal(session.status.view, 'main');
await commands.get(rows[1].command.command)(...rows[1].command.arguments);
assert.deepEqual(calls, [{ view: 'main', allViews: false, budget: { maxItems: 30 } },
  { view: 'main', allViews: false, cursor, budget: { maxItems: 30 } }]);
console.log('View-tree host smoke passed: nested hashes, lazy detail selection, per-view pagination and no working-copy switch.');
