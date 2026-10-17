import * as path from 'node:path';
import { stat, lstat, realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import * as vscode from 'vscode';
import { RepositorySession, resolveRepositoryPath, statusLabels, summarizeView, viewTreeDescription, type History } from './model';
import { describeAtomicError, type AtomicIssue } from './errors';
import { AtomicGraphPanel } from './graphPanel';
import { displayChangeHash } from '../shared/atomicHash';
import type { AtomicRepository } from 'nodeatomic' with { 'resolution-mode': 'import' };
import { AtomicDiffEditor } from './diffEditor';
import { revisionText } from './fileDiff';
import type { Status } from './model';

type Consumer = { openRepository(root: string): Promise<AtomicRepository> };
type Resource = vscode.SourceControlResourceState & { atomicPath: string; owner: RepositoryUI };
type RepositoryUI = {
  session: RepositorySession;
  scm: vscode.SourceControl;
  tracked: vscode.SourceControlResourceGroup;
  untracked: vscode.SourceControlResourceGroup;
  watcher: vscode.FileSystemWatcher;
  timer?: ReturnType<typeof setTimeout>;
  issue?: AtomicIssue;
  graph?: AtomicGraphPanel;
  viewHistory?: Map<string, History>;
};
type Node = vscode.TreeItem & { owner?: RepositoryUI; children?: Node[]; viewName?: string };

/** Native SCM integration. The webview never receives service access or native code. */
class AtomicSourceControl implements vscode.TreeDataProvider<Node>, vscode.Disposable {
  private readonly changed = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private readonly repositories = new Map<string, RepositoryUI>();
  private readonly disposables: vscode.Disposable[] = [this.changed];
  private consumer?: Promise<Consumer>;
  private disposed = false;
  private connecting = false;
  private message = 'Open a local Atomic repository workspace to see history and views.';
  private discoveryIssue?: AtomicIssue;
  private readonly output = vscode.window.createOutputChannel('Atomic Version Control');
  private readonly diffs = new AtomicDiffEditor();

  constructor(private readonly context: vscode.ExtensionContext) {
    this.disposables.push(this.output, this.diffs,
      vscode.window.registerTreeDataProvider('catalystAtomic.repository', this),
      vscode.workspace.onDidChangeWorkspaceFolders(() => { void this.discover(); }),
      vscode.workspace.onDidGrantWorkspaceTrust(() => { void this.discover(); })
    );
    const command = (name: string, handler: (...args: any[]) => Promise<unknown>) => {
      this.disposables.push(vscode.commands.registerCommand(`catalystAtomic.${name}`, (...args) =>
        handler(...args).catch((error) => this.report(error))));
    };
    command('showOutput', async () => { this.output.show(true); });
    command('refresh', async () => {
      await this.discover();
      // A failure in one repository must not prevent the other repositories from refreshing.
      for (const owner of this.repositories.values()) await this.refresh(owner);
    });
    command('record', async (source?: vscode.SourceControl) => {
      const owner = await this.pick(source);
      if (!owner) return;
      const message = owner.scm.inputBox.value;
      const displayedStatus = owner.session.status;
      if (!displayedStatus) throw new Error('Refresh Atomic status before recording.');
      await owner.session.run(async () => {
        this.requireTrusted();
        if (this.hasDirtyDocuments(owner)) throw new Error('Save or close unsaved files in this repository before recording.');
        await owner.session.record(message, displayedStatus);
        if (owner.scm.inputBox.value === message) owner.scm.inputBox.value = '';
        await this.update(owner);
      });
    });
    command('add', async (resource?: Resource, ...others: Resource[]) => {
      if (!resource || !this.isOwner(resource.owner)) throw new Error('Select an untracked Atomic file to add.');
      const owner = resource.owner;
      const resources = [resource, ...others].filter((item) => item.owner === owner);
      const paths = resources.map((item) => item.atomicPath);
      paths.forEach((file) => resolveRepositoryPath(owner.session.root, file));
      await owner.session.run(async () => {
        this.requireTrusted();
        await owner.session.client.add(paths);
        await this.update(owner);
      });
    });
    command('createView', async (node?: Node) => {
      const owner = node?.owner ?? await this.pick();
      if (!owner) return;
      const name = await vscode.window.showInputBox({ prompt: 'New Atomic view (derived from the current view)',
        validateInput: (value) => value.trim() ? undefined : 'A view name is required' });
      if (!name?.trim()) return;
      await owner.session.run(async () => {
        this.requireTrusted();
        await owner.session.client.views.create(name.trim(), { fromView: owner.session.status!.view });
        await this.update(owner);
      });
    });
    command('switchView', async (node?: Node) => {
      const owner = node?.owner ?? await this.pick();
      if (!owner) return;
      const name = await vscode.window.showQuickPick((owner.session.views?.views ?? [])
        .filter((view) => !view.current).map((view) => view.name!), { placeHolder: 'Switch Atomic view' });
      if (!name) return;
      await owner.session.run(async () => {
        this.requireTrusted();
        if (this.hasDirtyDocuments(owner)) throw new Error('Save or close unsaved files before switching views.');
        // Never bypass Atomic's dirty-working-copy check.
        await owner.session.client.views.switch(name);
        await this.update(owner);
      });
    });
    command('deleteView', async (node?: Node) => {
      const owner = node?.owner ?? await this.pick();
      if (!owner) return;
      const name = await vscode.window.showQuickPick((owner.session.views?.views ?? [])
        .filter((view) => !view.current).map((view) => view.name!), { placeHolder: 'Delete an inactive Atomic view' });
      if (!name || await vscode.window.showWarningMessage(`Delete Atomic view “${name}”?`,
        { modal: true }, 'Delete View') !== 'Delete View') return;
      await owner.session.run(async () => {
        this.requireTrusted();
        await owner.session.client.views.delete(name);
        await this.update(owner);
      });
    });
    command('openGraph', async (node?: Node) => {
      const owner = node?.owner ?? await this.pick();
      if (owner) this.openGraph(owner, undefined, node?.viewName);
    });
    command('openView', async (node?: Node) => {
      const owner = node?.owner;
      if (!owner || !this.isOwner(owner) || !owner.session.views?.views.some((view) => view.name === node?.viewName)) return;
      this.openGraph(owner, undefined, node!.viewName);
    });
    command('showChange', async (owner: RepositoryUI, hash: Uint8Array, viewName?: string) => {
      if (this.isOwner(owner)) this.openGraph(owner, hash, viewName);
    });
    command('openFileDiff', async (owner: RepositoryUI, file: string, displayed: Status) => {
      this.requireTrusted();
      if (!this.isOwner(owner) || owner.session.status !== displayed || typeof file !== 'string') return;
      const listed = displayed.files.find((entry) => entry.path === file);
      if (!listed || ![1, 2, 4, 5].includes(listed.status ?? 0)) return;
      const absolute = resolveRepositoryPath(owner.session.root, file);
      await owner.session.run(async () => {
        this.requireTrusted();
        if (!this.isOwner(owner) || owner.session.status !== displayed) return;
        const current = await owner.session.client.status();
        if (!this.isOwner(owner) || owner.session.status !== displayed) return;
        if (current.view !== displayed.view || current.files.find((entry) => entry.path === file)?.status !== listed.status) {
          throw new Error('Repository/file state changed. Refresh Atomic before opening this diff.');
        }
        let before = '';
        if (listed.status !== 4) {
          const recorded = await owner.session.client.recordedFile(file);
          if (recorded.view !== current.view) throw new Error('Recorded view changed or is unavailable. Refresh Atomic and check the native addon.');
          before = revisionText(recorded.content);
        }
        let workingFile: vscode.Uri | undefined;
        if (listed.status !== 2) {
          const info = await lstat(absolute);
          if (!info.isFile() || info.isSymbolicLink()) throw new Error('Atomic text diffs require a regular file; directories and symlink targets are not opened.');
          const [canonicalRoot, canonicalFile] = await Promise.all([realpath(owner.session.root), realpath(absolute)]);
          resolveRepositoryPath(canonicalRoot, path.relative(canonicalRoot, canonicalFile));
          workingFile = vscode.Uri.file(absolute);
        }
        this.requireTrusted();
        if (!this.isOwner(owner) || owner.session.status !== displayed) return;
        await this.diffs.workingCopy({ path: file, before, after: '' }, current.view, workingFile);
      });
    });
    command('moreHistory', async (owner: RepositoryUI, viewName?: string) => {
      if (!this.isOwner(owner)) return;
      await owner.session.run(async () => {
        const history = viewName ? owner.viewHistory?.get(viewName) : owner.session.history;
        if (!history?.nextCursor) return;
        const next = await owner.session.client.log({ view: viewName ?? owner.session.status!.view, allViews: false,
          cursor: history.nextCursor, budget: { maxItems: 30 } });
        history.entries.push(...next.entries);
        history.nextCursor = next.nextCursor;
        this.changed.fire(undefined);
      });
    });
    void this.discover();
  }

  private openGraph(owner: RepositoryUI, hash?: Uint8Array, viewName?: string): void {
    this.requireTrusted();
    if (!this.isOwner(owner)) return;
    owner.graph ??= new AtomicGraphPanel(this.context, owner.session, () => this.isOwner(owner), () => { owner.graph = undefined; }, this.diffs);
    owner.graph.reveal(hash, viewName ?? owner.session.status?.view);
  }

  private requireTrusted(): void {
    if (!vscode.workspace.isTrusted) throw new Error('Trust this workspace before using Atomic version control.');
    if (this.disposed) throw new Error('Atomic version control is closed.');
  }

  private isOwner(owner: RepositoryUI): boolean {
    return !this.disposed && this.repositories.get(owner?.session.root) === owner;
  }

  private loadConsumer(): Promise<Consumer> {
    // Keep import() native in the CommonJS extension bundle. The JS consumer
    // discovers the separately installed Atomic library lazily on first use.
    const url = pathToFileURL(path.join(this.context.extensionPath, 'dist', 'nodeatomic', 'index.mjs')).href;
    return this.consumer ??= import(url).catch((error) => {
      this.consumer = undefined;
      throw new Error(`Cannot load the packaged nodeatomic JavaScript consumer: ${String(error)}. Reinstall the extension; native runtime installation is handled separately.`);
    });
  }

  private async discover(): Promise<void> {
    if (this.disposed || this.connecting) return;
    if (!vscode.workspace.isTrusted) {
      this.message = 'Trust this workspace to enable Atomic version control.';
      this.changed.fire(undefined);
      return;
    }
    this.connecting = true;
    this.discoveryIssue = undefined;
    this.message = 'Open a local Atomic repository workspace to see history and views.';
    try {
      const roots = new Set<string>();
      for (const folder of vscode.workspace.workspaceFolders ?? []) {
        if (folder.uri.scheme !== 'file') continue;
        let root = folder.uri.fsPath;
        while (true) {
          if (await stat(path.join(root, '.atomic')).then((s) => s.isDirectory(), () => false)) {
            roots.add(root);
            break;
          }
          const parent = path.dirname(root);
          if (parent === root) break;
          root = parent;
        }
      }
      if (this.disposed) return;
      for (const [root, owner] of this.repositories) {
        if (!roots.has(root)) { this.disposeRepository(owner); this.repositories.delete(root); }
      }
      for (const root of roots) {
        if (this.repositories.has(root)) continue;
        try {
          const client = await (await this.loadConsumer()).openRepository(root);
          if (this.disposed) return;
          const resolvedRoot = client.workspace?.rootPath || root;
          if (this.repositories.has(resolvedRoot)) continue;
          const scm = vscode.scm.createSourceControl('atomic', `Atomic: ${path.basename(resolvedRoot)}`, vscode.Uri.file(resolvedRoot));
          scm.inputBox.placeholder = 'Message for recorded change (tracked changes only)';
          scm.acceptInputCommand = { command: 'catalystAtomic.record', title: 'Record Change', arguments: [scm] };
          const tracked = scm.createResourceGroup('tracked', 'Tracked Changes');
          const untracked = scm.createResourceGroup('untracked', 'Untracked Files');
          const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(resolvedRoot, '**/*'));
          const owner: RepositoryUI = { session: new RepositorySession(resolvedRoot, client), scm, tracked, untracked, watcher };
          this.repositories.set(resolvedRoot, owner);
          const schedule = (uri: vscode.Uri) => {
            const relative = path.relative(resolvedRoot, uri.fsPath);
            if (/(^|[/\\])(node_modules|\.git)([/\\]|$)/.test(relative)) return;
            if (owner.timer) clearTimeout(owner.timer);
            owner.timer = setTimeout(() => { void this.refresh(owner); }, 600);
          };
          this.disposables.push(watcher.onDidChange(schedule), watcher.onDidCreate(schedule), watcher.onDidDelete(schedule));
          await this.refresh(owner);
        } catch (error) {
          this.discoveryIssue = describeAtomicError(error);
          this.message = this.discoveryIssue.title;
          this.output.appendLine(`${root}: ${this.discoveryIssue.detail}\n${this.discoveryIssue.recovery}`);
        }
      }
    } finally {
      this.connecting = false;
      this.changed.fire(undefined);
    }
  }

  private async refresh(owner: RepositoryUI): Promise<void> {
    if (!this.isOwner(owner)) return;
    try { await owner.session.run(() => this.update(owner)); }
    catch (error) {
      if (!this.isOwner(owner)) return;
      owner.tracked.resourceStates = [];
      owner.untracked.resourceStates = [];
      owner.scm.count = 0;
      owner.issue = describeAtomicError(error);
      owner.scm.inputBox.enabled = false;
      owner.scm.statusBarCommands = [{ command: 'catalystAtomic.showOutput', title: `$(warning) ${owner.issue.title}`,
        tooltip: `${owner.issue.detail}\n\n${owner.issue.recovery}` }];
      owner.session.status = undefined;
      owner.session.history = undefined;
      owner.session.views = undefined;
      owner.graph?.invalidate();
      this.output.appendLine(`Refresh ${owner.session.root}: ${owner.issue.detail}\n${owner.issue.recovery}`);
      this.changed.fire(undefined);
    }
  }

  private async update(owner: RepositoryUI): Promise<void> {
    if (!this.isOwner(owner)) return;
    await owner.session.refresh();
    if (!this.isOwner(owner)) return;
    const status = owner.session.status!;
    owner.issue = undefined;
    owner.scm.inputBox.enabled = true;
    const resources: Resource[] = status.files.map((file) => {
      const uri = vscode.Uri.file(resolveRepositoryPath(owner.session.root, file.path!));
      const label = statusLabels[file.status ?? 0] ?? 'Unknown';
      return { resourceUri: uri, atomicPath: file.path!, owner,
        contextValue: file.status === 3 ? 'atomicUntracked' : 'atomicTracked',
        command: file.status === 3 ? { command: 'vscode.open', title: 'Open Untracked File', arguments: [uri] }
          : { command: 'catalystAtomic.openFileDiff', title: 'Open File Diff', arguments: [owner, file.path!, status] },
        decorations: { tooltip: `${label}${file.details ? `: ${file.details}` : ''}`, strikeThrough: file.status === 2,
          iconPath: new vscode.ThemeIcon(file.status === 3 || file.status === 4 ? 'diff-added'
            : file.status === 2 ? 'diff-removed' : file.status === 5 ? 'warning' : 'diff-modified') } };
    });
    owner.tracked.resourceStates = resources.filter((file) => file.contextValue !== 'atomicUntracked');
    owner.untracked.resourceStates = resources.filter((file) => file.contextValue === 'atomicUntracked');
    owner.scm.count = resources.length;
    owner.scm.statusBarCommands = [{ command: 'catalystAtomic.switchView', title: `$(versions) Atomic: ${status.view}`,
      arguments: [{ owner }], tooltip: status.needsReindex ? 'Atomic index needs reindexing; automatic reindex is not supported.' : 'Switch Atomic view' }];
    owner.graph?.invalidate();
    owner.viewHistory = undefined;
    this.changed.fire(undefined);
  }

  private hasDirtyDocuments(owner: RepositoryUI): boolean {
    const inRepository = (uri: vscode.Uri): boolean => {
      if (uri.scheme !== 'file') return false;
      try {
        resolveRepositoryPath(owner.session.root, path.relative(owner.session.root, uri.fsPath));
        return true;
      } catch { return false; }
    };
    if (vscode.workspace.textDocuments.some((doc) => doc.isDirty && inRepository(doc.uri))) return true;
    // File-backed custom documents can remain dirty after VS Code closes their backing TextDocument.
    return vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => {
      const input = tab.input;
      return tab.isDirty && (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) && inRepository(input.uri);
    }));
  }

  private async pick(source?: vscode.SourceControl): Promise<RepositoryUI | undefined> {
    const owners = [...this.repositories.values()];
    if (source) return owners.find((owner) => owner.scm === source);
    if (owners.length === 1) return owners[0];
    const item = await vscode.window.showQuickPick(owners.map((owner) => ({ label: path.basename(owner.session.root),
      description: owner.session.root, owner })), { placeHolder: 'Select Atomic repository' });
    return item?.owner;
  }

  getTreeItem(node: Node): vscode.TreeItem { return node; }

  getChildren(node?: Node): Node[] | Promise<Node[]> {
    if (node?.owner && node.viewName) return this.viewChanges(node.owner, node.viewName);
    if (node) return node.children ?? [];
    if (!this.repositories.size) {
      const issue = this.discoveryIssue;
      return [{ label: this.message, tooltip: issue ? `${issue.detail}\n\n${issue.recovery}` : this.message,
        ...(issue ? { iconPath: new vscode.ThemeIcon('warning'), command: { command: 'catalystAtomic.showOutput', title: 'Show Recovery Guidance' } } : {}) }];
    }
    return [...this.repositories.values()].map((owner) => {
      const status = owner.session.status;
      if (owner.issue) {
        const issue = owner.issue;
        return { label: path.basename(owner.session.root), description: issue.title,
          tooltip: `${owner.session.root}\n\n${issue.detail}\n\n${issue.recovery}`, owner,
          iconPath: new vscode.ThemeIcon('warning'), collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          children: [
            { label: issue.title, tooltip: issue.detail, command: { command: 'catalystAtomic.showOutput', title: 'Show Backend Error' } },
            { label: issue.requiresUpgrade ? 'Back up, then run atomic doctor repair-native-indexes' : 'Show recovery guidance',
              tooltip: issue.recovery, command: { command: 'catalystAtomic.showOutput', title: 'Show Recovery Guidance' } },
            { label: 'Refresh after resolving the error', command: { command: 'catalystAtomic.refresh', title: 'Refresh' } }
          ] };
      }
      return { label: path.basename(owner.session.root), description: status?.view ?? 'Unavailable — refresh to retry',
        tooltip: owner.session.root, owner, contextValue: 'atomicRepository', collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: [
          { label: 'Views', collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
             children: (owner.session.views?.views ?? []).map((view) => {
               const info = summarizeView(view);
                return { label: info.name, owner, viewName: info.name, description: viewTreeDescription(view),
                  collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                 contextValue: info.scope === 'draft' ? 'atomicDraftView' : info.scope === 'shared' ? 'atomicSharedView' : 'atomicUnknownView',
                 iconPath: new vscode.ThemeIcon(info.scope === 'draft' ? 'edit' : info.scope === 'shared' ? 'organization' : 'question'),
                 tooltip: `${viewTreeDescription(view)}${info.parent ? `\nParent: ${info.parent}` : ''}\nClick to inspect; this does not switch the working copy.`,
                  command: { command: 'catalystAtomic.openView', title: 'Inspect View Changes', arguments: [{ owner, viewName: info.name }] } };
             }) }
        ] };
    });
  }

  private async viewChanges(owner: RepositoryUI, view: string): Promise<Node[]> {
    if (!this.isOwner(owner) || !owner.session.views?.views.some((item) => item.name === view)) return [];
    return owner.session.run(async () => {
      this.requireTrusted();
      if (!this.isOwner(owner)) return [];
      const cache = owner.viewHistory ??= new Map<string, History>();
      let history = cache.get(view);
      if (!history) {
        history = await owner.session.client.log({ view, allViews: false, budget: { maxItems: 30 } });
        if (!this.isOwner(owner)) return [];
        cache.set(view, history);
      }
      const rows: Node[] = history.entries.filter((entry) => !entry.isTagged && entry.hash?.value?.length === 32).map((entry) => {
        const hash = entry.hash!.value!;
        const id = displayChangeHash(Buffer.from(hash).toString('hex'));
        return { label: id.slice(0, 12), description: entry.message || '(no message)',
          tooltip: `${id}\n${entry.message || ''}`, iconPath: new vscode.ThemeIcon('git-commit'),
          command: { command: 'catalystAtomic.showChange', title: 'Show Change', arguments: [owner, hash, view] } };
      });
      if (history.nextCursor) rows.push({ label: 'Load more changes…',
        command: { command: 'catalystAtomic.moreHistory', title: 'Load More', arguments: [owner, view] } });
      if (!rows.length) rows.push({ label: 'No changes in this view' });
      return rows;
    });
  }

  private report(error: unknown): void {
    this.output.appendLine(String(error));
    void vscode.window.showErrorMessage(`Atomic: ${error instanceof Error ? error.message : String(error)}`);
  }

  private disposeRepository(owner: RepositoryUI): void {
    if (owner.timer) clearTimeout(owner.timer);
    owner.watcher.dispose();
    owner.graph?.dispose();
    owner.scm.dispose();
  }

  dispose(): void {
    this.disposed = true;
    for (const owner of this.repositories.values()) this.disposeRepository(owner);
    this.repositories.clear();
    this.disposables.forEach((item) => item.dispose());
  }
}

export function registerAtomicSourceControl(context: vscode.ExtensionContext): void {
  context.subscriptions.push(new AtomicSourceControl(context));
}
