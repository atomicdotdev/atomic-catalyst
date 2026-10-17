import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { smokeRuntime } from './atomicRuntimeSmoke.mjs';

// Bundle only the already-built JS consumer. Native libraries belong to the
// installed Atomic runtime, never the VSIX. Do not discover/build Rust sources.
const entry = fileURLToPath(import.meta.resolve('nodeatomic'));
await mkdir('dist/nodeatomic', { recursive: true });
const result = await Bun.build({ entrypoints: [entry], target: 'node', format: 'esm',
  outdir: 'dist/nodeatomic', naming: 'index.mjs' });
if (!result.success) throw new AggregateError(result.logs, 'nodeatomic runtime build failed');
// Test actual lazy loading in Node, not Bun. With an explicit runtime selected,
// also exercise native protobuf dispatch rather than treating import as proof.
await smokeRuntime(new URL('../dist/nodeatomic/index.mjs', import.meta.url));
