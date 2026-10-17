import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyUniversalVsix } from './verify-universal-vsix.mjs';

const require = createRequire(import.meta.url);
const { createVSIX } = require('@vscode/vsce');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('releases', { recursive: true });
const packagePath = resolve('releases', `${pkg.name}-${pkg.version}.vsix`);
// Deliberately omit target: one JS-only VSIX uses the installed host runtime.
await createVSIX({ packagePath, dependencies: false, allowMissingRepository: true });
await verifyUniversalVsix(packagePath, { expectedPackage: pkg });
