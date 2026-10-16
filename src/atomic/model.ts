import * as path from 'node:path';
import type { AtomicRepository } from 'nodeatomic' with { 'resolution-mode': 'import' };
import type { ViewSummary } from '../shared/atomicEvidence';

export type RepositoryClient = Pick<AtomicRepository, 'status' | 'add' | 'record' | 'log' | 'change' | 'views' | 'vault' | 'recordedFile'>;
export type Status = Awaited<ReturnType<RepositoryClient['status']>>;
export type History = Awaited<ReturnType<RepositoryClient['log']>>;
export type Views = Awaited<ReturnType<RepositoryClient['views']['list']>>;

/** ViewScope's generated wire values: 1 Draft, 2 Shared; never infer from a name. */
export function summarizeView(view: Views['views'][number]): ViewSummary {
  const count = (value: unknown) => {
    if (value == null) return undefined;
    const number = Number(String(value));
    return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
  };
  return { name: view.name || '', scope: view.scope === 1 ? 'draft' : view.scope === 2 ? 'shared' : 'unknown',
    current: Boolean(view.current), parent: view.parent || undefined, changeCount: count(view.changeCount),
    ownChangeCount: count(view.ownChangeCount), inheritedChangeCount: count(view.inheritedChangeCount) };
}

export function viewTreeDescription(view: Views['views'][number]): string {
  const info = summarizeView(view);
  const counts = info.scope === 'draft' && info.ownChangeCount != null
    ? `${info.ownChangeCount} own changes${info.inheritedChangeCount ? ` · ${info.inheritedChangeCount} inherited` : ''}`
    : `${info.changeCount ?? '?'} changes`;
  return `${info.scope === 'draft' ? 'Draft' : info.scope === 'shared' ? 'Shared' : 'Unknown scope'}${info.current ? ' · current' : ''} · ${counts}`;
}

/** Backend paths must stay inside the resolved workspace before becoming editor URIs. */
export function resolveRepositoryPath(root: string, file: string): string {
  if (!file || path.isAbsolute(file)) throw new Error('Invalid repository-relative path');
  const resolved = path.resolve(root, file);
  const relative = path.relative(root, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Repository path escapes the workspace');
  }
  return resolved;
}

export const statusLabels: Record<number, string> = {
  0: 'Unknown', 1: 'Modified', 2: 'Deleted', 3: 'Untracked', 4: 'Added', 5: 'Conflicted'
};

/** Serialize reads and mutations so an older refresh cannot overwrite a mutation result. */
export class RepositorySession {
  private pending: Promise<unknown> = Promise.resolve();
  status?: Status;
  history?: History;
  views?: Views;

  constructor(readonly root: string, readonly client: RepositoryClient) {}

  run<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation);
    this.pending = next.catch(() => undefined);
    return next;
  }

  async refresh(): Promise<void> {
    const status = await this.client.status();
    const history = await this.client.log({ view: status.view, budget: { maxItems: 30 } });
    const views = await this.client.views.list();
    this.status = status;
    this.history = history;
    this.views = views;
  }

  async record(message: string, status = this.status): Promise<void> {
    if (!message.trim()) throw new Error('Enter a message before recording.');
    // Keep the fence from the status the user reviewed, rather than silently refreshing it.
    if (!status) throw new Error('Refresh Atomic status before recording.');
    const paths = status.files.filter((f) => f.status !== 3).map((f) => f.path!);
    if (!paths.length) throw new Error('No tracked changes to record. Add untracked files first.');
    paths.forEach((file) => resolveRepositoryPath(this.root, file));
    if (!status.snapshot && !status.viewMerkle) {
      throw new Error('Atomic returned no concurrency fence; refresh before recording.');
    }
    await this.client.record(message, {
      paths,
      expected: status.snapshot ? { viewSnapshot: status.snapshot } : { merkleRoot: status.viewMerkle }
    });
  }
}
