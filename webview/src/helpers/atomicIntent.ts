import { StateField, type Extension } from '@codemirror/state';
import { EditorView, showPanel } from '@codemirror/view';
import { createAtomicTicketPanel } from './atomicTicket';
import { parseAtomicIntent } from './atomicIntentDocument';

export const atomicIntentDocumentField = StateField.define({
  create: (state) => parseAtomicIntent(state.doc.toString()),
  update: (value, transaction) => transaction.docChanged ? parseAtomicIntent(transaction.newDoc.toString()) : value
});

export function atomicIntentExtensions(
  onOpenLink: (href: string) => void = () => {},
  onSource: () => void = () => {}
): Extension[] {
  // Keep the panel constructor stable across document edits so an external
  // change cannot destroy an active draft before its conflict check runs.
  const ticketPanel = (view: EditorView) => createAtomicTicketPanel(
    view, () => view.state.field(atomicIntentDocumentField), onOpenLink, onSource);
  return [
    atomicIntentDocumentField,
    EditorView.editorAttributes.from(atomicIntentDocumentField, (intent) => intent.isIntent ? { class: 'atomic-ticket-active' } : {}),
    showPanel.from(atomicIntentDocumentField, (intent) => intent.isIntent ? ticketPanel : null)
  ];
}
