import type { ChangeIntentContext, ChangeIntentIdentity } from '../shared/atomicEvidence';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown): string => {
  if (!object(value) || !(value.value instanceof Uint8Array) || value.value.length !== 32) throw new Error('Invalid provenance/change identity');
  return Buffer.from(value.value).toString('hex');
};
const text = (value: unknown, max = 32768): string => { if (typeof value !== 'string' || value.length > max) throw new Error('Invalid intent context text'); return value; };
const list = (value: unknown, max: number): unknown[] => { if (!Array.isArray(value) || value.length > max) throw new Error('Invalid/oversized intent context list'); return value; };
const path = (value: unknown): string => {
  const result = text(value);
  if (!result.startsWith('.vault/intents/') || result.split(/[\\/]/).includes('..') || result.includes('\0')) throw new Error('Invalid intent source path');
  return result;
};
const identity = (value: unknown): ChangeIntentIdentity | undefined => {
  if (value == null) return undefined;
  if (!object(value)) throw new Error('Invalid intent identity');
  const id = text(value.id, 512); if (!id) throw new Error('Empty intent identity');
  return { id, uid: text(value.uid, 512), title: text(value.title), path: path(value.path) };
};

/** Native typed context, bound to the selected change. No JS ledger/path resolver. */
export function readChangeIntentContext(value: unknown, expectedHash: string): ChangeIntentContext | undefined {
  if (value == null) return undefined;
  try {
    if (!object(value) || value.schemaVersion !== 1 || hash(value.changeHash) !== expectedHash ||
      typeof value.status !== 'string' || !['recorded', 'missing', 'ambiguous', 'partial'].includes(value.status) || value.validationStatus !== 'not_checked') throw new Error('Unsupported/mismatched change intent context');
    const plans = list(value.plans, 128).map((plan) => {
      if (!object(plan) || typeof plan.source !== 'string' || !['provenance_graph', 'session_turn'].includes(plan.source)) throw new Error('Invalid plan declaration source');
      const planId = text(plan.planId, 512); if (!planId.trim()) throw new Error('Empty recorded plan_id');
      if (plan.turnNumber != null && typeof plan.turnNumber !== 'number') throw new Error('Invalid plan turn');
      const turnNumber = plan.turnNumber == null ? undefined : plan.turnNumber as number;
      if (turnNumber !== undefined && (!Number.isInteger(turnNumber) || turnNumber < 0 || turnNumber > 0xffffffff)) throw new Error('Invalid plan turn');
      if (plan.source === 'session_turn' && turnNumber === undefined) throw new Error('Session declaration has no matched turn');
      return { planId, source: plan.source as 'provenance_graph' | 'session_turn', sessionId: text(plan.sessionId, 512),
        provenanceHash: hash(plan.provenanceHash), turnNumber, intent: identity(plan.intent) };
    });
    const associatedIntents = list(value.associatedIntents, 128).map((association) => {
      if (!object(association)) throw new Error('Invalid intent association');
      const sourcePath = path(association.path), intent = identity(association.intent);
      if (intent && intent.path !== sourcePath) throw new Error('Intent association identity/path mismatch');
      return { path: sourcePath, intent,
        commitmentNodeIds: list(association.commitmentNodeIds, 256).map((id) => text(id, 512)),
        patchNodeIds: list(association.patchNodeIds, 256).map((id) => text(id, 512)),
        provenanceHashes: list(association.provenanceHashes, 32).map(hash) };
    });
    const planId = value.planId == null ? undefined : text(value.planId, 512);
    if (planId && !plans.some((plan) => plan.planId === planId) || value.status === 'ambiguous' && (planId || plans.length < 2) || value.status === 'missing' && plans.length || value.status === 'recorded' && (!planId || !plans.length)) throw new Error('Inconsistent plan resolution');
    return { status: value.status as ChangeIntentContext['status'], planId, plans, associatedIntents,
      warnings: list(value.warnings, 100).map((warning) => text(warning)), validationStatus: 'not_checked', context: text(value.context) };
  } catch (error) {
    return { status: 'unavailable', plans: [], associatedIntents: [], warnings: [error instanceof Error ? error.message : String(error)], validationStatus: 'not_checked', context: 'Native plan resolution unavailable.' };
  }
}
