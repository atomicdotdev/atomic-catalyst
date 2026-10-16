export type AtomicIssue = {
  title: string;
  detail: string;
  recovery: string;
  requiresUpgrade: boolean;
};

/** The consumer currently exposes text errors, not stable machine-readable error codes. */
export function describeAtomicError(error: unknown): AtomicIssue {
  const detail = error instanceof Error ? error.message : String(error);
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
