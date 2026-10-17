import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateUniversalContents, verifyUniversalVsix } from './verify-universal-vsix.mjs';

const tooling = createRequire(import.meta.resolve('@vscode/vsce'));
const { ZipFile } = tooling('yazl');
const pkg = { name: 'atomic-catalyst', displayName: 'Atomic Catalyst', publisher: 'atomicdotdev', version: '0.2.12', icon: 'flask.png' };
const identity = { Id: pkg.name, Publisher: pkg.publisher, Version: pkg.version };
const files = () => new Set(['extension/package.json', 'extension/dist/extension.js', 'extension/dist/nodeatomic/index.mjs', 'extension/flask.png']);

test('accepts an untargeted universal JS-only payload', () => {
  expect(() => validateUniversalContents(files(), identity, pkg)).not.toThrow();
  expect(() => validateUniversalContents(files(), { ...identity, TargetPlatform: 'universal' }, pkg)).not.toThrow();
});

test('rejects native filenames, versioned libraries and legacy native directories', () => {
  for (const name of ['dist/native/libatomic.node', 'dist/native/leftover.dat', 'libatomic.so',
    'libatomic.so.1', 'libatomic.dylib', 'libatomic.dll', 'ATOMIC.EXE', 'elsewhere/addon.node']) {
    const paths = files(); paths.add(`extension/${name}`);
    expect(() => validateUniversalContents(paths, identity, pkg)).toThrow('Native payload');
  }
});

test('rejects platform targets, private data, mismatched versions and missing assets', () => {
  expect(() => validateUniversalContents(files(), { ...identity, TargetPlatform: 'darwin-arm64' }, pkg)).toThrow('platform-targeted');
  expect(() => validateUniversalContents(files(), identity, { ...pkg, __metadata: { targetPlatform: 'linux-x64' } })).toThrow('platform-specific');
  for (const directory of ['.atomic', '.vault', '.git', 'node_modules']) {
    const paths = files(); paths.add(`extension/${directory}/data`);
    expect(() => validateUniversalContents(paths, identity, pkg)).toThrow('must not ship');
  }
  expect(() => validateUniversalContents(files(), identity, { ...pkg, version: '0.0.0' }, pkg)).toThrow('version');
  const paths = files(); paths.delete('extension/dist/nodeatomic/index.mjs');
  expect(() => validateUniversalContents(paths, identity, pkg)).toThrow('missing');
});

test('VSCE ignore rules exclude stale native artifacts without deleting the working files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'catalyst-ignore-'));
  try {
    await mkdir(join(root, 'dist/native'), { recursive: true });
    await mkdir(join(root, 'dist/nodeatomic'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ ...pkg, engines: { vscode: '^1.97.0' } }));
    await writeFile(join(root, '.vscodeignore'), await readFile(new URL('../.vscodeignore', import.meta.url)));
    await writeFile(join(root, 'dist/native/libatomic.node'), 'old generated addon');
    await writeFile(join(root, 'dist/leftover.so.1'), 'other native artifact');
    await writeFile(join(root, 'dist/nodeatomic/index.mjs'), 'JS consumer');
    // Run VSCE from the fixture directory in its own Node process: VSCE's
    // glob/relative-path handling depends on the actual process cwd too.
    const source = `
      const { listFiles } = require(${JSON.stringify(tooling.resolve('@vscode/vsce'))});
      listFiles({ packagedDependencies: [] }).then(files => console.log(JSON.stringify(files)));
    `;
    const packaged = JSON.parse(execFileSync('node', ['-e', source], { cwd: root, encoding: 'utf8' }));
    expect(packaged).toContain('dist/nodeatomic/index.mjs');
    expect(packaged.some((name) => /native\/|\.so\.1$/.test(name))).toBe(false);
    expect(await readFile(join(root, 'dist/native/libatomic.node'), 'utf8')).toBe('old generated addon');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('verifies an archive and smoke-tests its extracted standalone JS consumer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'catalyst-vsix-test-'));
  try {
    const zip = new ZipFile(), path = join(root, 'test.vsix');
    const complete = new Promise((resolve, reject) => {
      const stream = zip.outputStream.pipe(createWriteStream(path));
      stream.on('close', resolve); stream.on('error', reject); zip.outputStream.on('error', reject);
    });
    zip.addBuffer(Buffer.from(`<PackageManifest><Metadata><Identity Id="${pkg.name}" Publisher="${pkg.publisher}" Version="${pkg.version}"/></Metadata></PackageManifest>`), 'extension.vsixmanifest');
    zip.addBuffer(Buffer.from(JSON.stringify(pkg)), 'extension/package.json');
    zip.addBuffer(Buffer.from('extension entry'), 'extension/dist/extension.js');
    zip.addBuffer(Buffer.from('icon fixture'), 'extension/flask.png');
    zip.addBuffer(Buffer.from(`
      // Fixture for archive mechanics: ATOMIC_RUNTIME_DIR ATOMIC_RUNTIME_CONTRACT dlopen
      export class AtomicRuntimeError extends Error { constructor() { super('Missing runtime'); this.code = 'ATOMIC_RUNTIME_NOT_FOUND'; } }
      export async function openRepository() {}
      export async function call() { throw new AtomicRuntimeError(); }
      export const proto = { StatusRequest: { encode: () => ({ finish: () => new Uint8Array() }) } };
    `), 'extension/dist/nodeatomic/index.mjs');
    zip.end(); await complete;
    const result = await verifyUniversalVsix(path, { expectedPackage: pkg, native: false });
    expect(result.package.name).toBe(pkg.name);
    expect(result.paths).toContain('extension/dist/nodeatomic/index.mjs');
  } finally { await rm(root, { recursive: true, force: true }); }
});
