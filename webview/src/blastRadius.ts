import type { ChangeEvidence } from '../../src/shared/atomicEvidence';
import { displayChangeHash } from '../../src/shared/atomicHash';
import { mountDependencyGraph, type DependencyGraph } from './atomicDependencyGraph';
import { renderFileList, type ListSelection } from './blastRadiusList';
import { type CellSelection, type ImpactEdge, type ImpactFile, type ImpactMode, filterFiles, groupByModule, summarize } from './blastRadiusModel';

const GRAPH_NODE_LIMIT = 100;
const MODE_TEXT: Record<ImpactMode, string> = { structural: 'structural (KG)', private: 'structural · private change',
  partial: 'structural · partial coverage', unavailable: 'direct files only · structural analysis unavailable' };

type Make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => HTMLElementTagNameMap[K];
const maker = (doc: Document): Make => (tag, text, className) => {
  const item = doc.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;
};

/** Noname's module × hop matrix, scoped only to the selected change, beside an always-visible file list the matrix narrows. */
export function mountBlastRadius(parent: HTMLElement, change: ChangeEvidence, active: () => boolean, openDiff?: (path: string) => void) {
  const doc = parent.ownerDocument, el = maker(doc);
  let disposed = false, graph: DependencyGraph | undefined, selected: CellSelection | undefined;
  const live = () => !disposed && active();
  const impact = change.blastRadius;
  const known = impact && impact.mode !== 'unavailable';
  const mode: ImpactMode = known ? impact.mode : 'unavailable';
  const files: readonly ImpactFile[] = known ? impact.files : [...new Set(change.affectedPaths || [])].map((path) => ({ path, hop: 1 as const }));
  const edges = impact?.edges ?? [];
  const hops = files.some((file) => file.hop === 2) ? [1, 2] as const : [1] as const;

  const panel = el('section', undefined, 'blast-radius'); panel.setAttribute('aria-label', 'Blast radius for selected change');
  const header = el('header', undefined, 'blast-header');
  const titleRow = el('div', undefined, 'blast-title-row');
  const title = el('h2'); title.append(el('span', '◆', 'blast-diamond'), doc.createTextNode(' BLAST RADIUS'));
  const modeLabel = el('span', MODE_TEXT[mode], 'blast-mode'); modeLabel.title = impact?.context || 'No structural result was returned by this native addon.';
  titleRow.append(title, modeLabel);
  const notes = el('details', undefined, 'blast-notes'); notes.append(el('summary', 'Analysis coverage'));
  notes.append(el('p', impact?.context || 'Direct paths from the recorded change. No structural result was returned by this native addon.'));
  for (const warning of impact?.warnings || []) notes.append(el('p', warning));
  header.append(titleRow, el('p', summarize(files, mode), 'blast-summary'), notes);

  const body = el('div', undefined, 'blast-body');
  const matrix = el('div', undefined, 'blast-matrix');
  const drill = el('section', undefined, 'blast-drill'); drill.setAttribute('aria-live', 'polite'); drill.setAttribute('aria-label', 'Affected files');
  const controls: HTMLButtonElement[] = [];
  const listContext = { change, files, edges, mode, openDiff, live };
  function show(selection?: ListSelection & { cell?: CellSelection }, button?: HTMLButtonElement) {
    selected = selection?.cell;
    controls.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    matrix.dataset.filtered = String(Boolean(selection?.cell));
    renderFileList(drill, listContext, selection, () => show());
  }
  matrix.append(buildMatrix(el, groupByModule(files), hops, (cell, button) => {
    if (!live()) return;
    const same = selected?.module === cell.module && selected?.hop === cell.hop;
    same ? show() : show({ title: `${cell.module} · hop ${cell.hop}`, files: filterFiles(files, cell), cell }, button);
  }, controls));
  if (!files.length) matrix.append(el('p', known ? 'No affected paths returned for this change.' : 'Direct paths unavailable; this is not proof of zero impact.', 'blast-note'));
  matrix.append(buildLegend(el, hops.length > 1));
  body.append(matrix, drill);
  show();

  const footer = el('div', undefined, 'blast-footer');
  const graphArea = el('div', undefined, 'blast-graph'); graphArea.hidden = true;
  const open = el('button', 'Open in change graph →', 'blast-graph-toggle'); open.type = 'button'; open.setAttribute('aria-expanded', 'false');
  open.addEventListener('click', () => {
    if (!live()) return;
    graphArea.hidden = !graphArea.hidden;
    open.setAttribute('aria-expanded', String(!graphArea.hidden));
    if (graphArea.hidden || graph) return;
    graph = mountImpactGraph(el, graphArea, change, files, edges, (file) => { if (live()) show({ title: file.path, files: [file] }); });
  });
  footer.append(open);
  panel.append(header, body, footer, graphArea); parent.append(panel);
  return { dispose() { disposed = true; graph?.destroy(); } };
}

function buildMatrix(el: Make, rows: [string, readonly ImpactFile[]][], hops: readonly (1 | 2)[],
  onCell: (cell: CellSelection, button: HTMLButtonElement) => void, controls: HTMLButtonElement[]): HTMLTableElement {
  const table = el('table'); table.setAttribute('aria-label', 'Affected files by module and hop');
  const head = el('thead'), headRow = el('tr'); headRow.append(el('th', 'module \\ hop'));
  for (const hop of hops) headRow.append(el('th', `hop ${hop}`));
  headRow.append(el('th', 'total')); head.append(headRow); table.append(head);
  const tbody = el('tbody'); const maxTotal = Math.max(1, ...rows.map(([, group]) => group.length));
  for (const [module, group] of rows) {
    const row = el('tr'); const name = el('th', module); name.scope = 'row'; row.append(name);
    for (const hop of hops) {
      const cell = el('td'), records = group.filter((file) => file.hop === hop);
      if (!records.length) { cell.append(el('span', '—', 'blast-zero')); row.append(cell); continue; }
      const button = el('button', String(records.length), `blast-cell hop-${hop}`); button.type = 'button';
      button.setAttribute('aria-label', `${module}, hop ${hop}: ${records.length} files`); button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => onCell({ module, hop }, button));
      controls.push(button); cell.append(button); row.append(cell);
    }
    const total = el('td', undefined, 'blast-total'); const bar = el('progress'); bar.max = maxTotal; bar.value = group.length;
    bar.setAttribute('aria-label', `${module}: ${group.length} affected files`); total.append(bar, el('span', String(group.length))); row.append(total); tbody.append(row);
  }
  table.append(tbody);
  return table;
}

function buildLegend(el: Make, withHop2: boolean): HTMLElement {
  const legend = el('div', undefined, 'blast-legend'); legend.title = 'Structural proximity to the change, not a confidence score or probability of failure.';
  legend.append(el('span', undefined, 'blast-swatch hop-1'), legend.ownerDocument.createTextNode('hop 1 · edited directly'));
  if (withHop2) legend.append(el('span', undefined, 'blast-swatch hop-2'), legend.ownerDocument.createTextNode('hop 2 · callers & importers'));
  return legend;
}

function mountImpactGraph(el: Make, area: HTMLElement, change: ChangeEvidence, files: readonly ImpactFile[], edges: readonly ImpactEdge[],
  onFile: (file: ImpactFile) => void): DependencyGraph {
  const visible = files.slice(0, GRAPH_NODE_LIMIT), ids = new Set(visible.map((file) => `file:${file.path}`));
  const changeId = `change:${change.id}`;
  const graph = mountDependencyGraph(area, [{ id: changeId, label: displayChangeHash(change.id).slice(0, 12), kind: 'change', loaded: true },
    ...visible.map((file) => ({ id: `file:${file.path}`, label: file.path, kind: 'file', loaded: true }))],
    [...visible.filter((file) => file.hop === 1).map((file) => ({ from: changeId, to: `file:${file.path}`, label: 'MODIFIES' })),
      ...edges.filter((edge) => ids.has(`file:${edge.fromPath}`) && ids.has(`file:${edge.toPath}`)).map((edge) => ({ from: `file:${edge.fromPath}`, to: `file:${edge.toPath}`, label: edge.relation }))],
    (id) => { const file = files.find((file) => `file:${file.path}` === id); if (file) onFile(file); },
    { title: 'Selected change · structural impact', caption: 'Direct edits and callers/importers', description: 'Change blast-radius graph. Use the graph node list below for keyboard navigation.' });
  if (files.length > visible.length) area.append(el('p', `Graph shows the first ${visible.length} of ${files.length} files; the matrix and file lists retain all returned files.`, 'blast-note'));
  return graph;
}
