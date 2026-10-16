import type { EvidenceNode, EvidenceSelection, IntentSummary, ProvenanceEvidence } from '../../src/shared/atomicEvidence';
import { QUERY_NODE_COLORS } from './atomicDependencyGraph';

function inspectorUI(container: HTMLElement) {
  const doc = container.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  const action = (label: string, run: () => void) => {
    const button = el('button', label, 'evidence-action');
    button.type = 'button'; button.addEventListener('click', run); return button;
  };
  const header = (kind: string, title: string, id?: string) => {
    const head = el('header', undefined, 'evidence-header');
    head.append(el('h2', 'Evidence inspector'));
    const badge = el('span', kind, 'evidence-kind');
    badge.style.borderColor = QUERY_NODE_COLORS[kind] || '#7f8c8d';
    head.append(badge, el('h3', title, 'evidence-title'));
    if (id) head.append(el('p', id, 'evidence-id'));
    container.append(head);
  };
  const card = (title: string, parent: HTMLElement = container) => {
    const section = el('section', undefined, 'evidence-card');
    section.append(el('h3', title)); parent.append(section); return section;
  };
  const fact = (parent: HTMLElement, label: string, value?: string, tone?: string) => {
    const row = el('dl', undefined, 'evidence-fact');
    row.append(el('dt', `${label}: `), el('dd', value || 'Not supplied', tone ? `evidence-value ${tone}` : 'evidence-value'));
    parent.append(row);
  };
  return { el, action, header, card, fact };
}

export function renderInspectorEmpty(container: HTMLElement, message = 'Select a node to explore its evidence.', title = 'Nothing selected'): void {
  container.replaceChildren();
  const { el } = inspectorUI(container);
  container.append(el('h2', 'Evidence inspector'));
  const empty = el('div', undefined, 'evidence-empty');
  empty.append(el('span', '◇', 'evidence-empty-icon'), el('h3', title), el('p', message));
  container.append(empty);
}

export function renderEvidenceInspector(container: HTMLElement, selected: EvidenceSelection, actions: {
  intents: IntentSummary[]; openIntent(id: string): void; openSigned(): void;
}): void {
  container.replaceChildren();
  const { el, header, card, fact, action } = inspectorUI(container);
  header(selected.kind, selected.kind === 'change' ? selected.message : selected.id, selected.id);
  if (selected.kind === 'change') {
    const overview = card('Recorded change');
    fact(overview, 'Change', selected.id);
    fact(overview, 'Message', selected.message);
    fact(overview, 'Recorded authors', selected.authors.join(', ') || 'None reported');
    fact(overview, 'Change signature', selected.signature, 'evidence-warning');
    const counts = el('div', undefined, 'evidence-counts');
    counts.append(el('span', `${selected.dependencies.length} dependencies`), el('span', `${selected.provenance.length} provenance ledgers`));
    overview.append(counts);
    const dependencies = card('Dependencies');
    if (selected.dependencies.length) {
      const list = el('ul', undefined, 'evidence-hashes');
      selected.dependencies.forEach((id) => list.append(el('li', id)));
      dependencies.append(list);
    } else dependencies.append(el('p', 'None reported', 'muted'));
    container.append(el('p', selected.provenanceNotice, 'evidence-disclaimer'));
    if (!selected.provenance.length) container.append(el('p', 'No provenance ledger returned by this query. This is not a claim that provenance cannot exist elsewhere.', 'muted'));
    selected.provenance.forEach((ledger) => {
      const section = card('Provenance ledger');
      section.append(el('p', ledger.agent || 'Unknown agent', 'evidence-agent'));
      fact(section, 'Schema', ledger.schema);
      fact(section, 'Ledger hash', ledger.hash);
      fact(section, 'Recorded agent', ledger.agent);
      fact(section, 'Session', ledger.session);
      fact(section, 'Previous ledger (not loaded)', ledger.previous);
      fact(section, 'Recorded plan / intent ID', ledger.planId);
      if (ledger.planId && actions.intents.some((intent) => intent.id === ledger.planId)) {
        section.append(action('Open linked intent in editor', () => actions.openIntent(ledger.planId!)));
      }
      if (ledger.reason) section.append(el('p', ledger.reason, 'evidence-disclaimer'));
      if (ledger.raw) {
        const raw = el('details', undefined, 'evidence-raw');
        raw.append(el('summary', 'Stored provenance JSON'), el('pre', ledger.raw)); section.append(raw);
      }
    });
  } else {
    container.append(el('p', 'Repository-wide vault read. No view snapshot or selected-view membership is established.', 'evidence-disclaimer'));
    const states = el('div', undefined, 'evidence-state-grid');
    const signature = card('Signature', states);
    fact(signature, 'Historical signature', selected.signature, selected.signature === 'valid' ? 'evidence-positive' : 'evidence-warning');
    const freshness = card('Source', states);
    fact(freshness, 'Stored-source freshness', selected.source, selected.source === 'matches stored source' ? 'evidence-positive' : 'evidence-warning');
    fact(card('Trust', states), 'Signer trust', selected.trust, 'evidence-warning');
    fact(card('Editor', states), 'Current editor buffer', selected.buffer);
    container.append(states);
    const signed = card('Signed statement');
    fact(signed, 'Signer', selected.signer);
    fact(signed, 'Signed revision', selected.revision);
    fact(signed, 'Signed source anchor', selected.signedSourceHash);
    fact(signed, 'Current stored-source anchor', selected.currentSourceHash);
    if (selected.reason) fact(signed, 'Backend explanation', selected.reason);
    if (selected.canOpenSigned) signed.append(action('Open exact stored signed document (read-only)', actions.openSigned));
  }
}

export function renderRecordedNodeInspector(container: HTMLElement, node: EvidenceNode, ledger: ProvenanceEvidence, changeId: string,
  back: () => void, isCurrent: () => boolean = () => true): void {
  container.replaceChildren();
  const { el, header, card, fact, action } = inspectorUI(container);
  header(node.kind, node.label, node.id);
  container.append(action('← Back to change evidence', () => { if (isCurrent()) back(); }));
  const overview = card('Recorded node');
  fact(overview, 'Node ID', node.id);
  fact(overview, 'Kind', node.kind);
  fact(overview, 'Summary', node.label);
  const context = card('Provenance context');
  fact(context, 'Associated change', changeId);
  fact(context, 'Recorded agent', ledger.agent);
  fact(context, 'Session', ledger.session);
  fact(context, 'Plan / intent ID', ledger.planId);
  container.append(el('p', 'Recorded activity and relationships—not independent proof of authorship or successful verification.', 'evidence-disclaimer'));
  for (const direction of ['Outgoing', 'Incoming'] as const) {
    const edges = ledger.edges.filter((edge) => direction === 'Outgoing' ? edge.from === node.id : edge.to === node.id);
    const section = card(`${direction} relationships · ${edges.length}`);
    if (!edges.length) section.append(el('p', 'None recorded', 'muted'));
    for (const edge of edges) {
      const id = direction === 'Outgoing' ? edge.to : edge.from;
      const target = ledger.nodes.find((node) => node.id === id)!;
      const button = action(`${edge.label} ${direction === 'Outgoing' ? '→' : '←'} ${target.label}`, () => {
        if (isCurrent()) renderRecordedNodeInspector(container, target, ledger, changeId, back, isCurrent);
      });
      button.title = `${edge.from} — ${edge.label} → ${edge.to}`;
      section.append(button);
    }
  }
}
