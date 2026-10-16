import { describe, expect, test } from 'bun:test';
import { RepositorySession, resolveRepositoryPath, statusLabels } from '../src/atomic/model.ts';

function fixture() {
  const calls = [];
  const status = { view: 'main', snapshot: { view: { name: 'main' }, effectiveState: { value: new Uint8Array(32) } },
    files: [{ path: 'tracked.md', status: 1 }, { path: 'new.md', status: 3 }], needsReindex: false };
  const client = {
    status: async () => { calls.push(['status']); return status; },
    log: async (options) => { calls.push(['log', options]); return { entries: [] }; },
    views: { list: async () => { calls.push(['views']); return { views: [] }; } },
    record: async (...args) => { calls.push(['record', ...args]); return {}; }
  };
  return { session: new RepositorySession('/repo', client), client, calls, status };
}

describe('Atomic version control model', () => {
  test('validates repository-relative paths', () => {
    expect(resolveRepositoryPath('/repo', 'src/intent.md')).toBe('/repo/src/intent.md');
    for (const file of ['', '.', '..', '../escape', '/absolute', 'src/../../escape']) {
      expect(() => resolveRepositoryPath('/repo', file)).toThrow();
    }
  });

  test('uses the displayed view for bounded history reads', async () => {
    const { session, calls, status } = fixture();
    await session.run(() => session.refresh());
    expect(session.status).toBe(status);
    expect(calls).toEqual([['status'], ['log', { view: 'main', budget: { maxItems: 30 } }], ['views']]);
  });

  test('records tracked paths only with the displayed snapshot fence', async () => {
    const { session, calls, status } = fixture();
    await session.refresh();
    await session.record('Save intent');
    expect(calls.at(-1)).toEqual(['record', 'Save intent', {
      paths: ['tracked.md'], expected: { viewSnapshot: status.snapshot }
    }]);
    expect(calls.filter(([name]) => name === 'status')).toHaveLength(1);
  });

  test('preserves the click-time status even if a queued refresh publishes a newer one', async () => {
    const { session, calls, client } = fixture();
    await session.refresh();
    const displayed = session.status;
    client.status = async () => ({ view: 'other', snapshot: { view: { name: 'other' } },
      files: [{ path: 'different.md', status: 1 }] });
    await session.refresh();
    await session.record('Save', displayed);
    expect(calls.at(-1)[2]).toEqual({ paths: ['tracked.md'], expected: { viewSnapshot: displayed.snapshot } });
  });

  test('uses Merkle fence when no snapshot is available', async () => {
    const { session, calls, status } = fixture();
    status.snapshot = undefined;
    status.viewMerkle = { value: new Uint8Array(32) };
    await session.refresh();
    await session.record('Save');
    expect(calls.at(-1)[2].expected).toEqual({ merkleRoot: status.viewMerkle });
  });

  test('refuses recording without a status, message, tracked paths, or fence', async () => {
    const { session, status } = fixture();
    await expect(session.record('Save')).rejects.toThrow('Refresh');
    await session.refresh();
    await expect(session.record('  ')).rejects.toThrow('message');
    status.files = [{ path: 'new.md', status: 3 }];
    await expect(session.record('Save')).rejects.toThrow('Add untracked');
    status.files = [{ path: 'tracked.md', status: 1 }];
    status.snapshot = undefined;
    await expect(session.record('Save')).rejects.toThrow('concurrency fence');
  });

  test('rejects invalid backend paths before mutation', async () => {
    const { session, calls, status } = fixture();
    status.files = [{ path: '../escape', status: 1 }];
    await session.refresh();
    await expect(session.record('Save')).rejects.toThrow('escapes');
    expect(calls.some(([name]) => name === 'record')).toBe(false);
  });

  test('serializes operations and recovers the queue after rejection', async () => {
    const { session } = fixture();
    const order = [];
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const first = session.run(async () => { order.push('first'); await gate; throw new Error('failure'); });
    const second = session.run(async () => { order.push('second'); return 2; });
    await Promise.resolve();
    expect(order).toEqual(['first']);
    release();
    await expect(first).rejects.toThrow('failure');
    expect(await second).toBe(2);
    expect(order).toEqual(['first', 'second']);
  });

  test('does not publish partially refreshed state after a query failure', async () => {
    const { session, client } = fixture();
    await session.refresh();
    const previous = session.status;
    client.status = async () => ({ view: 'another', files: [] });
    client.log = async () => { throw new Error('database busy'); };
    await expect(session.refresh()).rejects.toThrow('busy');
    expect(session.status).toBe(previous);
  });

  test('status labels match generated consumer enum values', async () => {
    // Read generated JS codecs without importing the native addon in the unit suite.
    const { atomic } = await import('../node_modules/nodeatomic/dist/generated/proto.cjs');
    expect(statusLabels[atomic.FileStatus.FILE_STATUS_MODIFIED]).toBe('Modified');
    expect(statusLabels[atomic.FileStatus.FILE_STATUS_UNTRACKED]).toBe('Untracked');
    expect(statusLabels[atomic.FileStatus.FILE_STATUS_CONFLICTED]).toBe('Conflicted');
  });
});
