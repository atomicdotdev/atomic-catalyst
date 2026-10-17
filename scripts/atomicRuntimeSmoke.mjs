import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function hasRuntimeOverride(env = process.env) {
  return Boolean(env.ATOMIC_RUNTIME_DIR || env.LIBATOMIC_ADDON || env.ATOMIC_BIN);
}

/** Separate Node processes keep discovery/cache state isolated and ensure an
 * extracted JS bundle works without node_modules or its original checkout. */
export async function smokeRuntime(url, { native = hasRuntimeOverride(), env = process.env } = {}) {
  const node = process.versions.bun ? 'node' : process.execPath;
  const run = (source, childEnv) => {
    const result = spawnSync(node, ['--input-type=module', '-e', source], {
      env: childEnv, encoding: 'utf8', timeout: 30_000,
    });
    if (result.error || result.status !== 0) {
      throw new Error(`nodeatomic Node smoke failed: ${result.error?.message ?? result.stderr ?? result.signal}`);
    }
  };
  const entry = JSON.stringify(url.href);
  const imports = `
    import assert from 'node:assert/strict';
    const m = await import(${entry});
    assert.equal(typeof m.openRepository, 'function');
    assert.equal(typeof m.call, 'function');
    assert.equal(typeof m.AtomicRuntimeError, 'function', 'Consumer needs the installed-runtime loader');
    assert.ok(m.proto.StatusRequest.encode({}).finish() instanceof Uint8Array);
  `;
  // Keep PATH for starting Node from Bun, then clear runtime discovery inside
  // the child before importing the consumer. No bundled fallback is permitted.
  run(`${imports}
    delete process.env.ATOMIC_RUNTIME_DIR;
    delete process.env.LIBATOMIC_ADDON;
    delete process.env.ATOMIC_BIN;
    process.env.PATH = '';
    delete process.env.Path;
    await assert.rejects(m.call('/atomic.Unknown/Unknown', new Uint8Array()), e =>
      e instanceof m.AtomicRuntimeError &&
      ['ATOMIC_RUNTIME_NOT_FOUND', 'ATOMIC_UNSUPPORTED_PLATFORM', 'ATOMIC_NODE_API_UNSUPPORTED'].includes(e.code));
  `, env);
  if (native) {
    run(`${imports}
      await assert.rejects(m.call('/atomic.Unknown/Unknown', new Uint8Array()),
        e => !(e instanceof m.AtomicRuntimeError) && e.code === 'GenericFailure' &&
          /local method is not supported: \\/atomic\\.Unknown\\/Unknown/.test(e.message));
    `, env);
  }
  console.log(`nodeatomic smoke passed: lazy import/codecs, missing-runtime rejection${native ? ', installed native dispatch' : ' (native dispatch not requested)'}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await smokeRuntime(new URL('../dist/nodeatomic/index.mjs', import.meta.url), {
    native: process.argv.includes('--native') || hasRuntimeOverride(),
  });
}
