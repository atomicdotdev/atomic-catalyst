// Presentation-only DTOs. No native objects, byte buffers, service methods, or filesystem access cross this boundary.
export type EvidenceNode = { id: string; label: string; kind: string; loaded: boolean;
  timestamp?: number; toolName?: string; durationMs?: number; detail?: string };
export type EvidenceEdge = { from: string; to: string; label: string };
export type IntentSummary = { id: string; title: string };
export type ViewSummary = { name: string; scope: 'draft' | 'shared' | 'unknown'; parent?: string;
  current: boolean; changeCount?: number; ownChangeCount?: number; inheritedChangeCount?: number };
export type DraftIntent = IntentSummary & { body?: string; canOpenSource: boolean; notice?: string };
export type DraftObservation = { changes: ChangeEvidence[]; intents: DraftIntent[]; warnings: string[] };
// Decimal strings preserve native uint64 counters across the webview boundary.
export type RecordedTokens = { input: string; output: string; total: string; cacheRead: string; cacheWrite: string; reasoning: string };
export type RecordedUsage = { index: number; vendor: string; model: string; modelVersion?: string; tool: string;
  requestId?: string; sessionId?: string; sessionSlug?: string; stepCount?: number; tokens: RecordedTokens; costMicroUsd?: string };
export type ChangeGraphSummary = { verticesAdded: string; edgesChanged: string; contentBytes: string; filesChanged: string;
  files: { symbol: string; path: string; info: string }[] };
export type BlastRadius = { mode: 'structural' | 'private' | 'partial' | 'unavailable';
  files: { path: string; hop: 1 | 2 }[]; edges: { fromPath: string; toPath: string; relation: 'calls' | 'includes' }[];
  warnings: string[]; context: string };
export type ChangeIntentIdentity = { id: string; uid: string; title: string; path: string };
export type ChangeIntentContext = { status: 'recorded' | 'missing' | 'ambiguous' | 'partial' | 'unavailable'; planId?: string;
  plans: { planId: string; source: 'provenance_graph' | 'session_turn'; sessionId: string; provenanceHash: string; turnNumber?: number; intent?: ChangeIntentIdentity }[];
  associatedIntents: { path: string; intent?: ChangeIntentIdentity; commitmentNodeIds: string[]; patchNodeIds: string[]; provenanceHashes: string[] }[];
  warnings: string[]; validationStatus: 'not_checked'; context: string };
export type ChangeMetadataEvidence = { status: 'available' | 'unavailable' | 'unsupported' | 'invalid';
  usage: RecordedUsage[]; affectedPaths: string[]; graphSummary?: ChangeGraphSummary; warnings: string[] };
export type ExplorerState = {
  repository: string;
  view: string;
  views: string[];
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  intents: IntentSummary[];
  intentError?: string;
  more: boolean;
  workingCopyFiles: number;
  workingCopyView: string;
  viewInfo?: ViewSummary;
  viewSummaries?: ViewSummary[];
  draft?: DraftObservation;
};
export type ProvenanceEvidence = {
  hash?: string;
  schema: string;
  available: boolean;
  reason?: string;
  agent?: string;
  session?: string;
  planId?: string;
  previous?: string;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  raw?: string;
};
export type ChangeEvidence = {
  kind: 'change';
  id: string;
  message: string;
  recordedAt?: string;
  authors: string[];
  dependencies: string[];
  signature: string;
  provenance: ProvenanceEvidence[];
  provenanceNotice: string;
  affectedPaths?: string[];
  metadata?: ChangeMetadataEvidence;
  blastRadius?: BlastRadius;
  diffPaths?: string[]; // allowlisted, reconstructable text files; no content bytes
  intentContext?: ChangeIntentContext;
};
export type IntentEvidence = {
  kind: 'intent';
  id: string;
  signature: 'valid' | 'invalid' | 'not verified';
  source: 'matches stored source' | 'stored source changed' | 'unknown';
  signer: string;
  trust: 'unknown';
  buffer: 'not compared';
  revision?: string;
  signedSourceHash?: string;
  currentSourceHash?: string;
  reason?: string;
  canOpenSigned: boolean;
};
export type EvidenceSelection = ChangeEvidence | IntentEvidence;
export type ExplorerEvent =
  | { type: 'state'; state: ExplorerState }
  | { type: 'selection'; selection: EvidenceSelection }
  | { type: 'busy'; label: string }
  | { type: 'error'; message: string }
  | { type: 'invalidated' };
export type SignedSnapshot = { intentId: string; revision: string; document: string; signer: string };
