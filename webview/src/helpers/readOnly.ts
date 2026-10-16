import { Annotation, EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';

export const externalSyncAnnotation = Annotation.define<boolean>();

export function readOnlyExtensions(enabled: boolean): Extension[] {
  if (!enabled) return [];
  return [
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    EditorView.contentAttributes.of({ tabindex: '0' }),
    EditorState.transactionFilter.of((transaction) => {
      if (transaction.annotation(externalSyncAnnotation)) return transaction;
      return transaction.docChanged ? [] : transaction;
    })
  ];
}

export function activeLineHighlightExtensions(enabled: boolean): Extension[] {
  return enabled ? [highlightActiveLineGutter(), highlightActiveLine()] : [];
}

export function copyReadOnlySelection(event: ClipboardEvent, view: EditorView): boolean {
  if (!view.state.readOnly || !event.clipboardData) return false;
  const selection = view.dom.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed ||
      !view.contentDOM.contains(selection.anchorNode) ||
      !view.contentDOM.contains(selection.focusNode)) return false;

  // Read-only selections can span rendered widgets outside CodeMirror's selection.
  event.clipboardData.setData('text/plain', selection.toString());
  event.preventDefault();
  return true;
}
