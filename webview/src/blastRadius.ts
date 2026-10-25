import type { ChangeEvidence } from '../../src/shared/atomicEvidence';
import { displayChangeHash } from '../../src/shared/atomicHash';
import { mountDependencyGraph, type DependencyGraph } from './atomicDependencyGraph';

/** Noname's module × hop matrix, scoped only to the selected change. */
export function mountBlastRadius(parent: HTMLElement, change: ChangeEvidence, active: () => boolean, openDiff?: (path: string) => void) {
  const doc = parent.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;
  };
  let disposed = false, graph: DependencyGraph | undefined;
  const impact = change.blastRadius;
  const known = impact && impact.mode !== 'unavailable';
  const files: { path: string; hop: 1 | 2 }[] = known ? impact.files : [...new Set(change.affectedPaths || [])].map((path) => ({ path, hop: 1 as const }));
  const modules = new Map<string, typeof files>();
  for (const file of files) {
    const module = file.path.replace(/^\.\//, '').split('/')[0] || '.';
    const group = modules.get(module) || []; group.push(file); modules.set(module, group);
  }
  const rows = [...modules].sort(([a, af], [b, bf]) => bf.length - af.length || a.localeCompare(b));
  const hops = files.some((file) => file.hop === 2) ? [1, 2] as const : [1] as const;
  const panel = el('section', undefined, 'blast-radius'); panel.setAttribute('aria-label', 'Blast radius for selected change');
  const header = el('header', undefined, 'blast-header');
  const title = el('h2'); title.append(el('span', '◆', 'blast-diamond'), doc.createTextNode(' BLAST RADIUS'));
  const meta = el('p', undefined, 'blast-meta');
  const mode = !known ? 'direct files only · structural analysis unavailable' : impact.mode === 'private' ? 'structural · private change'
    : impact.mode === 'partial' ? 'structural · partial coverage' : 'structural (KG)';
  meta.append(doc.createTextNode('changed: '), el('span', displayChangeHash(change.id).slice(0, 7), 'blast-hash'), doc.createTextNode(' · '), el('span', mode, 'blast-mode'));
  header.append(title, meta, el('p', 'hop 1 = edited directly · hop 2 = callers & importers of the change (blast radius)', 'blast-explanation'));
  const body = el('div', undefined, 'blast-body');
  const matrix = el('div', undefined, 'blast-matrix'); const table = el('table'); table.setAttribute('aria-label', 'Affected files by module and hop');
  const head = el('thead'), tr = el('tr'); tr.append(el('th', 'module \\ hop'));
  for (const hop of hops) tr.append(el('th', `hop ${hop}`)); tr.append(el('th', 'total')); head.append(tr); table.append(head);
  const tbody = el('tbody'); const maxTotal = Math.max(1, ...rows.map(([, group]) => group.length));
  const drill = el('section', undefined, 'blast-drill'); drill.hidden = true; drill.setAttribute('aria-live', 'polite');
  const controls: HTMLButtonElement[] = [];
  function showFiles(label: string, records: typeof files) {
    drill.hidden = false; drill.replaceChildren(el('h3', label));
    const list = el('ul');
    for (const file of records) {
      const item = el('li');
      if (file.hop === 1 && change.diffPaths?.includes(file.path) && openDiff) {
        const link = el('button', file.path, 'blast-file-diff'); link.type = 'button'; link.title = 'Open recorded before/after diff in VS Code';
        link.setAttribute('aria-label', `Open diff for ${file.path}`);
        link.addEventListener('click', () => { if (!disposed && active()) openDiff(file.path); }); item.append(link);
      } else item.append(el('strong', file.path));
      const reasons = (impact?.edges || []).filter((edge) => edge.fromPath === file.path);
      item.append(el('p', file.hop === 1 ? 'edited directly' : reasons.map((edge) => `${edge.relation === 'calls' ? 'calls' : 'imports'} ${edge.toPath}`).join('\n')));
      list.append(item);
    }
    drill.append(list);
  }
  for (const [module, group] of rows) {
    const row = el('tr'); const name = el('th', module); name.scope = 'row'; row.append(name);
    for (const hop of hops) {
      const cell = el('td'), records = group.filter((file) => file.hop === hop);
      if (records.length) {
        const button = el('button', String(records.length), `blast-cell hop-${hop}`); button.type = 'button';
        button.setAttribute('aria-label', `${module}, hop ${hop}: ${records.length} files`); button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => { if (disposed || !active()) return;
          controls.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          showFiles(`${module} · hop ${hop}`, records);
        }); controls.push(button); cell.append(button);
      } else cell.append(el('span', '—', 'blast-zero'));
      row.append(cell);
    }
    const total = el('td', undefined, 'blast-total'); const bar = el('progress'); bar.max = maxTotal; bar.value = group.length;
    bar.setAttribute('aria-label', `${module}: ${group.length} affected files`); total.append(bar, el('span', String(group.length))); row.append(total); tbody.append(row);
  }
  table.append(tbody); matrix.append(table);
  if (!files.length) matrix.append(el('p', known ? 'No affected paths returned for this change.' : 'Direct paths unavailable; this is not proof of zero impact.', 'blast-note'));
  const legend = el('div', undefined, 'blast-legend'); legend.title = 'Relative structural proximity, not a confidence score or probability of failure.';
  legend.append(doc.createTextNode('peak impact '), el('span', undefined, 'blast-gradient'), doc.createTextNode(' low'));
  matrix.append(legend); body.append(matrix, drill);
  const notes = el('details', undefined, 'blast-notes'); notes.append(el('summary', 'Analysis coverage'));
  notes.append(el('p', impact?.context || 'Direct paths from the recorded change. No structural result was returned by this native addon.'));
  for (const warning of impact?.warnings || []) notes.append(el('p', warning));
  const footer = el('div', undefined, 'blast-footer');
  const open = el('button', 'OPEN IN CHANGE GRAPH →'); open.type = 'button';
  const graphArea = el('div', undefined, 'blast-graph'); graphArea.hidden = true;
  open.addEventListener('click', () => {
    if (disposed || !active()) return;
    graphArea.hidden = !graphArea.hidden;
    open.setAttribute('aria-expanded', String(!graphArea.hidden));
    if (graphArea.hidden || graph) return;
    const visible = files.slice(0, 100), ids = new Set(visible.map((file) => `file:${file.path}`));
    const changeId = `change:${change.id}`;
    graph = mountDependencyGraph(graphArea, [{ id: changeId, label: displayChangeHash(change.id).slice(0, 12), kind: 'change', loaded: true },
      ...visible.map((file) => ({ id: `file:${file.path}`, label: file.path, kind: 'file', loaded: true }))],
      [...visible.filter((file) => file.hop === 1).map((file) => ({ from: changeId, to: `file:${file.path}`, label: 'MODIFIES' })),
        ...(impact?.edges || []).filter((edge) => ids.has(`file:${edge.fromPath}`) && ids.has(`file:${edge.toPath}`)).map((edge) => ({ from: `file:${edge.fromPath}`, to: `file:${edge.toPath}`, label: edge.relation }))],
      (id) => { if (!disposed && active()) { const file = files.find((file) => `file:${file.path}` === id); if (file) showFiles(file.path, [file]); } },
      { title: 'Selected change · structural impact', caption: 'Direct edits and callers/importers', description: 'Change blast-radius graph. Use the graph node list below for keyboard navigation.' });
    if (files.length > visible.length) graphArea.append(el('p', `Graph shows the first ${visible.length} of ${files.length} files; the matrix and file lists retain all returned files.`, 'blast-note'));
  });
  open.setAttribute('aria-expanded', 'false'); footer.append(open, notes);
  panel.append(header, body, footer, graphArea); parent.append(panel);
  return { dispose() { disposed = true; graph?.destroy(); } };
}
