import type { SignedSnapshot } from '../shared/atomicEvidence';

export function escapeEvidenceHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

/** Script-free immutable display; preserve the exact backend string, never lift mutable editor text. */
export function signedSnapshotHtml(snapshot: SignedSnapshot): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><title>Stored signed intent</title></head><body><h1>Stored signed intent</h1><p>Intent: ${escapeEvidenceHtml(snapshot.intentId)}</p><p>Signed revision: ${escapeEvidenceHtml(snapshot.revision)}</p><p>Signer: ${escapeEvidenceHtml(snapshot.signer)}</p><p>Frozen repository-wide stored document. Not the current editor buffer. Signature validity does not establish signer trust.</p><pre>${escapeEvidenceHtml(snapshot.document)}</pre></body></html>`;
}
