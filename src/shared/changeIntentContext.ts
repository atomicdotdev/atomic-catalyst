import type { ChangeEvidence, ChangeIntentIdentity } from './atomicEvidence';
export type IntentReference = { id: string; identity?: ChangeIntentIdentity; governing: boolean; edited: boolean };

/** Present backend classifications; never infer governing identity from paths. */
export function intentReferences(change: ChangeEvidence): IntentReference[] {
  const references = new Map<string, IntentReference>();
  const add = (id: string, identity: ChangeIntentIdentity | undefined, governing: boolean, edited: boolean) => {
    const current = references.get(id);
    if (current) { current.governing ||= governing; current.edited ||= edited; current.identity ||= identity; }
    else references.set(id, { id, identity, governing, edited });
  };
  if (change.intentContext) {
    if (change.intentContext.status === 'unavailable') return [];
    for (const plan of change.intentContext.plans) add(plan.intent?.id || plan.planId, plan.intent, true, false);
    for (const association of change.intentContext.associatedIntents) if (association.intent) add(association.intent.id, association.intent, false, true);
  } else {
    // Older producer: only display the actual plan_id it returned, not guesses.
    for (const graph of change.provenance) if (graph.planId) add(graph.planId, undefined, true, false);
  }
  return [...references.values()];
}
