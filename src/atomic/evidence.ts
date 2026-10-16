import type { AtomicRepository } from 'nodeatomic' with { 'resolution-mode': 'import' };
import type { ChangeEvidence, EvidenceEdge, EvidenceNode, IntentEvidence, ProvenanceEvidence, SignedSnapshot } from '../shared/atomicEvidence';
import type { History } from './model';
import { readChangeMetadata } from './changeMetadata';
import { readChangeImpact } from './changeImpact';
import { readChangeIntentContext } from './changeIntentContext';

type ChangeDetail = Awaited<ReturnType<AtomicRepository['change']>>;
type Verification = Awaited<ReturnType<AtomicRepository['vault']['getSignedIntent']>>;
type Ledger = ChangeDetail['provenanceLedger'][number];
const MAX_PAYLOAD = 2 * 1024 * 1024;
const MAX_NODES = 500;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;

export function hashHex(value: unknown): string | undefined {
  return value instanceof Uint8Array && value.length === 32 ? Buffer.from(value).toString('hex') : undefined;
}

/** Core's Hash serializes to base32 in JSON; preserve it verbatim rather than guessing hash encodings. */
export function parseProvenance(ledger: Ledger, hash?: string): ProvenanceEvidence {
  const result: ProvenanceEvidence = { hash, schema: ledger.schema ?? '(missing schema)', available: false, nodes: [], edges: [] };
  if (ledger.schema !== 'atomic.prov.graph.v1') return { ...result, reason: 'Unsupported provenance schema; no relationships inferred.' };
  if (!ledger.payload || ledger.payload.length > MAX_PAYLOAD) return { ...result, reason: 'Provenance payload is missing or exceeds the 2 MiB display limit.' };
  try {
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(ledger.payload);
    const graph: unknown = JSON.parse(raw);
    if (!object(graph) || !Number.isInteger(graph.version) || Number(graph.version) < 1 || Number(graph.version) > 3 ||
        !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || graph.nodes.length > MAX_NODES || graph.edges.length > 2000) {
      throw new Error('Unsupported version or invalid/oversized graph shape');
    }
    const ids = new Set<string>();
    const nodes: EvidenceNode[] = graph.nodes.map((node: unknown) => {
      if (!object(node) || typeof node.id !== 'string' || !node.id || ids.has(node.id) ||
          typeof node.kind !== 'string' || typeof node.summary !== 'string') throw new Error('Invalid or duplicate provenance node');
      ids.add(node.id);
      const nonnegative = (value: unknown): number | undefined => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
      return { id: node.id, label: node.summary, kind: node.kind, loaded: true,
        timestamp: nonnegative(node.timestamp), toolName: text(node.tool_name), durationMs: nonnegative(node.duration_ms),
        detail: typeof node.detail === 'string' ? node.detail.slice(0, 32768) : undefined };
    });
    const edges: EvidenceEdge[] = graph.edges.map((edge: unknown) => {
      if (!object(edge) || typeof edge.from !== 'string' || typeof edge.to !== 'string' ||
          !ids.has(edge.from) || !ids.has(edge.to) || typeof edge.kind !== 'string') throw new Error('Invalid provenance edge');
      return { from: edge.from, to: edge.to, label: edge.kind };
    });
    return { ...result, available: true, nodes, edges, raw,
      agent: text(graph.agent_display_name) || text(graph.agent_name), session: text(graph.session_id),
      planId: text(graph.plan_id), previous: text(graph.previous) };
  } catch (error) {
    return { ...result, reason: `Malformed or unsupported provenance: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function changeEvidence(detail: ChangeDetail, expectedHash: string): ChangeEvidence {
  if (hashHex(detail.change?.hash?.value) !== expectedHash) throw new Error('Backend change hash does not match the selected change.');
  const metadata = readChangeMetadata(detail.metadata, expectedHash);
  return {
    kind: 'change', id: expectedHash, message: detail.change?.message || '(no message)',
    recordedAt: recordedDate(detail.change?.recordedAt),
    authors: (detail.change?.authors ?? []).map((author) => author.email ? `${author.name} <${author.email}>` : author.name || '(unnamed)'),
    dependencies: (detail.change?.dependencies ?? []).map((hash) => hashHex(hash.value)).filter((hash): hash is string => Boolean(hash)),
    // GetChange currently returns signature presence but no verification result. Never turn presence into validity.
    signature: detail.change?.hasSignature ? 'Signature present; not verified by this query' : 'No change signature reported by this query',
    provenance: detail.provenanceLedger.map((ledger, index) => parseProvenance(ledger, hashHex(detail.provenanceLedgerHashes[index]?.value))),
    provenanceNotice: 'Recorded attribution and causal relationships, not independent proof of authorship or successful verification. A “verification” activity is a recorded activity, not a cryptographic verification result.',
    metadata,
    blastRadius: readChangeImpact(detail.blastRadius, expectedHash),
    intentContext: readChangeIntentContext(detail.intentContext, expectedHash),
    affectedPaths: metadata.status === 'available' ? metadata.affectedPaths : [...new Set((detail.fileContents || []).map((file) => file.path).filter((path): path is string => typeof path === 'string' && Boolean(path)))].slice(0, 2000)
  };
}

function recordedDate(value: { seconds?: unknown; nanos?: unknown } | null | undefined): string | undefined {
  if (value?.seconds == null) return undefined;
  const seconds = Number(String(value.seconds));
  const nanos = value.nanos == null ? 0 : Number(value.nanos);
  if (!Number.isSafeInteger(seconds) || !Number.isInteger(nanos) || nanos < 0 || nanos >= 1e9) return undefined;
  const date = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function intentEvidence(id: string, verified: Verification): { selection: IntentEvidence; snapshot?: SignedSnapshot } {
  const revision = hashHex(verified.signedRevision?.value);
  const document = verified.signedDocument;
  let snapshot: SignedSnapshot | undefined;
  if (document) {
    if (!revision || Buffer.byteLength(document, 'utf8') > MAX_PAYLOAD) throw new Error('Signed document is missing its revision or exceeds the 2 MiB display limit.');
    // Validate syntax without reserializing: the immutable viewer retains the exact backend string.
    if (!object(JSON.parse(document))) throw new Error('Stored signed document is not a JSON object.');
    snapshot = { intentId: id, revision, document, signer: verified.signerDid || 'Unknown signer' };
  }
  return { snapshot, selection: {
    kind: 'intent', id,
    signature: verified.signatureValid === true ? 'valid' : verified.signatureValid === false ? 'invalid' : 'not verified',
    source: verified.sourceFresh === true ? 'matches stored source' : verified.sourceFresh === false ? 'stored source changed' : 'unknown',
    signer: verified.signerDid || 'Unknown signer', trust: 'unknown', buffer: 'not compared', revision,
    reason: verified.reason ?? undefined, signedSourceHash: verified.signedSourceHash ?? undefined,
    currentSourceHash: verified.currentSourceHash ?? undefined, canOpenSigned: Boolean(snapshot)
  } };
}

export function dependencyGraph(entries: History['entries']): { nodes: EvidenceNode[]; edges: EvidenceEdge[] } {
  const nodes = new Map<string, EvidenceNode>();
  const edges = new Map<string, EvidenceEdge>();
  for (const entry of entries) {
    const id = hashHex(entry.hash?.value);
    if (!id) continue;
    nodes.set(id, { id, label: entry.message || '(no message)', kind: 'change', loaded: true });
  }
  for (const entry of entries) {
    const id = hashHex(entry.hash?.value);
    if (!id) continue;
    for (const dependency of entry.dependencies ?? []) {
      const dep = hashHex(dependency.value);
      if (!dep) continue;
      if (!nodes.has(dep)) nodes.set(dep, { id: dep, label: `${dep.slice(0, 12)} · outside loaded history`, kind: 'change', loaded: false });
      edges.set(`${id}:${dep}`, { from: id, to: dep, label: 'depends on' });
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
