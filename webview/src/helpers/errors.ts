const liveModeFailureNoticeMessage = 'Live mode failed to render this document. Switched to Source mode.';
const editorUpdateFailureNoticeMessage = 'Editor failed to update this document. Try reopening the file.';
const externalSyncConflictNoticeMessage = 'Document changed outside the editor. Showing host content. Your unsaved MEO buffer was discarded from the view (use Undo if needed).';
const externalSyncAdoptFailureNoticeMessage = 'Could not apply an external document update. Reload from the host document or reopen the file.';

export interface EditorNotice {
  setEditorNotice: (message: string, kind?: string, options?: { showReload?: boolean }) => void;
  clearEditorNotice: () => void;
}

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof (error as Error).message === 'string') {
    return (error as Error).message;
  }
  return '';
};

export const isTransientMermaidRuntimeError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  if (!message) {
    return false;
  }
  if (!message.includes('mermaid')) {
    return false;
  }
  return (
    message.includes('runtime') ||
    message.includes('failed to load') ||
    message.includes('missing') ||
    message.includes('unavailable') ||
    message.includes('script')
  );
};

export const shouldAutoFallbackToSourceForLiveError = (error: unknown): boolean => !isTransientMermaidRuntimeError(error);

export const logWebviewRenderError = (context: string, error: unknown, extra: Record<string, unknown> = {}): void => {
  console.error('[MEO webview] render error', {
    context,
    ...extra,
    error
  });
};

export interface FailureNoticeState {
  message: string;
  kind: string;
  showReload: boolean;
}

export const createFailureNoticeManager = (notice: EditorNotice) => {
  let failureNotice: FailureNoticeState = { message: '', kind: 'error', showReload: false };

  const updateEditorNotice = () => {
    if (failureNotice.message) {
      notice.setEditorNotice(failureNotice.message, failureNotice.kind, {
        showReload: failureNotice.showReload
      });
      return;
    }
    notice.clearEditorNotice();
  };

  const setFailureNotice = (
    message: string,
    kind: 'error' | 'warning' = 'error',
    options?: { showReload?: boolean }
  ): void => {
    failureNotice = { message, kind, showReload: options?.showReload === true };
    updateEditorNotice();
  };

  const clearFailureNotice = (): void => {
    if (!failureNotice.message) {
      return;
    }
    failureNotice = { message: '', kind: 'error', showReload: false };
    updateEditorNotice();
  };

  const hasFailureNotice = (): boolean => Boolean(failureNotice.message);

  return {
    setFailureNotice,
    clearFailureNotice,
    hasFailureNotice,
    updateEditorNotice,
    get liveModeFailureMessage() { return liveModeFailureNoticeMessage; },
    get editorUpdateFailureMessage() { return editorUpdateFailureNoticeMessage; },
    get externalSyncConflictMessage() { return externalSyncConflictNoticeMessage; },
    get externalSyncAdoptFailureMessage() { return externalSyncAdoptFailureNoticeMessage; }
  };
};

export type FailureNoticeManager = ReturnType<typeof createFailureNoticeManager>;
