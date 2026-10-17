import type { ChangeEvidence, ExplorerEvent, ExplorerState, EvidenceSelection } from '../../src/shared/atomicEvidence';
import { readAtomicWhy } from './helpers/atomicIntentDocument';
import { formatRecordedCost, formatTokens, summarizeRecordedUsage } from './recordedUsage';
import { displayChangeHash } from '../../src/shared/atomicHash';
import { mountBlastRadius } from './blastRadius';
import { intentReferences } from '../../src/shared/changeIntentContext';

/** Atomic's text-first change report. Native tree navigation owns selection. */
export function mountAtomicGraph(root: HTMLElement, send: (message: unknown) => void): { receive(event: ExplorerEvent): void; dispose(): void } {
  const doc = root.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item;
  };
  let state: ExplorerState | undefined, selected: ChangeEvidence | undefined, interactive = false;
  let blast: ReturnType<typeof mountBlastRadius> | undefined;
  const header = el('header', undefined, 'overview-toolbar');
  const heading = el('span', 'Atomic', 'command-heading');
  const status = el('p', 'Select a change hash beneath a view in the left pane.', 'overview-status'); status.setAttribute('role', 'status');
  const main = el('main', undefined, 'view-overview');
  function button(label: string, run: () => void) {
    const owner = state, change = selected;
    const item = el('button', label); item.type = 'button'; item.addEventListener('click', () => {
      if (label === 'Refresh' || interactive && state === owner && selected === change) run();
    }); return item;
  }
  header.append(heading, button('Refresh', () => send({ action: 'refresh' })));
  root.replaceChildren(header, status, main);
  function line(parent: HTMLElement, text: string, className = '') { parent.append(el('p', text, `native-line ${className}`)); }
  function fact(parent: HTMLElement, label: string, value: string, className = '') {
    const row = el('dl', undefined, `native-fact ${className}`); row.append(el('dt', `${label}: `), el('dd', value)); parent.append(row);
  }
  function section(parent: HTMLElement, title: string, className = '') {
    const item = el('section', undefined, `native-section ${className}`); item.append(el('h2', `=== ${title} ===`)); parent.append(item); return item;
  }
  function empty(message: string) { blast?.dispose(); blast = undefined; status.hidden = false; main.replaceChildren(el('p', message, 'native-line muted')); }
  function fileLink(change: ChangeEvidence, path: string): HTMLElement {
    const link = change.diffPaths?.includes(path) ? button(path, () => send({ action: 'openDiff', id: change.id, path })) : el('span', path);
    link.className = 'impact-path';
    link.title = change.diffPaths?.includes(path) ? 'Open recorded before/after diff in VS Code' : 'No reconstructable text diff available (directory, binary, oversized or missing revision).';
    if (link.tagName === 'BUTTON') link.setAttribute('aria-label', `Open diff for ${path}`);
    return link;
  }
  function renderChange(change: ChangeEvidence) {
    blast?.dispose(); main.replaceChildren(); status.hidden = true;
    const owner = state;
    heading.replaceChildren(el('span', '→ ', 'native-prompt'), el('strong', state?.view || 'Atomic'),
      doc.createTextNode(`  atomic change ${displayChangeHash(change.id)}`));
    const report = el('article', undefined, 'change-detail'); main.append(report);
    line(report, `change ${displayChangeHash(change.id).slice(0, 12)}`, 'muted');
    fact(report, 'Author', change.authors.join(', ') || 'Not recorded');
    fact(report, 'Date', change.recordedAt ? change.recordedAt.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC') : 'Not returned by native runtime', 'muted');
    const intentContext = change.intentContext;
    const typedContext = intentContext && intentContext.status !== 'unavailable' ? intentContext : undefined;
    const references = intentReferences(change);
    const legacyPlans = intentContext ? [] : [...new Set(change.provenance.flatMap((ledger) => ledger.planId ? [ledger.planId] : []))];
    const planId = typedContext ? typedContext.planId : legacyPlans.length === 1 ? legacyPlans[0] : undefined;
    fact(report, 'Plan ID', planId || (typedContext?.status === 'ambiguous' || !typedContext && legacyPlans.length > 1 ? 'Ambiguous — see recorded references'
      : intentContext?.status === 'unavailable' ? 'Unavailable — native context could not be interpreted'
      : typedContext?.status === 'partial' ? 'Unresolved — lookup incomplete' : 'Not recorded in returned data'), 'change-plan-id');
    const source = typedContext?.plans.find((binding) => binding.planId === planId);
    if (source) fact(report, 'Plan source', `${source.source === 'provenance_graph' ? 'Recorded provenance graph' : 'Recorded session turn'}${source.turnNumber != null ? ` ${source.turnNumber} (zero-based)` : ''}`, 'muted');
    if (typedContext?.status === 'partial') fact(report, 'Plan lookup', 'Partial — see plan/intent notes for coverage', 'muted');
    const associated = typedContext?.associatedIntents || [];
    if (associated.length) fact(report, 'Associated intent', `${associated.slice(0, 3).map((item) => item.intent?.id || `${item.path} (identity unavailable)`).join(', ')}${associated.length > 3 ? ` (+${associated.length - 3} more)` : ''} · intent document changed`, 'change-intent-associations');
    report.append(el('p', change.message, 'change-message'));
    const dependencies = el('section', undefined, 'native-section'); report.append(dependencies);
    line(dependencies, `Dependencies: ${change.dependencies.length}`);
    for (const hash of change.dependencies) line(dependencies, `${displayChangeHash(hash).slice(0, 12)}...`, 'native-indent');
    const files = el('section', undefined, 'native-section change-files'); report.append(files);
    const graph = change.metadata?.graphSummary;
    if (graph) {
      line(files, `Graph: +${graph.verticesAdded} vertices, ~${graph.edgesChanged} edges, ${graph.contentBytes} bytes`, 'graph-summary');
      line(files, `Files changed: ${graph.filesChanged}`);
      for (const file of graph.files) {
        const row = el('p', undefined, 'native-line native-indent file-summary');
        row.append(el('span', `${file.symbol} `), fileLink(change, file.path), doc.createTextNode(' '), el('span', file.info, 'muted'));
        files.append(row);
      }
    } else {
      line(files, 'Graph summary unavailable. Use a compatible Atomic runtime and nodeatomic consumer.', 'muted');
      line(files, 'Affected paths (native graph counts unavailable):', 'muted');
      for (const path of change.affectedPaths || []) { const row = el('p', undefined, 'native-line native-indent file-summary'); row.append(fileLink(change, path)); files.append(row); }
    }

    blast = mountBlastRadius(report, change, () => interactive && state === owner && selected === change,
      (path) => send({ action: 'openDiff', id: change.id, path }));
    const attestation = section(report, 'Attestation', 'draft-metrics');
    for (const record of change.metadata?.usage || []) {
      const detail = el('div', undefined, 'native-indent recorded-usage'); attestation.append(detail);
      fact(detail, 'Vendor', record.vendor, 'native-value'); fact(detail, 'Model', record.model, 'native-value');
      fact(detail, 'Tool', record.tool, 'native-value');
      if (record.modelVersion) fact(detail, 'Version', record.modelVersion, 'native-value');
      fact(detail, 'Session', record.sessionId || 'Not recorded', 'muted');
      if (record.requestId) fact(detail, 'Request ID', record.requestId, 'muted');
    }
    const usage = summarizeRecordedUsage([change]);
    const totals = el('div', undefined, 'native-indent'); attestation.append(totals);
    fact(totals, 'Tokens', usage.totals ? `${formatTokens(usage.totals.input)} / ${formatTokens(usage.totals.output)} (input / output)` : 'Not available', 'native-value');
    if (usage.totals) fact(totals, 'Cache', `${formatTokens(usage.totals.cacheRead)} / ${formatTokens(usage.totals.cacheWrite)} / ${formatTokens(usage.totals.reasoning)} / ${formatTokens(usage.totals.total)} (read / write / reasoning / total)`, 'native-value');
    fact(totals, 'Cost', usage.costMicroUsd != null ? `${formatRecordedCost(usage.costMicroUsd)} USD` : 'Not recorded', 'native-value');

    const log = section(report, 'Change Ledger', 'provenance-log');
    for (const ledger of change.provenance) {
      if (!ledger.available) { line(log, ledger.reason || 'Ledger unavailable.', 'muted'); continue; }
      const info = el('div', undefined, 'native-indent'); log.append(info);
      fact(info, 'Session', ledger.session || 'Not recorded', 'native-value');
      fact(info, 'Agent', ledger.agent || 'Not recorded', 'native-value');
      fact(info, 'Plan ID', ledger.planId || 'Not recorded in this ledger', 'muted');
      line(info, `Nodes:  ${ledger.nodes.length}  Edges: ${ledger.edges.length}`);
      const actions = el('div', undefined, 'native-supplement'); log.append(actions);
      const metadata = el('details', undefined, 'native-supplement ledger-metadata');
      metadata.append(el('summary', 'Recorded ledger metadata'));
      // Keep the ledger's own order and kind names, including exploration [read].
      // Details are visible by default, not hidden behind dashboard accordions.
      for (const node of ledger.nodes) {
        const row = el('div', undefined, 'activity-row'); row.dataset.nodeId = node.id;
        const summary = el('p', undefined, 'activity-summary');
        summary.append(el('span', node.kind, 'activity-kind'), el('span', ' » ', 'muted'), doc.createTextNode(node.label));
        if (node.toolName) summary.append(el('span', ` [${node.toolName}]`, 'muted'));
        row.append(summary);
        if (node.detail) row.append(el('pre', actionDetail(node.detail, node.toolName), 'activity-detail'));
        const edges = ledger.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
        if (edges.length || node.durationMs != null) {
          const extra = el('div', undefined, 'activity-extra'); line(extra, `${node.kind} » ${node.label}`);
          if (node.durationMs != null) fact(extra, 'Duration', `${node.durationMs} ms`);
          if (edges.length) fact(extra, 'Recorded relationships', edges.map((edge) => `${edge.from} — ${edge.label} → ${edge.to}`).join('\n'));
          if (node.detail) extra.append(el('pre', node.detail));
          metadata.append(extra);
        }
        actions.append(row);
      }
      if (metadata.childElementCount > 1) log.append(metadata);
    }
    if (!change.provenance.length) line(log, 'No recorded ledger returned.', 'muted');

    // Editor-only affordances stay secondary to the native report.
    const supplement = el('details', undefined, 'native-supplement'); supplement.append(el('summary', 'Plan, intent & verification notes')); report.append(supplement);
    const intentSection = section(supplement, 'Plan & intent', 'linked-intent');
    const ambiguous = typedContext?.status === 'ambiguous' || !typedContext && legacyPlans.length > 1;
    line(intentSection, ambiguous ? 'Multiple recorded governing plan references were returned; no single plan was selected.'
      : intentContext?.status === 'unavailable' ? 'Native plan-resolution data is unsupported or does not match this change. No governing identity was inferred.'
      : typedContext?.status === 'partial' ? 'Plan/intent lookup is incomplete. Known recorded declarations and associations are shown below.'
      : typedContext?.status === 'missing' ? 'No governing plan_id was found in the returned change/turn records. Intent-document associations are separate from governing declarations.'
      : planId ? 'A governing plan_id is recorded. Its presence is not a validation or signature result.'
      : 'Native plan-resolution metadata is unavailable, and no plan_id is present in the returned ledgers. This is not a validation failure.',
      ambiguous ? 'notice intent-link-ambiguous' : 'intent-link-status');
    for (const binding of typedContext?.plans || []) {
      fact(intentSection, 'Recorded plan_id', binding.planId);
      fact(intentSection, 'Recorded source', `${binding.source} · session ${binding.sessionId}${binding.turnNumber != null ? ` · turn ${binding.turnNumber} (zero-based)` : ''}`, 'muted');
      fact(intentSection, 'Provenance', displayChangeHash(binding.provenanceHash), 'muted');
    }
    for (const reference of references) {
      const { id } = reference;
      const intent = state?.draft?.intents.find((item) => item.id === id);
      intentSection.append(el('h3', intent?.title || reference.identity?.title || id)); fact(intentSection, 'Intent', id);
      if (reference.identity?.uid) fact(intentSection, 'Intent UID', reference.identity.uid, 'muted');
      fact(intentSection, 'Relationship', [reference.governing ? 'Recorded governing plan reference' : '', reference.edited ? 'Intent document changed by this change (not itself a governing declaration)' : ''].filter(Boolean).join('; '));
      for (const association of typedContext?.associatedIntents.filter((item) => item.intent?.id === id) || []) {
        fact(intentSection, 'Intent document', association.path, 'muted');
        if (association.commitmentNodeIds.length) fact(intentSection, 'Causal edit evidence', `${association.commitmentNodeIds.join(', ')} — committed_via → ${association.patchNodeIds.join(', ')}`, 'muted');
      }
      let why = ''; try { if (intent?.body) why = readAtomicWhy(intent.body); } catch { /* Never infer rationale. */ }
      line(intentSection, why || 'Intent rationale unavailable.', 'intent-why');
      if (intent?.notice) line(intentSection, intent.notice, 'notice');
      if (intent?.canOpenSource) intentSection.append(button('Open linked intent', () => send({ action: 'openIntent', id })), doc.createTextNode('  '));
      if (intent) intentSection.append(button('Inspect stored attestation', () => send({ action: 'intent', id })));
    }
    for (const association of typedContext?.associatedIntents.filter((item) => !item.intent) || []) fact(intentSection, 'Associated document', `${association.path} (current intent identity unavailable)`);
    if (intentContext) {
      line(intentSection, intentContext.context, 'muted');
      intentContext.warnings.forEach((warning) => line(intentSection, warning, 'notice'));
    }
    const notes = section(supplement, 'Verification notes');
    line(notes, 'SHACL validation: not run by this query. Repository-wide 1:1 uniqueness: not checked. Missing metadata is not a validation failure.', 'muted shacl-status');
    fact(notes, 'Signature', change.signature);
    line(notes, change.provenanceNotice, 'muted');
    usage.warnings.forEach((warning) => line(notes, warning, 'notice'));
  }
  function renderAttestation(selection: Extract<EvidenceSelection, { kind: 'intent' }>) {
    main.querySelector('.stored-attestation')?.remove();
    const item = section(main, 'Stored intent attestation', 'stored-attestation');
    fact(item, 'Intent', selection.id); fact(item, 'Historical signature', selection.signature);
    fact(item, 'Stored-source freshness', selection.source); fact(item, 'Signer', selection.signer);
    fact(item, 'Signer trust', selection.trust); fact(item, 'Current editor buffer', selection.buffer);
    if (selection.reason) fact(item, 'Backend explanation', selection.reason);
    if (selection.canOpenSigned) item.append(button('Open exact stored signed document (read-only)', () => send({ action: 'openSigned' })));
  }
  return {
    dispose() { blast?.dispose(); interactive = false; state = undefined; selected = undefined; },
    receive(event) {
      if (event.type === 'state') {
        state = event.state; selected = undefined; interactive = true; main.inert = false;
        heading.textContent = `Atomic · ${state.view}`; status.textContent = `Inspecting only · working copy: ${state.workingCopyView}`;
        empty('Expand this view in the left pane, then select a change hash.');
      } else if (event.type === 'selection') {
        if (!state) return;
        interactive = true; main.inert = false;
        if (event.selection.kind === 'change') { selected = event.selection; renderChange(selected); }
        else renderAttestation(event.selection);
      } else if (event.type === 'busy') {
        interactive = false; main.inert = true; status.hidden = false; status.textContent = event.label;
        if (event.label !== 'Reading stored attestation…') { selected = undefined; empty(event.label); }
      } else {
        interactive = false; selected = undefined; main.inert = false;
        const message = event.type === 'invalidated' ? 'Repository state changed. Select the change again or refresh.' : event.message;
        status.textContent = message; empty(message);
      }
    }
  };
}

/** Display the native command/path preview when recognized, otherwise preserve text. */
function actionDetail(detail: string, tool?: string): string {
  try {
    const value: unknown = JSON.parse(detail);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (typeof record.command === 'string') return `$ ${record.command}`;
      if (typeof record.path === 'string') return `${tool === 'edit' ? 'edit: ' : ''}${record.path}`;
    }
  } catch { /* Plain-text details are already display-ready. */ }
  return detail;
}
