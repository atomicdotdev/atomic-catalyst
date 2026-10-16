import type { ChangeGraphSummary, ChangeMetadataEvidence, RecordedUsage } from '../shared/atomicEvidence';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const optionalText = (value: unknown) => typeof value === 'string' && value.trim() ? value : undefined;
const uint64 = (value: unknown): string => {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Unsafe integer in native change metadata');
  const text = String(value);
  if (!/^(0|[1-9][0-9]{0,19})$/.test(text) || BigInt(text) > 18446744073709551615n) throw new Error('Invalid uint64 in native change metadata');
  return text;
};

/** Only the typed privacy-limited service projection crosses into UI DTOs. */
export function readChangeMetadata(value: unknown, expectedHash: string): ChangeMetadataEvidence {
  const result: ChangeMetadataEvidence = { status: 'unavailable', usage: [], affectedPaths: [], warnings: [] };
  if (value == null) return { ...result, warnings: ['Change metadata was not returned by the native runtime.'] };
  if (!object(value) || value.schemaVersion !== 1) return { ...result, status: 'unsupported', warnings: ['Unsupported change metadata schema; usage was not interpreted.'] };
  try {
    if (!object(value.changeHash) || !(value.changeHash.value instanceof Uint8Array) ||
      Buffer.from(value.changeHash.value).toString('hex') !== expectedHash) throw new Error('Metadata change hash does not match');
    if (!Array.isArray(value.usage) || value.usage.length > 2000 || !Array.isArray(value.affectedPaths) || value.affectedPaths.length > 2000) throw new Error('Invalid/oversized metadata projection');
    const seen = new Set<number>();
    const usage: RecordedUsage[] = value.usage.map((entry) => {
      if (!object(entry) || !Number.isInteger(entry.recordIndex) || Number(entry.recordIndex) < 0 || Number(entry.recordIndex) > 0xffffffff ||
        seen.has(Number(entry.recordIndex)) || typeof entry.vendor !== 'string' || typeof entry.model !== 'string' || typeof entry.tool !== 'string' || !object(entry.tokens)) throw new Error('Invalid usage record');
      seen.add(Number(entry.recordIndex));
      const tokens = entry.tokens;
      return { index: Number(entry.recordIndex), vendor: entry.vendor, model: entry.model, tool: entry.tool,
        modelVersion: optionalText(entry.modelVersion), requestId: optionalText(entry.requestId), sessionId: optionalText(entry.sessionId), sessionSlug: optionalText(entry.sessionSlug),
        stepCount: typeof entry.stepCount === 'number' && Number.isInteger(entry.stepCount) && entry.stepCount >= 0 && entry.stepCount <= 0xffffffff ? entry.stepCount : undefined,
        tokens: { input: uint64(tokens.inputTokens), output: uint64(tokens.outputTokens), total: uint64(tokens.totalTokens),
          cacheRead: uint64(tokens.cacheReadTokens), cacheWrite: uint64(tokens.cacheWriteTokens), reasoning: uint64(tokens.reasoningTokens) },
        costMicroUsd: entry.costMicroUsd != null ? uint64(entry.costMicroUsd) : undefined };
    });
    if (value.affectedPaths.some((path) => typeof path !== 'string' || !path)) throw new Error('Invalid affected path');
    return { status: 'available', usage, affectedPaths: [...new Set(value.affectedPaths as string[])], graphSummary: readGraphSummary(value.graphSummary),
      warnings: Array.isArray(value.warnings) ? value.warnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 100) : [] };
  } catch (error) {
    return { ...result, status: 'invalid', warnings: [`Invalid change metadata: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

function readGraphSummary(value: unknown): ChangeGraphSummary | undefined {
  if (value == null) return undefined; // Older addons omit the additive field.
  if (!object(value) || !Array.isArray(value.files) || value.files.length > 2000) throw new Error('Invalid/oversized graph summary');
  const paths = new Set<string>();
  const files = value.files.map((file) => {
    if (!object(file) || typeof file.symbol !== 'string' || !file.symbol || typeof file.path !== 'string' || !file.path ||
      typeof file.info !== 'string' || !file.info || file.symbol.length > 32 || file.path.length > 32768 || file.info.length > 32768 || paths.has(file.path)) throw new Error('Invalid graph summary file');
    paths.add(file.path);
    return { symbol: file.symbol, path: file.path, info: file.info };
  });
  return { verticesAdded: uint64(value.verticesAdded), edgesChanged: uint64(value.edgesChanged), contentBytes: uint64(value.contentBytes),
    filesChanged: uint64(value.filesChanged), files };
}
