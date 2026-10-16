import type { ChangeEvidence, DraftObservation, EvidenceNode, ProvenanceEvidence } from '../../src/shared/atomicEvidence';

export type Activity = { key: string; node: EvidenceNode; ledger: ProvenanceEvidence; changes: string[] };
export function activityType(node: EvidenceNode): string {
  const tool = node.toolName?.split(/[./]/).pop()?.toLowerCase();
  return tool === 'read' || tool === 'read_file' ? 'read' : node.kind;
}

/** Presentation only: exact ledger deduplication, never infer paths/usage from summaries. */
export function projectDraft(draft: DraftObservation, intentId = '', path = '') {
  const changes = draft.changes.filter((change) => !intentId || change.provenance.some((ledger) => ledger.planId === intentId));
  const files = new Map<string, ChangeEvidence[]>();
  for (const change of changes) for (const file of change.affectedPaths || []) {
    const group = files.get(file) || []; group.push(change); files.set(file, group);
  }
  const events = new Map<string, Activity>();
  for (const change of [...changes].reverse()) for (const ledger of change.provenance) {
    if (!ledger.available || (intentId && ledger.planId !== intentId)) continue;
    const identity = ledger.hash || `${ledger.schema}\0${ledger.raw || JSON.stringify([ledger.nodes, ledger.edges])}`;
    for (const node of ledger.nodes) {
      const key = `${identity}\0${node.id}`;
      const existing = events.get(key);
      if (existing) { if (!existing.changes.includes(change.id)) existing.changes.push(change.id); }
      else events.set(key, { key, node, ledger, changes: [change.id] });
    }
  }
  let activities = [...events.values()];
  const timed = activities.length > 0 && activities.every(({ node }) => node.timestamp != null && node.timestamp > 0);
  if (timed) activities.sort((a, b) => a.node.timestamp! - b.node.timestamp!);
  const pathChanges = new Set((files.get(path) || []).map((change) => change.id));
  if (path) activities = activities.filter((event) => event.changes.some((id) => pathChanges.has(id)));
  return { changes, files: [...files].sort(([a], [b]) => a.localeCompare(b)), activities, timed,
    tools: [...new Set(changes.flatMap((change) => change.provenance.filter((ledger) => !intentId || ledger.planId === intentId).map((ledger) => ledger.agent).filter(Boolean)))] };
}
