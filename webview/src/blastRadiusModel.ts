import type { BlastRadius, ChangeEvidence } from '../../src/shared/atomicEvidence';

/** Pure projections of a change's structural impact; no DOM, no mutation of inputs. */
export type ImpactFile = BlastRadius['files'][number];
export type ImpactEdge = BlastRadius['edges'][number];
export type ImpactMode = BlastRadius['mode'];
export type CellSelection = { module: string; hop: 1 | 2 };

const ROOT_MODULE = '(root)';

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** First path segment; top-level files share one module instead of each becoming a matrix row. */
export function moduleOf(path: string): string {
  const parts = path.replace(/^\.\//, '').split('/');
  return parts.length > 1 && parts[0] ? parts[0] : ROOT_MODULE;
}

export function groupByModule(files: readonly ImpactFile[]): [string, readonly ImpactFile[]][] {
  const groups = files.reduce((map, file) => {
    const module = moduleOf(file.path);
    return map.set(module, [...(map.get(module) ?? []), file]);
  }, new Map<string, readonly ImpactFile[]>());
  return [...groups].sort(([a, af], [b, bf]) => bf.length - af.length || a.localeCompare(b));
}

/** Distinct callers/importers per edited file. */
export function dependentCounts(edges: readonly ImpactEdge[]): ReadonlyMap<string, number> {
  const sources = edges.reduce((map, edge) => map.set(edge.toPath, new Set([...(map.get(edge.toPath) ?? []), edge.fromPath])), new Map<string, Set<string>>());
  return new Map([...sources].map(([path, set]) => [path, set.size]));
}

export function reasonsFor(path: string, edges: readonly ImpactEdge[]): string[] {
  return edges.filter((edge) => edge.fromPath === path).map((edge) => `${edge.relation === 'CALLS' ? 'calls' : 'includes'} ${edge.toPath}`);
}

/** "2 dependents" for an edited file, or nothing when no caller/importer was recorded. */
export function dependentNote(path: string, edges: readonly ImpactEdge[]): string {
  const count = dependentCounts(edges).get(path) ?? 0;
  return count ? plural(count, 'dependent') : '';
}

/** Full reason for a narrowed list, where the group heading no longer says the file was edited. */
export function describeEdited(path: string, edges: readonly ImpactEdge[]): string {
  return ['edited directly', dependentNote(path, edges)].filter(Boolean).join(' · ');
}

const coverageSuffix = (mode: ImpactMode) => (mode === 'partial' ? ' · partial coverage' : '');

/** One honest sentence: unknown or partial analysis is never presented as zero impact. */
export function summarize(files: readonly ImpactFile[], mode: ImpactMode): string {
  const edited = files.filter((file) => file.hop === 1).length;
  const dependents = files.filter((file) => file.hop === 2);
  const head = `${plural(edited, 'file')} edited`;
  if (mode === 'unavailable') return `${head} · dependents unknown`;
  if (!dependents.length) return `${head} · no dependents found${coverageSuffix(mode)}`;
  const modules = new Set(dependents.map((file) => moduleOf(file.path))).size;
  return `${head} · ${plural(dependents.length, 'dependent')} in ${plural(modules, 'module')}${coverageSuffix(mode)}`;
}

export function dependentsHeading(count: number, mode: ImpactMode): string {
  const base = 'Callers & importers';
  if (mode === 'unavailable') return `${base} · unknown`;
  if (!count) return `${base} · none found${coverageSuffix(mode)}`;
  return `${base} · ${count}`;
}

export function filterFiles(files: readonly ImpactFile[], selection?: CellSelection): readonly ImpactFile[] {
  if (!selection) return files;
  return files.filter((file) => file.hop === selection.hop && moduleOf(file.path) === selection.module);
}

/** The +/~/- symbol the native graph summary recorded for a path, if any. */
export function symbolFor(change: Pick<ChangeEvidence, 'metadata'>, path: string): string {
  return change.metadata?.graphSummary?.files.find((file) => file.path === path)?.symbol ?? '';
}
