import * as path from 'node:path';
import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import { EvidenceExplorer } from './evidenceExplorer';
import type { RepositorySession } from './model';
import { signedSnapshotHtml } from './evidenceHtml';
import { displayChangeHash } from '../shared/atomicHash';
import type { AtomicDiffEditor } from './diffEditor';

export class AtomicGraphPanel implements vscode.Disposable {
  private readonly panel: vscode.WebviewPanel;
  private readonly explorer: EvidenceExplorer;
  private readonly subscriptions: vscode.Disposable[] = [];
  private pendingHash?: string;
  private pendingView?: string;
  private ready = false;

  constructor(context: vscode.ExtensionContext, session: RepositorySession,
    private readonly isValid: () => boolean, onClosed: () => void, diffs: AtomicDiffEditor) {
    const resources = vscode.Uri.joinPath(context.extensionUri, 'dist');
    this.panel = vscode.window.createWebviewPanel('catalystAtomic.graph', `Atomic Changes: ${path.basename(session.root)}`,
      vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [resources] });
    const webview = this.panel.webview;
    const nonce = randomBytes(24).toString('hex');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(resources, 'atomic-graph.js'));
    const style = webview.asWebviewUri(vscode.Uri.joinPath(resources, 'atomic-graph.css'));
    webview.html = `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; base-uri 'none'; form-action 'none'"><link rel="stylesheet" href="${style}"><title>Atomic View Overview</title></head><body><div id="atomic-graph"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
    this.explorer = new EvidenceExplorer(session.root, session.client, (operation) => session.run(operation),
      (event) => {
        if (!this.isValid()) return;
        void webview.postMessage(event);
        if (event.type === 'state') this.panel.title = `Atomic Changes: ${event.state.view}`;
        if (event.type === 'selection' && event.selection.kind === 'change') this.panel.title = `Atomic Change: ${displayChangeHash(event.selection.id).slice(0, 12)}`;
        if (event.type === 'state' && this.pendingHash) {
          const hash = this.pendingHash;
          this.pendingHash = undefined;
          void this.explorer.inspectHistoryHash(hash);
        }
      }, (snapshot) => {
        if (!this.isValid() || !vscode.workspace.isTrusted) return;
        const viewer = vscode.window.createWebviewPanel('catalystAtomic.signedIntent', `Signed Intent: ${snapshot.intentId}`,
          vscode.ViewColumn.Beside, { enableScripts: false, enableCommandUris: false, localResourceRoots: [] });
        viewer.webview.html = signedSnapshotHtml(snapshot);
      });
    this.subscriptions.push(webview.onDidReceiveMessage((message) => {
      if (this.isValid() && vscode.workspace.isTrusted) {
        if (message?.action === 'ready') { this.ready = true; void this.navigate(); }
        else if (message?.action === 'openIntent' && typeof message.id === 'string') {
          const file = this.explorer.intentFile(message.id);
          if (file) void vscode.commands.executeCommand('catalystIntent.open', vscode.Uri.file(file));
        } else if (message?.action === 'openDiff' && typeof message.id === 'string' && typeof message.path === 'string') {
          const diff = this.explorer.fileDiff(message.id, message.path);
          if (diff) void diffs.change(diff, message.id).catch((error) => vscode.window.showErrorMessage(`Atomic: ${String(error)}`));
        } else {
          void this.explorer.handle(message);
        }
      }
    }), this.panel.onDidDispose(() => {
      this.explorer.dispose();
      this.subscriptions.forEach((subscription) => subscription.dispose());
      onClosed();
    }));
  }

  private async navigate(): Promise<void> {
    const view = this.pendingView;
    this.pendingView = undefined;
    if (view) await this.explorer.inspectView(view, true);
    else await this.explorer.handle({ action: 'ready' });
  }

  reveal(hash?: Uint8Array, viewName?: string): void {
    this.panel.reveal();
    this.pendingView = viewName;
    this.pendingHash = undefined;
    if (hash?.length === 32) {
      this.pendingHash = Buffer.from(hash).toString('hex');
    }
    if (this.ready) void this.navigate();
  }

  invalidate(): void { this.explorer.invalidate(); }
  dispose(): void { this.panel.dispose(); }
}
