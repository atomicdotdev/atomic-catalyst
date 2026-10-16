import type { AtomicRepository } from 'nodeatomic' with { 'resolution-mode': 'import' };
import type { ChangeEvidence, DraftIntent, ExplorerEvent, ExplorerState, SignedSnapshot } from '../shared/atomicEvidence';
import { resolveRepositoryPath, summarizeView, type History } from './model';
import { changeEvidence, dependencyGraph, hashHex, intentEvidence } from './evidence';
import { recordedFileDiff, diffBytes, MAX_DIFF_CACHE_BYTES, type RecordedFileDiff } from './fileDiff';
import { intentReferences } from '../shared/changeIntentContext';

type Client = Pick<AtomicRepository, 'status' | 'log' | 'change' | 'views' | 'vault'>;
type Run = <T>(operation: () => Promise<T>) => Promise<T>;
const PAGE_SIZE = 30;
const MAX_HISTORY = 300;

/** Read-only draft projection. Every async boundary is fenced against later navigation. */
export class EvidenceExplorer {
  private generation = 0;
  private state?: ExplorerState;
  private history?: Pick<History, 'entries' | 'nextCursor'>;
  private snapshot?: SignedSnapshot;
  private stale = false;
  private requestedView?: string;
  private detailOnly = false;
  private changes = new Map<string, ChangeEvidence>();
  private intents = new Map<string, DraftIntent>();
  private intentPaths = new Map<string, string>();
  private warnings: string[] = [];
  private diffs = new Map<string, Map<string, RecordedFileDiff>>();
  private diffSize = 0;
  private diffCount = 0;
  private selectedChange?: string;

  constructor(private readonly repository: string, private readonly client: Client, private readonly run: Run,
    private readonly publish: (event: ExplorerEvent) => void, private readonly openSigned: (snapshot: SignedSnapshot) => void) {}

  invalidate(): void { this.generation++; this.snapshot = undefined; this.stale = true; this.clearDiffs(); this.publish({ type: 'invalidated' }); }
  dispose(): void { this.generation++; this.snapshot = undefined; this.stale = true; this.clearDiffs(); }

  private clearDiffs(): void { this.diffs.clear(); this.diffSize = 0; this.diffCount = 0; this.selectedChange = undefined; }
  fileDiff(hash: string, file: string): RecordedFileDiff | undefined {
    return !this.stale && this.selectedChange === hash ? this.diffs.get(hash)?.get(file) : undefined;
  }

  private rememberDiffs(detail: Awaited<ReturnType<Client['change']>>, change: ChangeEvidence): void {
    const files = new Map<string, RecordedFileDiff>();
    const allowed = new Set(change.affectedPaths || []);
    const directories = new Set(change.metadata?.graphSummary?.files.filter((file) => file.symbol.startsWith('📁')).map((file) => file.path));
    for (const file of detail.fileContents || []) {
      if (!file.path || !allowed.has(file.path) || directories.has(file.path) || files.has(file.path)) continue;
      try {
        resolveRepositoryPath(this.repository, file.path);
        const diff = recordedFileDiff(file), bytes = diffBytes(diff);
        if (this.diffSize + bytes > MAX_DIFF_CACHE_BYTES || this.diffCount >= 2000) continue;
        this.diffSize += bytes; this.diffCount++; files.set(file.path, diff);
      } catch { /* Missing, binary, oversized and directory revisions are not fabricated. */ }
    }
    this.diffs.set(change.id, files); change.diffPaths = [...files.keys()];
  }

  /** Host tree navigation is inspected, never a working-copy switch. */
  async inspectView(name: string, detailOnly = false): Promise<void> { this.detailOnly = detailOnly; this.requestedView = name; await this.handle({ action: 'refresh' }); }
  intentFile(id: string): string | undefined { return !this.stale ? this.intentPaths.get(id) : undefined; }

  async inspectHistoryHash(hash: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/.test(hash) || !this.state || this.stale) return;
    const token = ++this.generation;
    this.clearDiffs();
    this.snapshot = undefined;
    this.publish({ type: 'busy', label: 'Reading recorded change…' });
    try {
      await this.run(async () => {
        if (token !== this.generation) return;
        const detail = await this.client.change({ hash: Buffer.from(hash, 'hex') }, { includes: { metadata: true, signatures: true, blastRadius: true }, includeFileContents: true });
        if (token !== this.generation) return;
        const change = changeEvidence(detail, hash); this.rememberDiffs(detail, change);
        this.changes = new Map([[hash, change]]);
        this.intents = new Map(); this.intentPaths = new Map(); this.warnings = [];
        await this.readIntents(token);
        if (token !== this.generation) return;
        this.publish({ type: 'state', state: { ...this.state!, draft: { changes: [...this.changes.values()], intents: [...this.intents.values()], warnings: this.warnings } } });
        this.selectedChange = hash;
        this.publish({ type: 'selection', selection: this.changes.get(hash)! });
      });
    } catch (error) {
      if (token === this.generation) this.publish({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  private async readChanges(entries: History['entries'], token: number): Promise<void> {
    for (const entry of entries) {
      if (token !== this.generation) return;
      const id = hashHex(entry.hash?.value);
      if (!id || entry.isTagged || this.changes.has(id)) continue;
      try {
        const detail = await this.client.change({ hash: Buffer.from(id, 'hex') }, { includes: { metadata: true, signatures: true }, includeFileContents: true });
        if (token !== this.generation) return;
        const change = changeEvidence(detail, id); this.rememberDiffs(detail, change); this.changes.set(id, change);
      } catch (error) {
        if (token !== this.generation) return;
        this.warnings.push(`Change ${id.slice(0, 12)} unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await this.readIntents(token);
  }

  private async readIntents(token: number): Promise<void> {
    const references = [...this.changes.values()].flatMap(intentReferences);
    const ids = [...new Set(references.map((reference) => reference.id))];
    if (ids.length > 30) this.warnings.push('Only the first 30 referenced intents are loaded.');
    for (const id of ids.slice(0, 30)) {
      if (token !== this.generation) return;
      if (this.intents.has(id)) continue;
      try {
        const result = await this.client.vault.getIntent(id);
        if (token !== this.generation) return;
        if (result.entry?.id !== id) throw new Error('Returned intent ID does not match the linked intent');
        let file: string | undefined;
        const sourcePath = references.find((reference) => reference.id === id)?.identity?.path || result.entry.vaultPath;
        if (sourcePath) {
          try { file = resolveRepositoryPath(this.repository, sourcePath); } catch { /* Never turn an unsafe backend path into an editor URI. */ }
        }
        if (file) this.intentPaths.set(id, file);
        this.intents.set(id, { id, title: result.entry.title || id, body: result.entry.body?.slice(0, 2 * 1024 * 1024), canOpenSource: Boolean(file) });
      } catch (error) {
        if (token !== this.generation) return;
        this.intents.set(id, { id, title: id, canOpenSource: false,
          notice: `Linked intent unavailable: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
  }

  private publishDraft(): void {
    if (!this.state || !this.history) return;
    const warnings = [...new Set(this.warnings)];
    const own = this.state.viewInfo?.ownChangeCount;
    if (own != null && own > this.history.entries.length && !this.history.nextCursor) {
      warnings.push(`Loaded ${this.history.entries.length} of ${own} own changes; the backend did not provide a continuation cursor. This is partial coverage.`);
    }
    this.state = { ...this.state, ...dependencyGraph(this.history.entries),
      intents: [...this.intents.values()].map(({ id, title }) => ({ id, title })),
      more: Boolean(this.history.nextCursor) && this.history.entries.length < MAX_HISTORY,
      draft: { changes: [...this.changes.values()], intents: [...this.intents.values()], warnings } };
    this.publish({ type: 'state', state: this.state });
  }

  async handle(message: unknown): Promise<void> {
    if (!message || typeof message !== 'object' || !('action' in message)) return;
    const input = message as Record<string, unknown>, action = input.action;
    if (action === 'openSigned') { if (this.snapshot && !this.stale) this.openSigned({ ...this.snapshot }); return; }
    if (!['ready', 'refresh', 'view', 'more', 'change', 'intent'].includes(String(action))) return;
    if (action === 'view' && (typeof input.view !== 'string' || !this.state?.views.includes(input.view))) return;
    if (action === 'change' && (typeof input.id !== 'string' || !this.changes.has(input.id))) return;
    if (action === 'intent' && (typeof input.id !== 'string' || !this.intents.has(input.id))) return;
    if (this.stale && !['ready', 'refresh', 'view'].includes(String(action))) return;
    if (action === 'more' && this.state?.viewInfo?.scope !== 'draft') return;
    const preferred = action === 'view' ? String(input.view) : this.requestedView ?? this.state?.view;
    this.requestedView = undefined;
    const token = ++this.generation;
    if (['ready', 'refresh', 'view'].includes(String(action))) { this.stale = true; this.clearDiffs(); }
    if (action === 'change' || action === 'more') this.selectedChange = undefined;
    this.snapshot = undefined;
    this.publish({ type: 'busy', label: action === 'intent' ? 'Reading stored attestation…' : 'Reading view overview…' });
    try {
      await this.run(async () => {
        if (token !== this.generation) return;
        if (action === 'ready' || action === 'refresh' || action === 'view') {
          const status = await this.client.status();
          if (token !== this.generation) return;
          const listed = await this.client.views.list();
          if (token !== this.generation) return;
          const summaries = listed.views.map(summarizeView).filter((view) => view.name);
          const view = preferred || status.view;
          const viewInfo = summaries.find((item) => item.name === view);
          if (!viewInfo) throw new Error(`View “${view}” is no longer available. Refresh the left views pane.`);
          this.changes = new Map(); this.intents = new Map(); this.intentPaths = new Map(); this.warnings = []; this.history = undefined;
          this.state = { repository: this.repository, view, views: summaries.map((view) => view.name), viewSummaries: summaries, viewInfo,
            nodes: [], edges: [], intents: [], more: false, workingCopyView: status.view, workingCopyFiles: status.files.length };
          if (viewInfo.scope !== 'draft' || this.detailOnly) {
            this.stale = false;
            this.publish({ type: 'state', state: this.state });
            return; // Shared and unknown views never issue draft history/detail/vault queries.
          }
          const history = await this.client.log({ view, allViews: false, budget: { maxItems: PAGE_SIZE } });
          if (token !== this.generation) return;
          if (history.entries.length > PAGE_SIZE) this.warnings.push('Backend exceeded the requested page size; only the first 30 entries are displayed.');
          this.history = { ...history, entries: history.entries.slice(0, PAGE_SIZE) };
          await this.readChanges(this.history.entries, token);
          if (token !== this.generation) return;
          this.stale = false; this.publishDraft();
        } else if (action === 'more') {
          if (!this.state || !this.history?.nextCursor || this.history.entries.length >= MAX_HISTORY) { this.publishDraft(); return; }
          const limit = Math.min(PAGE_SIZE, MAX_HISTORY - this.history.entries.length);
          const next = await this.client.log({ view: this.state.view, allViews: false, cursor: this.history.nextCursor,
            budget: { maxItems: limit } });
          if (token !== this.generation) return;
          if (next.entries.length > limit) this.warnings.push('Backend exceeded the requested page size; excess entries were not loaded.');
          const entries = next.entries.slice(0, limit);
          this.history.entries.push(...entries); this.history.nextCursor = next.nextCursor;
          await this.readChanges(entries, token);
          if (token === this.generation) this.publishDraft();
        } else if (action === 'change') {
          const selection = this.changes.get(String(input.id));
          if (selection && token === this.generation) { this.selectedChange = selection.id; this.publish({ type: 'selection', selection }); }
        } else if (action === 'intent') {
          const result = intentEvidence(String(input.id), await this.client.vault.getSignedIntent(String(input.id)));
          if (token !== this.generation) return;
          this.snapshot = result.snapshot; this.publish({ type: 'selection', selection: result.selection });
        }
      });
    } catch (error) {
      if (token === this.generation) this.publish({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }
}
