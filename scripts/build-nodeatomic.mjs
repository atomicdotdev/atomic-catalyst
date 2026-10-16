import { mkdir, copyFile, access, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Consume only a previously built consumer and addon. Never invoke Cargo or discover producer sources.
const entry = fileURLToPath(import.meta.resolve('nodeatomic'));
const addon = resolve(dirname(entry), '../native/libatomic.node');
try { await access(addon); }
catch { throw new Error('nodeatomic needs an explicitly installed prebuilt addon. Install/build it in nodeatomic before building Catalyst.'); }
await mkdir('dist/nodeatomic', { recursive: true });
await mkdir('dist/native', { recursive: true });
const result = await Bun.build({ entrypoints: [entry], target: 'node', format: 'esm',
  outdir: 'dist/nodeatomic', naming: 'index.mjs' });
if (!result.success) throw new AggregateError(result.logs, 'nodeatomic runtime build failed');
// native.ts uses createRequire(import.meta.url) and ../native/libatomic.node.
// Publish atomically rather than overwriting a binary an extension host may
// already have mapped. A host restart is still needed to load the new addon.
const stagedAddon = `dist/native/.libatomic-${randomUUID()}.node`;
try { await copyFile(addon, stagedAddon); await rename(stagedAddon, 'dist/native/libatomic.node'); }
finally { await rm(stagedAddon, { force: true }); }
// Smoke-test using Node, not Bun: this is the extension host's runtime family.
const child = Bun.spawn(['node', '--input-type=module', '-e',
  `const m = await import(${JSON.stringify(new URL('../dist/nodeatomic/index.mjs', import.meta.url).href)}); if (typeof m.openRepository !== 'function') throw new Error('Missing repository consumer');`],
  { stdout: 'inherit', stderr: 'inherit' });
if (await child.exited !== 0) throw new Error('Packaged nodeatomic runtime failed to load in Node');
