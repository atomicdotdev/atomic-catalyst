import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { smokeRuntime } from './atomicRuntimeSmoke.mjs';

// Use the ZIP/XML tooling already declared by our VSCE development dependency.
const tooling = createRequire(import.meta.resolve('@vscode/vsce'));
const { open } = tooling('yauzl');
const { parseStringPromise } = tooling('xml2js');
const selected = new Set(['extension.vsixmanifest', 'extension/package.json', 'extension/dist/nodeatomic/index.mjs']);

async function readArchive(path) {
  return new Promise((resolveArchive, reject) => {
    open(path, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) return reject(error);
      const paths = new Set(), contents = new Map();
      const fail = (error) => { zip.close(); reject(error); };
      zip.on('error', fail);
      zip.on('end', () => resolveArchive({ paths, contents }));
      zip.on('entry', (entry) => {
        if (paths.has(entry.fileName)) return fail(new Error(`Duplicate VSIX entry: ${entry.fileName}`));
        paths.add(entry.fileName);
        if (!selected.has(entry.fileName)) return zip.readEntry();
        if (entry.uncompressedSize > 8 * 1024 * 1024) return fail(new Error(`Oversized VSIX metadata/runtime entry: ${entry.fileName}`));
        zip.openReadStream(entry, (error, stream) => {
          if (error) return fail(error);
          const chunks = [];
          stream.on('error', fail);
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            contents.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
    });
  });
}

export function validateUniversalContents(paths, identity, pkg, expectedPackage = pkg) {
  assert.ok(identity, 'Missing VSIX Identity');
  assert.ok(!identity.TargetPlatform || identity.TargetPlatform === 'universal', `VSIX is platform-targeted: ${identity.TargetPlatform}`);
  assert.ok(!pkg.__metadata?.targetPlatform || pkg.__metadata.targetPlatform === 'universal', 'Package has platform-specific metadata');
  for (const name of paths) {
    assert.ok(!/(?:^|\/)native\/|\.(?:node|dylib|dll|exe|so(?:\.[^/]+)?)$/i.test(name), `Native payload is forbidden in a universal VSIX: ${name}`);
    assert.ok(!/^extension\/(?:\.atomic|\.vault|\.git|node_modules)\//.test(name), `Private/dependency directory must not ship: ${name}`);
  }
  for (const key of ['name', 'publisher', 'version', 'displayName']) {
    assert.equal(pkg[key], expectedPackage[key], `Packaged ${key} does not match the source manifest`);
  }
  assert.equal(identity.Id, pkg.name);
  assert.equal(identity.Publisher, pkg.publisher);
  assert.equal(identity.Version, pkg.version);
  for (const name of ['extension/package.json', 'extension/dist/extension.js', 'extension/dist/nodeatomic/index.mjs', `extension/${pkg.icon}`]) {
    assert.ok(paths.has(name), `Required VSIX payload missing: ${name}`);
  }
}

export async function verifyUniversalVsix(path, { expectedPackage, native } = {}) {
  const { paths, contents } = await readArchive(path);
  const pkg = JSON.parse(contents.get('extension/package.json')?.toString() ?? 'null');
  assert.ok(pkg, 'Missing packaged package.json');
  const manifest = await parseStringPromise(contents.get('extension.vsixmanifest')?.toString() ?? '');
  const identity = manifest.PackageManifest?.Metadata?.[0]?.Identity?.[0]?.$;
  validateUniversalContents(paths, identity, pkg, expectedPackage);
  const consumer = contents.get('extension/dist/nodeatomic/index.mjs');
  assert.ok(consumer, 'Missing nodeatomic JS bundle');
  for (const marker of ['ATOMIC_RUNTIME_DIR', 'ATOMIC_RUNTIME_CONTRACT', 'dlopen']) {
    assert.ok(consumer.includes(marker), `nodeatomic bundle lacks the installed-runtime loader: ${marker}`);
  }
  // Import the exact archived bundle from a fresh directory, not from dist or
  // node_modules. This catches accidental build-machine/sibling dependencies.
  const directory = await mkdtemp(join(tmpdir(), 'catalyst-vsix-runtime-'));
  try {
    const entry = join(directory, 'index.mjs');
    await writeFile(entry, consumer);
    await smokeRuntime(pathToFileURL(entry), { ...(native === undefined ? {} : { native }) });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  console.log(`Verified universal VSIX: ${pkg.publisher}.${pkg.name} ${pkg.version}; no native binaries or platform target.`);
  return { paths: [...paths], package: pkg };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const path = process.argv[2] ?? `releases/${pkg.name}-${pkg.version}.vsix`;
  await verifyUniversalVsix(path, { expectedPackage: pkg });
}
