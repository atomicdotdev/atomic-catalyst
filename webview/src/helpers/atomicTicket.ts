import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, type Panel } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import MarkdownIt from 'markdown-it';
import {
  atomicStatusOptions, canEditAtomicStatus, createAtomicAttributeEdit,
  createAtomicBodyEdit, createAtomicMetadataEdit, createAtomicStatusEdit,
  type AtomicDirective, type AtomicIntentDocument, type AtomicSourceEdit
} from './atomicIntentDocument';

const renderer = new MarkdownIt({ html: false, linkify: false, breaks: false });
const defaultValidateLink = renderer.validateLink.bind(renderer);
renderer.validateLink = (url) => defaultValidateLink(url) &&
  (!/^[a-z][a-z0-9+.-]*:/i.test(url) || /^(https?:|mailto:)/i.test(url));
// Do not fetch remote images just by opening an intent.
renderer.renderer.rules.image = (tokens, index) => renderer.utils.escapeHtml(tokens[index].content || '[Image]');

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function action(label: string, callback: () => void, className = 'atomic-ticket-button'): HTMLButtonElement {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', callback);
  return node;
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
    buttons.append(saveButton, action('Cancel', () => { endEdit(); render(); }));
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
      const option = element('option', '', value.replace(/_/g, ' '));
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

  function card(directive: AtomicDirective, number: number, intent: AtomicIntentDocument): HTMLElement {
    const section = element('article', `atomic-ticket-card atomic-ticket-${directive.name}`);
    section.dataset.directive = directive.name;
    section.dataset.ticketId = directive.attributes.id ?? `${directive.name}-${number}`;
    section.tabIndex = -1;
    const head = element('div', 'atomic-ticket-card-head');
    const name = directive.name === 'task' ? `Task ${number}` : `Criterion ${number}`;
    head.append(element('h3', '', name), statusSelect(directive));
    const body = element('div', 'atomic-ticket-card-body');
    body.append(markdownBody(directive));
    const edit = action('Edit', () => prose(body, directive), 'atomic-ticket-button atomic-ticket-subtle');
    edit.disabled = view.state.readOnly;
    head.append(edit);
    section.append(head, body);
    if (directive.name === 'task' && directive.attributes.criteria) {
      const target = intent.directives.find((item) => item.name === 'acceptance-criterion' && item.attributes.id === directive.attributes.criteria);
      const link = action('Linked acceptance criterion ↗', () => {
        if (target) navigateToCard(target.attributes.id);
      }, 'atomic-ticket-link');
      link.disabled = !target;
      link.title = directive.attributes.criteria;
      section.append(link);
    }
    const references = intent.directives.filter((item) => item.name === 'file-ref' && item.parentFrom === directive.from);
    if (references.length) {
      const files = element('div', 'atomic-ticket-files');
      for (const reference of references) {
        const file = action(reference.attributes.path || 'Missing file path', () => {
          if (reference.attributes.path) onOpenLink(`atomic-file-ref:${encodeURIComponent(reference.attributes.path)}`);
        }, 'atomic-ticket-file');
        file.dataset.directive = 'file-ref';
        files.append(file);
      }
      section.append(files);
    }
    if (directive.name === 'acceptance-criterion') {
      const evidence = element('details', 'atomic-ticket-evidence');
      evidence.append(element('summary', '', directive.attributes.evidence && directive.attributes.verifiedBy ? 'Verification evidence' : 'Add verification evidence'));
      const details = element('div', 'atomic-ticket-evidence-body');
      details.append(element('p', 'atomic-ticket-muted', directive.attributes.verifiedBy ? `Verified by ${directive.attributes.verifiedBy}` : 'No verifier recorded'),
        element('p', '', directive.attributes.evidence || 'No evidence recorded.'));
      const editEvidence = action('Edit evidence', () => evidenceForm(details, directive));
      editEvidence.disabled = view.state.readOnly;
      details.append(editEvidence);
      evidence.append(details);
      section.append(evidence);
    }
    return section;
  }

  function render(): void {
    clearHighlight();
    const intent = getIntent();
    const fragment = document.createDocumentFragment();
    const header = element('header', 'atomic-ticket-header');
    const breadcrumb = element('div', 'atomic-ticket-breadcrumb', `Atomic  /  ${intent.metadata.project || 'Intents'}  /  ${intent.id || 'Intent'}`);
    const topActions = element('div', 'atomic-ticket-top-actions');
    const issueStatus = element('span', `atomic-ticket-badge atomic-ticket-badge-${intent.status}`, (intent.status || 'No status').replace(/[-_]/g, ' '));
    topActions.append(issueStatus, action('Source ↗', onSource));
    const titleRow = element('div', 'atomic-ticket-title-row');
    const title = element('div', 'atomic-ticket-title-container');
    title.append(element('h1', 'atomic-ticket-title', intent.title || 'Untitled intent'));
    const editTitle = action('Edit title', () => editMetadata(title, 'title', intent), 'atomic-ticket-button atomic-ticket-subtle');
    editTitle.disabled = view.state.readOnly;
    titleRow.append(title, editTitle);
    header.append(breadcrumb, topActions, titleRow);
    fragment.append(header);

    const layout = element('div', 'atomic-ticket-layout');
    const main = element('main', 'atomic-ticket-main');
    const aside = element('aside', 'atomic-ticket-sidebar');
    const rootSections = intent.directives.filter((item) => item.parentFrom === undefined && item.name !== 'file-ref');
    for (const [name, label] of [['why', 'Description'], ['acceptance-criterion', 'Acceptance criteria'], ['task', 'Tasks'],
      ['scope-in', 'In scope'], ['scope-out', 'Out of scope'], ['constraint', 'Constraints']]) {
      const directives = rootSections.filter((item) => item.name === name);
      if (!directives.length) continue;
      const section = element('section', `atomic-ticket-section atomic-ticket-section-${name}`);
      const heading = element('div', 'atomic-ticket-section-heading');
      heading.append(element('h2', '', label));
      if (name === 'task' || name === 'acceptance-criterion') {
        const complete = directives.filter((item) => item.attributes.status === (name === 'task' ? 'done' : 'met')).length;
        heading.append(element('span', 'atomic-ticket-count', `${complete} / ${directives.length}`));
      }
      section.append(heading);
      directives.forEach((directive, index) => {
        if (name === 'task' || name === 'acceptance-criterion') {
          section.append(card(directive, index + 1, intent));
        } else {
          const body = element('div', 'atomic-ticket-section-body');
          body.dataset.directive = name;
          body.append(markdownBody(directive));
          const edit = action('Edit', () => prose(body, directive), 'atomic-ticket-button atomic-ticket-subtle');
          edit.disabled = view.state.readOnly;
          heading.append(edit);
          section.append(body);
        }
      });
      main.append(section);
    }

    const details = element('section', 'atomic-ticket-details');
    details.append(element('h2', '', 'Details'));
    const fields = element('dl', 'atomic-ticket-fields');
    for (const [key, label] of [['status', 'Status'], ['priority', 'Priority'], ['project', 'Project'], ['author', 'Author'], ['view', 'View']]) {
      fields.append(element('dt', '', label));
      const value = element('dd', '', intent.metadata[key] || '—');
      if (key === 'status' || key === 'priority') {
        const select = element('select', 'atomic-ticket-detail-select');
        select.setAttribute('aria-label', `Intent ${key}`);
        const options = key === 'status' ? ['backlog', 'planned', 'in_progress', 'needs-review', 'done'] : ['low', 'medium', 'high'];
        for (const item of new Set([intent.metadata[key], ...options].filter(Boolean))) {
          const option = element('option', '', item.replace(/[-_]/g, ' '));
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
        value.replaceChildren(select);
      }
      fields.append(value);
    }
    details.append(fields);
    aside.append(details);
    const activity = element('section', 'atomic-ticket-details');
    activity.append(element('h2', '', 'Activity'));
    for (const [key, label] of [['created_at', 'Created'], ['updated_at', 'Updated']]) {
      const date = intent.metadata[key];
      activity.append(element('div', 'atomic-ticket-muted', label), element('p', '', date && !Number.isNaN(Date.parse(date)) ? new Date(date).toLocaleString() : date || '—'));
    }
    aside.append(activity);
    const trust = element('section', 'atomic-ticket-details atomic-ticket-trust');
    trust.append(element('h2', '', 'Validation & attestation'), element('p', 'atomic-ticket-muted', 'Not checked in this editor. Atomic CLI remains authoritative.'));
    aside.append(trust);
    const technical = element('details', 'atomic-ticket-technical');
    technical.append(element('summary', '', 'Technical metadata'));
    for (const key of ['id', 'uid', 'content_hash', 'created_by']) {
      technical.append(element('div', 'atomic-ticket-muted', key), element('p', '', intent.metadata[key] || '—'));
    }
    aside.append(technical);
    layout.append(main, aside);
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
