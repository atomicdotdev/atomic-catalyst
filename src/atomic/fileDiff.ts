// Host-only snapshots. File contents never cross the webview message boundary.
export type RecordedFileDiff = Readonly<{ path: string; before: string; after: string }>;
export const MAX_REVISION_BYTES = 8 * 1024 * 1024;
export const MAX_DIFF_CACHE_BYTES = 32 * 1024 * 1024;

/** Missing is not empty: only an explicitly absent side represents add/delete. */
export function revisionText(value: Uint8Array | null | undefined, exists?: boolean | null): string {
  if (value == null) {
    if (exists === false) return '';
    throw new Error('Recorded file content is unavailable; no empty revision was substituted.');
  }
  if (!(value instanceof Uint8Array) || exists === false) throw new Error('Invalid recorded revision.');
  if (value.byteLength > MAX_REVISION_BYTES) throw new Error('File is too large for the Atomic text diff (8 MiB per revision).');
  if (value.includes(0)) throw new Error('Binary files cannot be opened in the Atomic text diff.');
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(value); }
  catch { throw new Error('Non-UTF-8 file cannot be opened in the Atomic text diff.'); }
}

export function recordedFileDiff(file: { path?: string | null; before?: Uint8Array | null; after?: Uint8Array | null;
  beforeExists?: boolean | null; afterExists?: boolean | null; isDirectory?: boolean | null }): RecordedFileDiff {
  if (!file.path || file.isDirectory) throw new Error('A file diff requires a regular file, not a directory.');
  if (file.before == null && file.after == null && file.beforeExists === false && file.afterExists === false) throw new Error('No file revision exists on either side.');
  return Object.freeze({ path: file.path, before: revisionText(file.before, file.beforeExists), after: revisionText(file.after, file.afterExists) });
}

export function diffBytes(diff: RecordedFileDiff): number { return Buffer.byteLength(diff.before, 'utf8') + Buffer.byteLength(diff.after, 'utf8'); }
