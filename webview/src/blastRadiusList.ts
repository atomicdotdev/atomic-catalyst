import type { ChangeEvidence } from '../../src/shared/atomicEvidence';
import { type ImpactEdge, type ImpactFile, type ImpactMode, dependentNote, dependentsHeading, describeEdited, plural, reasonsFor, symbolFor } from './blastRadiusModel';

/** The readable half of the blast radius: every affected file with its structural reason, grouped or narrowed to one cell. */
export type ListContext = { change: ChangeEvidence; files: readonly ImpactFile[]; directories: readonly ImpactFile[]; edges: readonly ImpactEdge[]; mode: ImpactMode;
  openDiff?: (path: string) => void; live: () => boolean };
export type ListSelection = { title: string; files: readonly ImpactFile[] };

const GROUP_LIMIT = 25;
const CELL_LIMIT = 400;
const UNKNOWN_NOTE = 'Structural analysis unavailable; this is not proof of zero impact.';
const PARTIAL_NOTE = 'Structural analysis covered only part of this change. No dependents found is not proof of zero impact.';
const NARROW_HINT = 'press a cell in the matrix to narrow';

export function renderFileList(drill: HTMLElement, context: ListContext, selection: ListSelection | undefined, showAll: () => void): void {
  const doc = drill.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;
  };
  const fileItem = (file: ImpactFile, narrowed: boolean) => {
    const item = el('li', undefined, 'blast-file'); item.dataset.hop = String(file.hop);
    const symbol = file.hop === 1 ? symbolFor(context.change, file.path) : '';
    if (symbol) { const mark = el('span', symbol, 'file-symbol'); mark.dataset.symbol = symbol; item.append(mark); }
    if (file.hop === 1 && context.openDiff && context.change.diffPaths?.includes(file.path)) {
      const link = el('button', file.path, 'blast-file-diff'); link.type = 'button'; link.title = 'Open recorded before/after diff in VS Code';
      link.setAttribute('aria-label', `Open diff for ${file.path}`);
      const open = context.openDiff;
      link.addEventListener('click', () => { if (context.live()) open(file.path); });
      item.append(link);
    } else item.append(el('span', file.path, 'blast-path'));
    const reason = file.hop !== 1 ? reasonsFor(file.path, context.edges).join(' · ') : narrowed ? describeEdited(file.path, context.edges) : dependentNote(file.path, context.edges);
    if (reason) item.append(doc.createTextNode(' '), el('span', reason, 'blast-reason'));
    return item;
  };
  const list = (files: readonly ImpactFile[], limit: number, narrowed: boolean, hint?: string) => {
    const ul = el('ul');
    ul.append(...files.slice(0, limit).map((file) => fileItem(file, narrowed)));
    if (files.length > limit) ul.append(el('li', `+${plural(files.length - limit, 'more file')}${hint ? ` · ${hint}` : ''}`, 'blast-more muted'));
    return ul;
  };
  const heading = (text: string, className = 'blast-group-title') => el('h3', text, className);
  if (selection) {
    const title = heading(`${selection.title} · ${plural(selection.files.length, 'file')}`, 'blast-selection-title');
    const release = el('button', `Show all ${context.files.length}`, 'blast-show-all'); release.type = 'button';
    release.addEventListener('click', () => { if (context.live()) showAll(); });
    title.append(release);
    drill.replaceChildren(title, list(selection.files, CELL_LIMIT, true));
    return;
  }
  const edited = context.files.filter((file) => file.hop === 1), dependents = context.files.filter((file) => file.hop === 2);
  const groups: Node[] = [heading(`Edited directly · ${edited.length}`), list(edited, GROUP_LIMIT, false, NARROW_HINT)];
  if (context.directories.length) {
    const created = context.directories.every((dir) => symbolFor(context.change, dir.path) === '📁+');
    groups.push(heading(`${created ? 'Directories created' : 'Directories'} · ${context.directories.length}`, 'blast-group-title blast-dirs-title'),
      el('p', context.directories.map((dir) => dir.path).join(' · '), 'blast-dirs'));
  }
  groups.push(heading(dependentsHeading(dependents.length, context.mode)));
  if (context.mode === 'unavailable') groups.push(el('p', UNKNOWN_NOTE, 'blast-drill-note'));
  else if (dependents.length) groups.push(list(dependents, GROUP_LIMIT, false, NARROW_HINT));
  else if (context.mode === 'partial') groups.push(el('p', PARTIAL_NOTE, 'blast-drill-note'));
  drill.replaceChildren(...groups);
}
