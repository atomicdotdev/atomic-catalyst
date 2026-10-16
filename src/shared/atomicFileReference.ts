// File references are workspace-relative paths, not executable URI schemes.
export function normalizeAtomicFileReference(value: string): string | null {
  const normalized = value.replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(normalized) || /[\0\r\n]/.test(normalized)) {
    return null;
  }
  const segments: string[] = [];
  for (const segment of normalized.split('/')) {
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (!segments.length) {
        return null;
      }
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return segments.length ? segments.join('/') : null;
}
