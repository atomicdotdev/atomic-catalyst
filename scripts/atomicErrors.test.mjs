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
