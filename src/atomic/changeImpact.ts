import type { BlastRadius } from '../shared/atomicEvidence';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
/** Only native, source-bound structural observations cross the webview boundary. */
export function readChangeImpact(value: unknown, expectedHash: string): BlastRadius | undefined {
  if (value == null) return undefined;
  try {
    if (!object(value) || !object(value.changeHash) || !(value.changeHash.value instanceof Uint8Array) ||
      Buffer.from(value.changeHash.value).toString('hex') !== expectedHash || !['structural', 'private', 'partial'].includes(String(value.mode)) ||
      !Array.isArray(value.files) || value.files.length > 2000 || !Array.isArray(value.edges) || value.edges.length > 4000 || typeof value.context !== 'string') throw new Error('Invalid blast-radius projection/source');
    const paths = new Map<string, 1 | 2>();
    const files = value.files.map((file) => {
      if (!object(file) || typeof file.path !== 'string' || !file.path || file.path.length > 32768 || paths.has(file.path) || (file.hop !== 1 && file.hop !== 2)) throw new Error('Invalid blast-radius file');
      paths.set(file.path, file.hop);
      return { path: file.path, hop: file.hop as 1 | 2 };
    });
    const edges = value.edges.map((edge) => {
      if (!object(edge) || typeof edge.fromPath !== 'string' || !paths.has(edge.fromPath) || typeof edge.toPath !== 'string' || paths.get(edge.toPath) !== 1 ||
        (edge.relation !== 'calls' && edge.relation !== 'includes')) throw new Error('Invalid blast-radius edge');
      return { fromPath: edge.fromPath, toPath: edge.toPath, relation: edge.relation as 'calls' | 'includes' };
    });
    if (files.some((file) => file.hop === 2 && !edges.some((edge) => edge.fromPath === file.path))) throw new Error('Indirect file lacks structural evidence');
    if (value.mode === 'private' && (files.some((file) => file.hop === 2) || edges.length || Array.isArray(value.warnings) && value.warnings.length)) throw new Error('Private-change claim contradicts structural evidence/coverage');
    return { mode: value.mode as BlastRadius['mode'], files, edges, context: value.context.slice(0, 32768),
      warnings: Array.isArray(value.warnings) ? value.warnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 100) : [] };
  } catch (error) {
    return { mode: 'unavailable', files: [], edges: [], context: 'Structural analysis unavailable.', warnings: [error instanceof Error ? error.message : String(error)] };
  }
}
