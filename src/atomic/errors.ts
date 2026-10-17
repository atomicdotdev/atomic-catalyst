export type AtomicIssue = {
  title: string;
  detail: string;
  recovery: string;
  requiresUpgrade: boolean;
};

/** Runtime loader errors have stable codes; repository errors still need text matching. */
export function describeAtomicError(error: unknown): AtomicIssue {
  const detail = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.startsWith('ATOMIC_RUNTIME_') || code === 'ATOMIC_UNSUPPORTED_PLATFORM' || code === 'ATOMIC_NODE_API_UNSUPPORTED') {
    return {
      title: code === 'ATOMIC_RUNTIME_NOT_FOUND' ? 'Install Atomic to enable version control' : 'Atomic runtime unavailable or incompatible',
      detail,
      recovery: 'Install a compatible complete Atomic release on the extension host, keeping its CLI, platform library and libatomic-runtime.json together. Put that installation on PATH or set an absolute ATOMIC_RUNTIME_DIR before launching the editor; fully restart the editor after changing its environment or updating a loaded runtime. Remote SSH/WSL/containers need the remote installation. This universal extension does not bundle, download or compile native libraries. Check the reported checksum/contract/platform error; the editor does not install or repair Atomic automatically.',
      requiresUpgrade: false,
    };
  }
  if (/PATH_CLAIMS migration required/i.test(detail)) {
    return {
      title: 'Repository upgrade required',
      detail,
      recovery: 'This repository predates the native addon’s PATH_CLAIMS schema. Back up the repository, stop other Atomic operations, then run `atomic doctor repair-native-indexes` in this repository with a compatible current Atomic CLI. This modifies derived database indexes. After it succeeds, run Atomic: Refresh Version Control. The editor does not run repairs automatically.',
      requiresUpgrade: true
    };
  }
  return {
    title: 'Atomic unavailable',
    detail,
    recovery: 'Open Atomic Version Control output for the backend error, resolve it, then run Atomic: Refresh Version Control.',
    requiresUpgrade: false
  };
}
