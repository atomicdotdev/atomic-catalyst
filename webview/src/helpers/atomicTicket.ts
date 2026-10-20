import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, type Panel } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import MarkdownIt from 'markdown-it';
import { ArrowUpRight, Check, ExternalLink, FileText, Pencil, createElement } from 'lucide';
import {
  atomicStatusOptions, canEditAtomicStatus, createAtomicAttributeEdit,
  createAtomicBodyEdit, createAtomicMetadataEdit, createAtomicStatusEdit,
  type AtomicDirective, type AtomicIntentDocument, type AtomicSourceEdit
} from './atomicIntentDocument';
import { formatAbsoluteTime, formatRelativeTime, priorityTone, shortTicketId, statusTone } from './ticketPresentation';

type IconNode = Parameters<typeof createElement>[0];

const renderer = new MarkdownIt({ html: false, linkify: false, breaks: false });
const defaultValidateLink = renderer.validateLink.bind(renderer);
renderer.validateLink = (url) => defaultValidateLink(url) &&
  (!/^[a-z][a-z0-9+.-]*:/i.test(url) || /^(https?:|mailto:)/i.test(url));
// Do not fetch remote images just by opening an intent.
renderer.renderer.rules.image = (tokens, index) => renderer.utils.escapeHtml(tokens[index].content || '[Image]');

const INTENT_STATUSES = ['backlog', 'planned', 'in_progress', 'needs-review', 'done'];
const INTENT_PRIORITIES = ['low', 'medium', 'high'];
const DETAIL_FIELDS: [string, string][] = [['status', 'Status'], ['priority', 'Priority'], ['project', 'Project'], ['author', 'Author'], ['view', 'View']];
const SECTIONS: [string, string][] = [['why', 'Description'], ['acceptance-criterion', 'Acceptance criteria'], ['task', 'Tasks'],
  ['scope-in', 'In scope'], ['scope-out', 'Out of scope'], ['constraint', 'Constraints']];
const TECHNICAL_FIELDS = ['id', 'uid', 'content_hash', 'created_by'];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(node: IconNode, size = 14): SVGElement {
  const svg = createElement(node, { width: size, height: size, 'aria-hidden': 'true' });
  svg.classList.add('atomic-ticket-icon');
  return svg;
}

function action(label: string, callback: () => void, className = 'atomic-ticket-button', iconNode?: IconNode): HTMLButtonElement {
  const node = element('button', className);
  node.type = 'button';
  if (iconNode) node.append(icon(iconNode, 13));
  if (label) node.append(document.createTextNode(label));
  node.addEventListener('click', callback);
  return node;
}

function pill(text: string, tone: string, className = 'atomic-ticket-pill'): HTMLSpanElement {
  const node = element('span', className, text);
  node.dataset.tone = tone;
  return node;
}

/** Native <select> keeps keyboard/screen-reader behavior; the wrapper only supplies the pill look and chevron. */
function selectField(select: HTMLSelectElement, tone: string): HTMLSpanElement {
  const wrap = element('span', 'atomic-ticket-select');
  wrap.dataset.tone = tone;
  wrap.append(select);
  return wrap;
}

function humanize(value?: string): string {
  return (value || '').replace(/[-_]/g, ' ');
}

function separator(): HTMLSpanElement {
  return element('span', 'atomic-ticket-breadcrumb-separator', '/');
}

function metaItem(label: string, value: string | Node): HTMLSpanElement {
  const item = element('span', 'atomic-ticket-meta-item');
  item.append(element('span', 'atomic-ticket-meta-label', label), typeof value === 'string' ? document.createTextNode(value) : value);
  return item;
}

export function createAtomicTicketPanel(
  view: EditorView,
  getIntent: () => AtomicIntentDocument,
  onOpenLink: (href: string) => void,
  onSource: () => void
): Panel {
  const dom = element('section', 'atomic-ticket');
  dom.setAttribute('aria-label', 'Atomic intent ticket');
  let lastDocument = view.state.doc;
  let lastReadOnly = view.state.readOnly;
  let bodyEditor: EditorView | null = null;
  let highlightedCard: HTMLElement | null = null;
  let highlightTimer: ReturnType<typeof setTimeout> | null = null;
  const reading = new Compartment();
  let activeEdit: { snapshot: string; save: () => boolean; notice: HTMLElement; saveButton: HTMLButtonElement } | null = null;

  function clearHighlight(): void {
    if (highlightTimer !== null) clearTimeout(highlightTimer);
    highlightTimer = null;
    highlightedCard?.classList.remove('atomic-ticket-card-highlighted');
    highlightedCard = null;
  }

  function navigateToCard(id: string): void {
    const target = [...dom.querySelectorAll<HTMLElement>('.atomic-ticket-card[data-ticket-id]')]
      .find((node) => node.dataset.ticketId === id);
    if (!target) return;
    clearHighlight();
    highlightedCard = target;
    target.classList.add('atomic-ticket-card-highlighted');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    highlightTimer = setTimeout(clearHighlight, 3000);
  }

  function endEdit(): void {
    bodyEditor?.destroy();
    bodyEditor = null;
    activeEdit = null;
    dom.removeAttribute('data-editing');
  }

  function cancelEdit(): void {
    endEdit();
    render();
  }

  function commit(edit: AtomicSourceEdit | null): void {
    endEdit();
    if (edit) {
      view.dispatch({ changes: edit, userEvent: 'input.atomic-ticket' });
    } else {
      render();
    }
  }

  function editForm(container: HTMLElement, content: HTMLElement, save: () => AtomicSourceEdit | null, unchanged: () => boolean): void {
    if (activeEdit || view.state.readOnly) return;
    const snapshot = view.state.doc.toString();
    const form = element('div', 'atomic-ticket-edit-form');
    const notice = element('div', 'atomic-ticket-edit-notice');
    notice.setAttribute('role', 'status');
    const saveDraft = (): boolean => {
      if (view.state.readOnly || view.state.doc.toString() !== snapshot) {
        notice.textContent = view.state.readOnly ? 'This ticket is read-only.' : 'The source changed while editing. Cancel and reopen this field to avoid overwriting changes.';
        return false;
      }
      if (unchanged()) {
        commit(null);
        return true;
      }
      const edit = save();
      if (!edit) {
        notice.textContent = 'This edit cannot safely be applied. Check the text or use Source mode.';
        return false;
      }
      commit(edit);
      return true;
    };
    const buttons = element('div', 'atomic-ticket-edit-actions');
    const saveButton = action('Save', () => { saveDraft(); }, 'atomic-ticket-button atomic-ticket-primary');
    buttons.append(saveButton, action('Cancel', cancelEdit), element('span', 'atomic-ticket-edit-hint', 'Ctrl/⌘ + Enter to save · Esc to cancel'));
    // Capture phase + stopPropagation: the nested CodeMirror editor binds Mod-Enter to "insert blank line" and must not see these keys.
    form.addEventListener('keydown', (event) => {
      const singleLine = (event.target as HTMLElement | null)?.tagName === 'INPUT';
      const save = event.key === 'Enter' && (event.metaKey || event.ctrlKey || singleLine);
      if (event.key !== 'Escape' && !save) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Escape') cancelEdit(); else saveDraft();
    }, true);
    form.append(content, notice, buttons);
    container.replaceChildren(form);
    activeEdit = { snapshot, save: saveDraft, notice, saveButton };
    dom.dataset.editing = 'true';
  }

  function editMetadata(container: HTMLElement, field: string, intent: AtomicIntentDocument): void {
    const input = element('input', 'atomic-ticket-input');
    input.value = intent.metadata[field] ?? '';
    input.setAttribute('aria-label', field === 'title' ? 'Intent title' : field);
    editForm(container, input, () => createAtomicMetadataEdit(view.state.doc.toString(), intent, field, input.value),
      () => input.value === intent.metadata[field]);
    input.focus();
  }

  function prose(container: HTMLElement, directive: AtomicDirective): void {
    if (activeEdit || view.state.readOnly) return;
    if (directive.contentFrom === undefined || directive.contentTo === undefined) return;
    const source = view.state.doc.toString();
    const original = source.slice(directive.contentFrom, directive.contentTo).replace(/(?:\r?\n)+$/, '');
    const host = element('div', 'atomic-ticket-prose-editor');
    editForm(container, host, () => createAtomicBodyEdit(view.state.doc.toString(), directive, bodyEditor?.state.doc.toString() ?? original),
      () => bodyEditor?.state.doc.toString() === original);
    if (!activeEdit) return;
    bodyEditor = new EditorView({
      parent: host,
      state: EditorState.create({ doc: original, extensions: [markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping, reading.of([EditorState.readOnly.of(false), EditorView.editable.of(true)])] })
    });
    bodyEditor.focus();
  }

  function markdownBody(directive: AtomicDirective): HTMLElement {
    const content = element('div', 'atomic-ticket-prose');
    const text = view.state.doc.sliceString(directive.contentFrom ?? directive.headerTo, directive.contentTo ?? directive.headerTo);
    content.innerHTML = renderer.render(text);
    content.addEventListener('click', (event) => {
      const link = (event.target as Element)?.closest('a');
      if (link) {
        event.preventDefault();
        const href = link.getAttribute('href');
        if (href?.startsWith('#')) {
          navigateToCard(href.slice(1));
        } else if (href) onOpenLink(href);
      }
    });
    return content;
  }

  function statusSelect(directive: AtomicDirective): HTMLSelectElement {
    const select = element('select', `atomic-ticket-status atomic-ticket-status-${directive.attributes.status ?? 'unset'}`);
    select.setAttribute('aria-label', `${directive.name === 'task' ? 'Task' : 'Acceptance criterion'} status (${directive.attributes.id ?? directive.from})`);
    for (const value of atomicStatusOptions(directive)) {
      const option = element('option', '', humanize(value));
      option.value = value;
      select.append(option);
    }
    select.value = directive.attributes.status ?? '';
    select.disabled = view.state.readOnly || !canEditAtomicStatus(directive);
    select.addEventListener('change', () => {
      if (view.state.readOnly || activeEdit) return;
      const edit = createAtomicStatusEdit(view.state.doc.toString(), directive, select.value);
      if (edit) view.dispatch({ changes: edit, userEvent: 'input.atomic-ticket-status' });
    });
    return select;
  }

  function evidenceForm(container: HTMLElement, directive: AtomicDirective): void {
    const fields = element('div', 'atomic-ticket-evidence-fields');
    const verifier = element('input', 'atomic-ticket-input');
    verifier.value = directive.attributes.verifiedBy ?? '';
    verifier.setAttribute('aria-label', 'Verified by');
    const evidence = element('textarea', 'atomic-ticket-input');
    evidence.value = directive.attributes.evidence ?? '';
    evidence.setAttribute('aria-label', 'Verification evidence');
    const verifierLabel = element('label', '', 'Verified by');
    verifierLabel.append(verifier);
    const evidenceLabel = element('label', '', 'Evidence');
    evidenceLabel.append(evidence);
    fields.append(verifierLabel, evidenceLabel);
    editForm(container, fields, () => {
      // Produce one minimal header replacement from two attribute edits. Never stringify the intent.
      const source = view.state.doc.toString();
      const first = createAtomicAttributeEdit(source, directive, 'verifiedBy', verifier.value);
      const intermediate = first ? source.slice(0, first.from) + first.insert + source.slice(first.to) : source;
      const newline = intermediate.indexOf('\n', directive.from);
      const headerTo = intermediate[newline - 1] === '\r' ? newline - 1 : newline;
      const updated = { ...directive, headerTo, header: intermediate.slice(directive.from, headerTo),
        attributes: { ...directive.attributes, verifiedBy: verifier.value } };
      const second = createAtomicAttributeEdit(intermediate, updated, 'evidence', evidence.value);
      const final = second ? intermediate.slice(0, second.from) + second.insert + intermediate.slice(second.to) : intermediate;
      if (!first && !second) return null;
      const finalNewline = final.indexOf('\n', directive.from);
      const end = final[finalNewline - 1] === '\r' ? finalNewline - 1 : finalNewline;
      return { from: directive.from, to: directive.headerTo, insert: final.slice(directive.from, end) };
    }, () => verifier.value === (directive.attributes.verifiedBy ?? '') && evidence.value === (directive.attributes.evidence ?? ''));
  }

  function criterionLink(directive: AtomicDirective, intent: AtomicIntentDocument): HTMLElement {
    const target = intent.directives.find((item) => item.name === 'acceptance-criterion' && item.attributes.id === directive.attributes.criteria);
    const link = element('button', 'atomic-ticket-link');
    link.type = 'button';
    link.append(icon(ArrowUpRight, 13), document.createTextNode(`Criterion ${shortTicketId(directive.attributes.criteria, intent.metadata.uid)}`));
    if (target?.attributes.status) link.append(pill(humanize(target.attributes.status), statusTone(target.attributes.status), 'atomic-ticket-pill atomic-ticket-pill-small'));
    link.title = target ? `Go to acceptance criterion ${directive.attributes.criteria}` : `Acceptance criterion ${directive.attributes.criteria} was not found in this intent`;
    link.disabled = !target;
    link.addEventListener('click', () => { if (target) navigateToCard(target.attributes.id); });
    const row = element('div', 'atomic-ticket-card-links');
    row.append(link);
    return row;
  }

  function evidenceDetails(directive: AtomicDirective): HTMLElement {
    const verifiedBy = directive.attributes.verifiedBy, evidenceText = directive.attributes.evidence;
    const verified = Boolean(evidenceText && verifiedBy);
    const evidence = element('details', 'atomic-ticket-evidence');
    if (verified) evidence.dataset.verified = 'true';
    const summary = element('summary', '');
    if (verified) summary.append(icon(Check, 13));
    summary.append(document.createTextNode(verified ? 'Verification evidence' : 'Add verification evidence'));
    const details = element('div', 'atomic-ticket-evidence-body');
    const facts = element('dl', 'atomic-ticket-evidence-facts');
    facts.append(element('dt', '', 'Verified by'));
    const by = element('dd', '');
    by.append(verifiedBy ? element('code', 'atomic-ticket-code', verifiedBy) : element('span', 'atomic-ticket-muted', 'No verifier recorded'));
    facts.append(by, element('dt', '', 'Evidence'));
    const record = element('dd', '');
    record.append(element('p', evidenceText ? 'atomic-ticket-evidence-text' : 'atomic-ticket-muted', evidenceText || 'No evidence recorded.'));
    facts.append(record);
    details.append(facts);
    const editEvidence = action('Edit evidence', () => evidenceForm(details, directive), 'atomic-ticket-button', Pencil);
    editEvidence.disabled = view.state.readOnly;
    details.append(editEvidence);
    evidence.append(summary, details);
    return evidence;
  }

  function card(directive: AtomicDirective, number: number, intent: AtomicIntentDocument): HTMLElement {
    const section = element('article', `atomic-ticket-card atomic-ticket-${directive.name}`);
    section.dataset.directive = directive.name;
    section.dataset.ticketId = directive.attributes.id ?? `${directive.name}-${number}`;
    section.tabIndex = -1;
    const head = element('div', 'atomic-ticket-card-head');
    const title = element('div', 'atomic-ticket-card-title');
    title.append(element('h3', '', directive.name === 'task' ? `Task ${number}` : `Criterion ${number}`));
    const short = shortTicketId(directive.attributes.id, intent.metadata.uid);
    if (short) {
      const id = element('code', 'atomic-ticket-card-id', `#${short}`);
      id.title = directive.attributes.id;
      title.append(id);
    }
    head.append(title, selectField(statusSelect(directive), statusTone(directive.attributes.status)));
    const body = element('div', 'atomic-ticket-card-body');
    body.append(markdownBody(directive));
    const edit = action('Edit', () => prose(body, directive), 'atomic-ticket-button atomic-ticket-subtle', Pencil);
    edit.disabled = view.state.readOnly;
    head.append(edit);
    section.append(head, body);
    if (directive.name === 'task' && directive.attributes.criteria) section.append(criterionLink(directive, intent));
    const references = intent.directives.filter((item) => item.name === 'file-ref' && item.parentFrom === directive.from);
    if (references.length) {
      const files = element('div', 'atomic-ticket-files');
      for (const reference of references) {
        const file = action(reference.attributes.path || 'Missing file path', () => {
          if (reference.attributes.path) onOpenLink(`atomic-file-ref:${encodeURIComponent(reference.attributes.path)}`);
        }, 'atomic-ticket-file', FileText);
        file.dataset.directive = 'file-ref';
        file.title = reference.attributes.path ? `Open ${reference.attributes.path}` : 'This file reference has no path';
        files.append(file);
      }
      section.append(files);
    }
    if (directive.name === 'acceptance-criterion') section.append(evidenceDetails(directive));
    return section;
  }

  function header(intent: AtomicIntentDocument): HTMLElement {
    const header = element('header', 'atomic-ticket-header');
    const breadcrumb = element('div', 'atomic-ticket-breadcrumb');
    breadcrumb.append(element('span', '', 'Atomic'), separator(), element('span', '', intent.metadata.project || 'Intents'), separator(),
      element('code', 'atomic-ticket-code', intent.id || 'Intent'));
    const topActions = element('div', 'atomic-ticket-top-actions');
    topActions.append(action('Source', onSource, 'atomic-ticket-button', ExternalLink));
    const titleRow = element('div', 'atomic-ticket-title-row');
    const title = element('div', 'atomic-ticket-title-container');
    title.append(element('h1', 'atomic-ticket-title', intent.title || 'Untitled intent'));
    const editTitle = action('', () => editMetadata(title, 'title', intent), 'atomic-ticket-button atomic-ticket-subtle atomic-ticket-icon-button', Pencil);
    editTitle.setAttribute('aria-label', 'Edit title');
    editTitle.title = 'Edit title';
    editTitle.disabled = view.state.readOnly;
    titleRow.append(title, editTitle);
    const meta = element('div', 'atomic-ticket-meta-row');
    meta.append(pill(humanize(intent.status) || 'No status', statusTone(intent.status), 'atomic-ticket-pill atomic-ticket-badge'));
    const priority = intent.metadata.priority;
    if (priority) meta.append(metaItem('Priority', pill(humanize(priority), priorityTone(priority), 'atomic-ticket-pill atomic-ticket-pill-small')));
    if (intent.metadata.author) meta.append(metaItem('Author', intent.metadata.author));
    const updated = formatRelativeTime(intent.metadata.updated_at);
    if (updated) {
      const item = metaItem('Updated', updated);
      item.title = formatAbsoluteTime(intent.metadata.updated_at);
      meta.append(item);
    }
    header.append(breadcrumb, topActions, titleRow, meta);
    return header;
  }

  function sectionHeading(name: string, label: string, directives: AtomicDirective[]): HTMLElement {
    const heading = element('div', 'atomic-ticket-section-heading');
    heading.append(element('h2', '', label));
    if (name === 'task' || name === 'acceptance-criterion') {
      const complete = directives.filter((item) => item.attributes.status === (name === 'task' ? 'done' : 'met')).length;
      heading.append(element('span', 'atomic-ticket-count', `${complete} / ${directives.length}`));
      const bar = element('progress', 'atomic-ticket-progress');
      bar.max = directives.length;
      bar.value = complete;
      bar.setAttribute('aria-label', `${complete} of ${directives.length} ${label.toLowerCase()} complete`);
      heading.append(bar);
      if (complete === directives.length) heading.dataset.complete = 'true';
    }
    return heading;
  }

  function sidebar(intent: AtomicIntentDocument): HTMLElement {
    const aside = element('aside', 'atomic-ticket-sidebar');
    const details = element('section', 'atomic-ticket-details');
    details.append(element('h2', '', 'Details'));
    const fields = element('dl', 'atomic-ticket-fields');
    for (const [key, label] of DETAIL_FIELDS) {
      fields.append(element('dt', '', label));
      const value = element('dd', '', intent.metadata[key] || '—');
      if (key === 'status' || key === 'priority') {
        const select = element('select', 'atomic-ticket-detail-select');
        select.setAttribute('aria-label', `Intent ${key}`);
        const options = key === 'status' ? INTENT_STATUSES : INTENT_PRIORITIES;
        for (const item of new Set([intent.metadata[key], ...options].filter(Boolean))) {
          const option = element('option', '', humanize(item));
          option.value = item;
          select.append(option);
        }
        select.value = intent.metadata[key] || '';
        select.disabled = view.state.readOnly || !intent.metadata[key];
        select.addEventListener('change', () => {
          if (view.state.readOnly || activeEdit) return;
          const edit = createAtomicMetadataEdit(view.state.doc.toString(), intent, key, select.value);
          if (edit) view.dispatch({ changes: edit, userEvent: 'input.atomic-ticket-metadata' });
        });
        value.replaceChildren(selectField(select, key === 'status' ? statusTone(intent.metadata[key]) : priorityTone(intent.metadata[key])));
      }
      fields.append(value);
    }
    details.append(fields);
    aside.append(details);
    const activity = element('section', 'atomic-ticket-details');
    activity.append(element('h2', '', 'Activity'));
    for (const [key, label] of [['created_at', 'Created'], ['updated_at', 'Updated']]) {
      const date = intent.metadata[key];
      const relative = formatRelativeTime(date);
      const line = element('p', '');
      if (relative) line.append(element('span', 'atomic-ticket-relative', relative), element('span', 'atomic-ticket-muted', ` · ${formatAbsoluteTime(date)}`));
      else line.textContent = formatAbsoluteTime(date);
      activity.append(element('div', 'atomic-ticket-muted', label), line);
    }
    aside.append(activity);
    const trust = element('section', 'atomic-ticket-details atomic-ticket-trust');
    trust.append(element('h2', '', 'Validation & attestation'));
    const trustRow = element('p', 'atomic-ticket-trust-row');
    trustRow.append(element('span', 'atomic-ticket-trust-dot'), document.createTextNode('Not checked in this editor'));
    trust.append(trustRow, element('p', 'atomic-ticket-muted', 'Atomic CLI remains authoritative.'));
    aside.append(trust);
    const technical = element('details', 'atomic-ticket-technical');
    technical.append(element('summary', '', 'Technical metadata'));
    for (const key of TECHNICAL_FIELDS) {
      const value = element('p', '');
      value.append(intent.metadata[key] ? element('code', 'atomic-ticket-code', intent.metadata[key]) : document.createTextNode('—'));
      technical.append(element('div', 'atomic-ticket-muted', key), value);
    }
    aside.append(technical);
    return aside;
  }

  function render(): void {
    clearHighlight();
    const intent = getIntent();
    const fragment = document.createDocumentFragment();
    fragment.append(header(intent));
    const layout = element('div', 'atomic-ticket-layout');
    const main = element('main', 'atomic-ticket-main');
    const rootSections = intent.directives.filter((item) => item.parentFrom === undefined && item.name !== 'file-ref');
    for (const [name, label] of SECTIONS) {
      const directives = rootSections.filter((item) => item.name === name);
      if (!directives.length) continue;
      const section = element('section', `atomic-ticket-section atomic-ticket-section-${name}`);
      const heading = sectionHeading(name, label, directives);
      section.append(heading);
      directives.forEach((directive, index) => {
        if (name === 'task' || name === 'acceptance-criterion') {
          section.append(card(directive, index + 1, intent));
        } else {
          const body = element('div', 'atomic-ticket-section-body');
          body.dataset.directive = name;
          body.append(markdownBody(directive));
          const edit = action('Edit', () => prose(body, directive), 'atomic-ticket-button atomic-ticket-subtle', Pencil);
          edit.disabled = view.state.readOnly;
          heading.append(edit);
          section.append(body);
        }
      });
      main.append(section);
    }
    layout.append(main, sidebar(intent));
    fragment.append(layout);
    fragment.append(element('footer', 'atomic-ticket-footer', 'Markdown is the source of truth. Unrecognized content is preserved and available in Source.'));
    dom.replaceChildren(fragment);
    lastDocument = view.state.doc;
    lastReadOnly = view.state.readOnly;
  }

  const commitDraft = (event: Event) => {
    const detail = (event as CustomEvent<{ accepted: boolean }>).detail;
    if (activeEdit && !activeEdit.save()) detail.accepted = false;
  };
  render();
  return {
    dom, top: true,
    mount() {
      view.dom.addEventListener('atomic-commit-ticket-edit', commitDraft);
    },
    update() {
      if (activeEdit) {
        activeEdit.saveButton.disabled = view.state.readOnly;
        if (view.state.doc.toString() !== activeEdit.snapshot) activeEdit.notice.textContent = 'The source changed while editing. Cancel and reopen this field.';
        if (bodyEditor) bodyEditor.dispatch({ effects: reading.reconfigure([EditorState.readOnly.of(view.state.readOnly), EditorView.editable.of(!view.state.readOnly)]) });
        return;
      }
      if (lastDocument !== view.state.doc || lastReadOnly !== view.state.readOnly) render();
    },
    destroy() {
      clearHighlight();
      endEdit();
      view.dom.removeEventListener('atomic-commit-ticket-edit', commitDraft);
    }
  };
}
