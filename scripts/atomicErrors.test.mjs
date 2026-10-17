import { expect, test } from 'bun:test';
import { describeAtomicError } from '../src/atomic/errors.ts';

test('legacy schema rejection is an upgrade requirement, not missing repository or addon', () => {
  const message = 'Internal error: atomic:REPOSITORY: Database error: IO error: PATH_CLAIMS migration required (missing schema completion marker; expected version 1)';
  const issue = describeAtomicError(new Error(message));
  expect(issue.title).toBe('Repository upgrade required');
  expect(issue.requiresUpgrade).toBe(true);
  expect(issue.detail).toBe(message);
  expect(issue.recovery).toContain('Back up');
  expect(issue.recovery).toContain('atomic doctor repair-native-indexes');
  expect(issue.recovery).toContain('does not run repairs automatically');
});

test('unsupported path-claims schema version gets the same explicit recovery guidance', () => {
  expect(describeAtomicError('PATH_CLAIMS migration required (found schema version 0; expected version 1)').requiresUpgrade).toBe(true);
});

test('other failures preserve the backend reason without prescribing a schema repair', () => {
  for (const error of [new Error('Database lock timeout'), new Error('Cannot load libatomic.node'), 'Unknown method']) {
    const issue = describeAtomicError(error);
    expect(issue.title).toBe('Atomic unavailable');
    expect(issue.requiresUpgrade).toBe(false);
    expect(issue.detail).toBe(error instanceof Error ? error.message : error);
    expect(issue.recovery).not.toContain('repair-native-indexes');
  }
});

test('missing installed runtime gives installation guidance, not an extension rebuild', () => {
  const error = Object.assign(new Error('Atomic is not installed'), { code: 'ATOMIC_RUNTIME_NOT_FOUND' });
  const issue = describeAtomicError(error);
  expect(issue.title).toBe('Install Atomic to enable version control');
  expect(issue.requiresUpgrade).toBe(false);
  expect(issue.recovery).toContain('ATOMIC_RUNTIME_DIR');
  expect(issue.recovery).toContain('Remote SSH');
  expect(issue.recovery).toContain('does not bundle');
  expect(issue.recovery).not.toContain('repair-native-indexes');
});

test('runtime validation failures remain separate from repository schema upgrades', () => {
  for (const code of ['ATOMIC_RUNTIME_CONTRACT', 'ATOMIC_RUNTIME_INTEGRITY', 'ATOMIC_RUNTIME_MANIFEST',
    'ATOMIC_RUNTIME_CONFIGURATION', 'ATOMIC_RUNTIME_LOAD', 'ATOMIC_UNSUPPORTED_PLATFORM', 'ATOMIC_NODE_API_UNSUPPORTED']) {
    const issue = describeAtomicError(Object.assign(new Error('Runtime failed'), { code }));
    expect(issue.title).toBe('Atomic runtime unavailable or incompatible');
    expect(issue.detail).toBe('Runtime failed');
    expect(issue.requiresUpgrade).toBe(false);
    expect(issue.recovery).toContain('fully restart');
    expect(issue.recovery).not.toContain('repair-native-indexes');
  }
});
