import type { ChangeEvidence, RecordedTokens, RecordedUsage } from '../../src/shared/atomicEvidence';

export function formatTokens(value: string): string { return BigInt(value).toLocaleString('en-US'); }
export function formatRecordedCost(value: string): string {
  const micro = BigInt(value);
  return `$${(micro / 1000000n).toLocaleString('en-US')}.${(micro % 1000000n).toString().padStart(6, '0')}`;
}

/** No pricing, number coercion, or per-session deduplication. Unknown is not zero. */
export function summarizeRecordedUsage(input: ChangeEvidence[]) {
  const changes = [...new Map(input.map((change) => [change.id, change])).values()];
  const groups = new Map<string, { usage: RecordedUsage; fingerprint: string; conflict: boolean }>();
  const warnings = new Set<string>();
  const displayed: RecordedUsage[] = [];
  let missingChanges = 0, excludedUnidentified = 0;
  for (const change of changes) {
    const metadata = change.metadata;
    if (!metadata || metadata.status !== 'available') missingChanges++;
    metadata?.warnings.forEach((warning) => warnings.add(warning));
    if (metadata?.status !== 'available') continue;
    for (const usage of metadata.usage) {
      displayed.push(usage);
      if (!usage.requestId && changes.length > 1) { excludedUnidentified++; continue; }
      const key = usage.requestId ? JSON.stringify([usage.vendor, usage.model, usage.requestId]) : JSON.stringify([change.id, usage.index]);
      const fingerprint = JSON.stringify([usage.tokens, usage.costMicroUsd, usage.sessionId, usage.modelVersion, usage.tool]);
      const previous = groups.get(key);
      if (previous) { if (previous.fingerprint !== fingerprint) previous.conflict = true; }
      else groups.set(key, { usage, fingerprint, conflict: false });
    }
  }
  const conflicts = [...groups.values()].filter((group) => group.conflict).length;
  const records = [...groups.values()].filter((group) => !group.conflict).map((group) => group.usage);
  if (missingChanges) warnings.add(`${missingChanges} loaded change(s) have unavailable/unsupported/invalid metadata; totals cover only decoded records.`);
  if (excludedUnidentified) warnings.add(`${excludedUnidentified} usage entry/entries lack a request ID and were not totalled across multiple changes. Inspect their per-change values below.`);
  if (conflicts) warnings.add(`${conflicts} request identity/identities have conflicting recorded metadata and were excluded, not counted twice or resolved by guessing.`);
  const totals = records.length ? Object.fromEntries((['input', 'output', 'total', 'cacheRead', 'cacheWrite', 'reasoning'] as const)
    .map((field) => [field, records.reduce((sum, record) => sum + BigInt(record.tokens[field]), 0n).toString()])) as RecordedTokens : undefined;
  const costRecords = records.filter((record) => record.costMicroUsd != null);
  const costMicroUsd = costRecords.length ? costRecords.reduce((sum, record) => sum + BigInt(record.costMicroUsd!), 0n).toString() : undefined;
  const costMissing = records.length - costRecords.length;
  if (costMissing) warnings.add(`${costMissing} included usage record(s) have no valid recorded cost; the cost subtotal excludes them.`);
  return { records, totals, costMicroUsd, costMissing, missingChanges, excludedUnidentified, conflicts, warnings: [...warnings],
    partial: missingChanges > 0 || excludedUnidentified > 0 || conflicts > 0,
    models: [...new Set(displayed.map((usage) => [usage.vendor, usage.model, usage.modelVersion].filter(Boolean).join(' · ')))],
    tools: [...new Set(displayed.map((usage) => usage.tool).filter(Boolean))] };
}
