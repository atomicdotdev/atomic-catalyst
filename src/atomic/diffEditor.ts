import { randomUUID } from 'node:crypto';
import * as vscode from 'vscode';
import { displayChangeHash } from '../shared/atomicHash';
import { MAX_DIFF_CACHE_BYTES, type RecordedFileDiff } from './fileDiff';
const MAX_SNAPSHOTS = 256;

/** Immutable read-only documents for vscode.diff; never temp files on disk. */
export class AtomicDiffEditor implements vscode.TextDocumentContentProvider, vscode.Disposable {
  private readonly snapshots = new Map<string, { text: string; bytes: number; pending: boolean }>();
  private registration?: vscode.Disposable;
  private disposed = false;
  private bytes = 0;

  provideTextDocumentContent(uri: vscode.Uri): string {
    const snapshot = this.snapshots.get(uri.toString());
    if (!snapshot) throw new Error('Atomic diff snapshot expired. Open the file diff from Atomic again.');
    return snapshot.text;
  }

  async change(diff: RecordedFileDiff, hash: string): Promise<void> {
    await this.open(diff, `${diff.path} · ${displayChangeHash(hash).slice(0, 12)} (before ↔ after)`, undefined, vscode.ViewColumn.Beside);
  }

  async workingCopy(diff: RecordedFileDiff, view: string, workingFile?: vscode.Uri): Promise<void> {
    await this.open(diff, `${diff.path} · Recorded (${view}) ↔ Working Copy`, workingFile, vscode.ViewColumn.Active);
  }

  private async open(diff: RecordedFileDiff, title: string, workingFile: vscode.Uri | undefined, column: vscode.ViewColumn): Promise<void> {
    if (this.disposed || !vscode.workspace.isTrusted) throw new Error('Trust this workspace before opening an Atomic diff.');
    this.registration ??= vscode.workspace.registerTextDocumentContentProvider('atomic-diff', this);
    const texts = workingFile ? [diff.before] : [diff.before, diff.after];
    const required = texts.reduce((total, text) => total + Buffer.byteLength(text, 'utf8'), 0);
    const open = new Set(vscode.workspace.textDocuments.map((doc) => doc.uri.toString()));
    for (const [id, snapshot] of this.snapshots) {
      if (this.bytes + required <= MAX_DIFF_CACHE_BYTES && this.snapshots.size + texts.length <= MAX_SNAPSHOTS) break;
      if (snapshot.pending || open.has(id)) continue;
      this.snapshots.delete(id); this.bytes -= snapshot.bytes;
    }
    if (this.bytes + required > MAX_DIFF_CACHE_BYTES || this.snapshots.size + texts.length > MAX_SNAPSHOTS) throw new Error('Close some Atomic diffs before opening more (32 MiB / 256 snapshot limit).');
    const token = randomUUID();
    const uris = texts.map((text, index) => {
      const uri = vscode.Uri.from({ scheme: 'atomic-diff', authority: 'snapshot', path: `/${token}/${index === 0 ? 'before' : 'after'}/${diff.path}` });
      const bytes = Buffer.byteLength(text, 'utf8');
      this.snapshots.set(uri.toString(), { text, bytes, pending: true }); this.bytes += bytes;
      return uri;
    });
    try { await vscode.commands.executeCommand('vscode.diff', uris[0], workingFile ?? uris[1], title, { preview: true, viewColumn: column }); }
    finally { uris.forEach((uri) => { const snapshot = this.snapshots.get(uri.toString()); if (snapshot) snapshot.pending = false; }); }
  }

  dispose(): void { this.disposed = true; this.registration?.dispose(); this.snapshots.clear(); this.bytes = 0; }
}
