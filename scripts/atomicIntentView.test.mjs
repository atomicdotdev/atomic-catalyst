import { afterEach, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo } from '@codemirror/commands';
import { atomicIntentExtensions, atomicIntentDocumentField } from '../webview/src/helpers/atomicIntent.ts';
import { readFileSync } from 'node:fs';

const browserWindow = new Window();
for (const key of ['document', 'MutationObserver', 'HTMLElement', 'HTMLButtonElement', 'HTMLSelectElement', 'Node', 'Text', 'Event', 'CustomEvent', 'KeyboardEvent', 'DOMRect']) {
  globalThis[key] = browserWindow[key];
}
globalThis.window = browserWindow;
globalThis.getComputedStyle = browserWindow.getComputedStyle.bind(browserWindow);
globalThis.requestAnimationFrame = browserWindow.requestAnimationFrame.bind(browserWindow);
globalThis.cancelAnimationFrame = browserWindow.cancelAnimationFrame.bind(browserWindow);

const source = '---\nentry_type: intent\ntitle: Editor test\nid: TEST::lee::1\nstatus: planned\n---\n:::why\nKeep source intact.\n:::\n\n:::acceptance-criterion{#ac-1 status=unmet}\nA checkable outcome.\n:::\n\n:::task{#task-1 status=open criteria=ac-1 custom="keep"}\nDo the work.\n::file-ref{path="src/a b#c.ts"}\n:::\n';
const views = [];
const editors = [];

function createView({ text = source, readOnly = false, onOpenLink = () => {} } = {}) {
  const parent = document.createElement('div');
  document.body.append(parent);
  const reading = new Compartment();
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: text,
      extensions: [history(), reading.of(EditorState.readOnly.of(readOnly)), ...atomicIntentExtensions(onOpenLink)]
    })
  });
  views.push(view);
  return { view, reading };
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
  for (const view of views.splice(0)) {
    view.destroy();
  }
  document.body.replaceChildren();
});

test('rendering creates a ticket layout with hidden syntax and unchanged source', () => {
  const { view } = createView();
  expect(view.state.doc.toString()).toBe(source);
  expect(view.dom.querySelector('.atomic-ticket-title').textContent).toBe('Editor test');
  expect(view.dom.querySelector('.atomic-ticket-main')).not.toBeNull();
  expect(view.dom.querySelector('.atomic-ticket-sidebar')).not.toBeNull();
  expect(view.dom.querySelector('.atomic-ticket').textContent).not.toContain(':::');
  expect(view.dom.querySelector('.atomic-ticket').textContent).not.toContain('entry_type:');
  expect(view.dom.classList.contains('atomic-ticket-active')).toBe(true);
  expect(view.dom.querySelectorAll('.atomic-ticket-card').length).toBe(2);
  expect(view.state.field(atomicIntentDocumentField).directives.length).toBe(4);
});

test('a visual status edit is targeted and participates in undo/redo', () => {
  const { view } = createView();
  const select = view.dom.querySelector('[data-directive="task"] select');
  select.value = 'done';
  select.dispatchEvent(new Event('change'));
  expect(view.state.doc.toString()).toBe(source.replace('status=open criteria=', 'status=done criteria='));
  expect(undo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe(source);
  expect(redo(view)).toBe(true);
  expect(view.state.doc.toString()).toBe(source.replace('status=open criteria=', 'status=done criteria='));
});

test('Edit opens a prose editor and Save changes only the task description', () => {
  const { view } = createView();
  const directive = view.state.field(atomicIntentDocumentField).directives.find((item) => item.name === 'task');
  const editButton = [...view.dom.querySelectorAll('[data-directive="task"] button')].find((item) => item.textContent === 'Edit');
  editButton.click();
  const nested = EditorView.findFromDOM(view.dom.querySelector('.atomic-ticket-prose-editor .cm-editor'));
  expect(nested.state.doc.toString()).toBe('Do the work.');
  expect(view.state.doc.toString()).toBe(source);
  nested.dispatch({ changes: { from: 0, to: nested.state.doc.length, insert: 'Edit this **task**.' } });
  [...view.dom.querySelectorAll('.atomic-ticket-edit-form button')].find((item) => item.textContent === 'Save').click();
  expect(view.state.doc.toString()).toBe(source.replace('Do the work.', 'Edit this **task**.'));
  expect(view.dom.querySelector('.atomic-ticket-edit-form')).toBeNull();
  expect(view.state.doc.sliceString(directive.from, directive.headerTo)).toBe(directive.header);
});

test('form-level shortcuts: Ctrl/⌘+Enter saves and Esc cancels (the CodeMirror Mod-Enter conflict is covered by browserSmoke.mjs)', () => {
  const { view } = createView();
  const openTask = () => {
    [...view.dom.querySelectorAll('[data-directive="task"] button')].find((item) => item.textContent === 'Edit').click();
    return EditorView.findFromDOM(view.dom.querySelector('.atomic-ticket-prose-editor .cm-editor'));
  };
  const press = (editor, init) => editor.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  press(openTask(), { key: 'Enter', ctrlKey: true });
  expect(view.dom.querySelector('.atomic-ticket-edit-form')).toBeNull();
  expect(view.state.doc.toString()).toBe(source);
  const edited = openTask();
  edited.dispatch({ changes: { from: 0, to: edited.state.doc.length, insert: 'Saved by keyboard.' } });
  press(edited, { key: 'Enter', ctrlKey: true });
  expect(view.dom.querySelector('.atomic-ticket-edit-form')).toBeNull();
  expect(view.state.doc.toString()).toBe(source.replace('Do the work.', 'Saved by keyboard.'));
  const discarded = openTask();
  discarded.dispatch({ changes: { from: 0, to: discarded.state.doc.length, insert: 'Discard me.' } });
  press(discarded, { key: 'Escape' });
  expect(view.dom.querySelector('.atomic-ticket-edit-form')).toBeNull();
  expect(view.state.doc.toString()).toBe(source.replace('Do the work.', 'Saved by keyboard.'));
});

test('task criterion navigation highlights and focuses its card without changing source', () => {
  const { view } = createView();
  const criterion = view.state.field(atomicIntentDocumentField).directives.find((item) => item.name === 'acceptance-criterion');
  let navigated = false;
  view.dom.querySelector('[data-ticket-id="ac-1"]').scrollIntoView = () => { navigated = true; };
  const link = [...view.dom.querySelectorAll('[data-directive="task"] button')].find((item) => item.classList.contains('atomic-ticket-link'));
  link.click();
  expect(navigated).toBe(true);
  const target = view.dom.querySelector('[data-ticket-id="ac-1"]');
  expect(target.classList.contains('atomic-ticket-card-highlighted')).toBe(true);
  expect(document.activeElement).toBe(target);
  expect(view.dom.querySelector('.atomic-ticket').textContent).not.toContain(criterion.header);
  expect(view.state.doc.toString()).toBe(source);
});

test('navigating to another criterion clears the previous highlight and repeated clicks keep one target', () => {
  const additional = '\n:::acceptance-criterion{#ac-2 status=unmet}\nAnother outcome.\n:::\n\n:::task{#task-2 status=open criteria=ac-2}\nMore work.\n:::\n';
  const { view } = createView({ text: source + additional });
  const first = view.dom.querySelector('[data-ticket-id="ac-1"]');
  const second = view.dom.querySelector('[data-ticket-id="ac-2"]');
  const links = view.dom.querySelectorAll('.atomic-ticket-link');
  links[0].click();
  expect(first.classList.contains('atomic-ticket-card-highlighted')).toBe(true);
  links[1].click();
  links[1].click();
  expect(first.classList.contains('atomic-ticket-card-highlighted')).toBe(false);
  expect(second.classList.contains('atomic-ticket-card-highlighted')).toBe(true);
  expect(view.dom.querySelectorAll('.atomic-ticket-card-highlighted').length).toBe(1);
  expect(view.state.doc.toString()).toBe(source + additional);
});

test('the navigation highlight clears automatically', async () => {
  const { view } = createView();
  view.dom.querySelector('.atomic-ticket-link').click();
  expect(view.dom.querySelector('.atomic-ticket-card-highlighted')).not.toBeNull();
  await new Promise((resolve) => setTimeout(resolve, 3100));
  expect(view.dom.querySelector('.atomic-ticket-card-highlighted')).toBeNull();
  expect(view.state.doc.toString()).toBe(source);
});

test('navigation honors reduced motion and destroying the panel clears its highlight', () => {
  const { view } = createView();
  const target = view.dom.querySelector('[data-ticket-id="ac-1"]');
  let behavior;
  target.scrollIntoView = (options) => { behavior = options.behavior; };
  const originalMatchMedia = window.matchMedia;
  try {
    window.matchMedia = () => ({ matches: true });
    view.dom.querySelector('.atomic-ticket-link').click();
    expect(behavior).toBe('auto');
    expect(target.classList.contains('atomic-ticket-card-highlighted')).toBe(true);
    view.destroy();
    views.splice(views.indexOf(view), 1);
    expect(target.classList.contains('atomic-ticket-card-highlighted')).toBe(false);
  } finally {
    window.matchMedia = originalMatchMedia;
  }
});

test('file references send encoded workspace-path requests, not arbitrary URI schemes', () => {
  const links = [];
  const { view } = createView({ onOpenLink: (href) => links.push(href) });
  view.dom.querySelector('[data-directive="file-ref"]').click();
  expect(links).toEqual(['atomic-file-ref:src%2Fa%20b%23c.ts']);
  expect(view.state.doc.toString()).toBe(source);
});

test('read-only state disables controls and refuses synthetic change events', () => {
  const { view, reading } = createView();
  const staleSelect = view.dom.querySelector('[data-directive="task"] select');
  view.dispatch({ effects: reading.reconfigure(EditorState.readOnly.of(true)) });
  expect(view.dom.querySelector('[data-directive="task"] select').disabled).toBe(true);
  staleSelect.value = 'done';
  staleSelect.dispatchEvent(new Event('change'));
  expect(view.state.doc.toString()).toBe(source);
});

test('stale controls cannot overwrite an externally changed header', () => {
  const { view } = createView();
  const staleSelect = view.dom.querySelector('[data-directive="task"] select');
  const from = source.indexOf('status=open criteria=') + 'status='.length;
  view.dispatch({ changes: { from, to: from + 4, insert: 'in_progress' } });
  staleSelect.value = 'done';
  staleSelect.dispatchEvent(new Event('change'));
  expect(view.state.doc.toString()).toBe(source.replace('status=open criteria=', 'status=in_progress criteria='));
});

test('ordinary Markdown creates no Atomic controls', () => {
  const { view } = createView({ text: '# Ordinary Markdown\n\n:::why\nExample\n:::\n' });
  expect(view.dom.querySelector('.atomic-ticket')).toBeNull();
});

test('editing a ticket title changes only the YAML scalar', () => {
  const { view } = createView();
  view.dom.querySelector('.atomic-ticket-title-row button').click();
  const input = view.dom.querySelector('input[aria-label="Intent title"]');
  input.value = 'Better title';
  [...view.dom.querySelectorAll('.atomic-ticket-edit-form button')].find((item) => item.textContent === 'Save').click();
  expect(view.state.doc.toString()).toBe(source.replace('title: Editor test', 'title: Better title'));
  expect(view.dom.querySelector('.atomic-ticket-title').textContent).toBe('Better title');
});

test('a source change preserves an active draft and refuses to overwrite external changes', () => {
  const { view } = createView();
  [...view.dom.querySelectorAll('[data-directive="task"] button')].find((item) => item.textContent === 'Edit').click();
  const nested = EditorView.findFromDOM(view.dom.querySelector('.atomic-ticket-prose-editor .cm-editor'));
  nested.dispatch({ changes: { from: 0, to: nested.state.doc.length, insert: 'My unsaved draft.' } });
  const from = source.indexOf('Do the work.');
  view.dispatch({ changes: { from, to: from + 'Do the work.'.length, insert: 'External change.' } });
  expect(view.dom.querySelector('.atomic-ticket-prose-editor')).not.toBeNull();
  expect(nested.state.doc.toString()).toBe('My unsaved draft.');
  [...view.dom.querySelectorAll('.atomic-ticket-edit-form button')].find((item) => item.textContent === 'Save').click();
  expect(view.state.doc.toString()).toContain('External change.');
  expect(view.dom.querySelector('.atomic-ticket-edit-notice').textContent).toContain('source changed');
});

test('criterion evidence can be edited without exposing or rewriting directives', () => {
  const { view } = createView();
  [...view.dom.querySelectorAll('[data-directive="acceptance-criterion"] button')].find((item) => item.textContent === 'Edit evidence').click();
  view.dom.querySelector('input[aria-label="Verified by"]').value = 'tests/check.py';
  view.dom.querySelector('textarea[aria-label="Verification evidence"]').value = 'Passed "all" checks.';
  [...view.dom.querySelectorAll('.atomic-ticket-edit-form button')].find((item) => item.textContent === 'Save').click();
  expect(view.state.doc.toString()).toContain('status=unmet');
  expect(view.state.doc.toString()).toContain('verifiedBy="tests/check.py"');
  expect(view.state.field(atomicIntentDocumentField).directives[1].attributes.evidence).toBe('Passed "all" checks.');
  expect(view.dom.querySelector('.atomic-ticket').textContent).not.toContain(':::');
});

test('unsafe prose blocks source switching rather than silently losing a draft', async () => {
  const { createEditor } = await import('../webview/src/editor.ts');
  const parent = document.createElement('div');
  document.body.append(parent);
  const editor = createEditor({ parent, text: source, initialMode: 'live', onApplyChanges: () => {} });
  editors.push(editor);
  [...editor.view.dom.querySelectorAll('[data-directive="task"] button')].find((item) => item.textContent === 'Edit').click();
  const nested = EditorView.findFromDOM(editor.view.dom.querySelector('.atomic-ticket-prose-editor .cm-editor'));
  nested.dispatch({ changes: { from: 0, to: nested.state.doc.length, insert: 'Oops\n:::\nextra' } });
  expect(editor.commitTransientEdits()).toBe(false);
  expect(() => editor.setMode('source')).toThrow('Finish or cancel');
  expect(editor.getText()).toBe(source);
});

test('the actual MEO editor preserves the supplied fixture through live/source switching', async () => {
  const { createEditor } = await import('../webview/src/editor.ts');
  const fixture = readFileSync(new URL('../examples/catalyst.intent.md', import.meta.url), 'utf8');
  const outgoing = [];
  const parent = document.createElement('div');
  document.body.append(parent);
  const editor = createEditor({ parent, text: fixture, initialMode: 'live', onApplyChanges: (text) => outgoing.push(text) });
  editors.push(editor);
  expect(editor.getText()).toBe(fixture);
  expect(editor.view.state.field(atomicIntentDocumentField).directives.length).toBe(10);
  editor.setMode('source');
  expect(editor.getText()).toBe(fixture);
  expect(editor.view.dom.querySelector('.atomic-ticket')).toBeNull();
  editor.setMode('live');
  expect(editor.getText()).toBe(fixture);
  expect(outgoing).toEqual([]);
});

test('the actual MEO synchronization callback receives only the targeted status edit', async () => {
  const { createEditor } = await import('../webview/src/editor.ts');
  const outgoing = [];
  const parent = document.createElement('div');
  document.body.append(parent);
  const editor = createEditor({ parent, text: source, initialMode: 'live', onApplyChanges: (text) => outgoing.push(text) });
  editors.push(editor);
  const select = editor.view.dom.querySelector('[data-directive="task"] select');
  select.value = 'done';
  select.dispatchEvent(new Event('change'));
  expect(outgoing).toEqual([source.replace('status=open criteria=', 'status=done criteria=')]);
  expect(editor.undo()).toBe(true);
  expect(outgoing.at(-1)).toBe(source);
  editor.setReadOnly(true);
  const readOnlySelect = editor.view.dom.querySelector('[data-directive="task"] select');
  expect(readOnlySelect.disabled).toBe(true);
  readOnlySelect.value = 'done';
  readOnlySelect.dispatchEvent(new Event('change'));
  expect(editor.getText()).toBe(source);
});
