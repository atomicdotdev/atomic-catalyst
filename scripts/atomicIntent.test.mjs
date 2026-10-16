import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  parseAtomicIntent,
  canEditAtomicStatus,
  createAtomicStatusEdit,
  atomicStatusOptions
} from '../webview/src/helpers/atomicIntentDocument.ts';
import { createAtomicBodyEdit, createAtomicMetadataEdit, createAtomicAttributeEdit } from '../webview/src/helpers/atomicIntentDocument.ts';
import { normalizeAtomicFileReference } from '../src/shared/atomicFileReference.ts';

const sample = readFileSync(new URL('../examples/catalyst.intent.md', import.meta.url), 'utf8');
const wrap = (body) => `---\nentry_type: intent\ntitle: Test intent\n---\n${body}`;
const taskSource = (attributes) => wrap(`:::task{${attributes}}\nDo the work.\n:::\n`);
const task = (source) => parseAtomicIntent(source).directives.find((item) => item.name === 'task');
const apply = (source, edit) => edit ? source.slice(0, edit.from) + edit.insert + source.slice(edit.to) : source;

test('the supplied fixture indexes metadata, six sections, and four file references without changing source', () => {
  const parsed = parseAtomicIntent(sample);
  expect(parsed.isIntent).toBe(true);
  expect(parsed.id).toBe('VSCO::continuouslee::2');
  expect(parsed.status).toBe('needs-review');
  expect(parsed.title).toBe('Rename the desktop application to Catalyst');
  expect(parsed.directives.map((item) => item.name)).toEqual([
    'why', 'acceptance-criterion', 'task', 'file-ref', 'file-ref', 'file-ref', 'file-ref', 'scope-in', 'scope-out', 'constraint'
  ]);
  expect(parsed.directives[1].attributes.verifiedBy).toBe('tests/test_branding.py');
  expect(parsed.directives[1].attributes.evidence).toContain("-p 'test_branding.py'");
  for (const item of parsed.directives) {
    expect(sample.slice(item.from, item.headerTo)).toBe(item.header);
  }
  expect(readFileSync(new URL('../examples/catalyst.intent.md', import.meta.url), 'utf8')).toBe(sample);
});

test('changing the supplied task status changes only its value', () => {
  const directive = task(sample);
  const edit = createAtomicStatusEdit(sample, directive, 'open');
  expect(sample.slice(edit.from, edit.to)).toBe('done');
  expect(apply(sample, edit)).toBe(sample.replace('status=done criteria=', 'status=open criteria='));
});

for (const quote of ['', '"', "'"]) {
  test(`status editing preserves ${quote || 'unquoted'} attributes, unknown fields, evidence and whitespace`, () => {
    const source = taskSource(`#abc status = ${quote}open${quote} custom="keep {this}" evidence="text status=done"`);
    const edit = createAtomicStatusEdit(source, task(source), 'done');
    expect(apply(source, edit)).toBe(source.replace(`${quote}open${quote}`, `${quote}done${quote}`));
  });
}

test('a status-like substring inside evidence is never edited', () => {
  const source = taskSource('evidence="status=done" status=open');
  expect(apply(source, createAtomicStatusEdit(source, task(source), 'done'))).toBe(
    source.replace(' status=open', ' status=done')
  );
});

test('met is an edit, not fabricated evidence or conformance', () => {
  const source = wrap(':::acceptance-criterion{#ac-1 status=unmet}\nA checkable outcome.\n:::\n');
  const directive = parseAtomicIntent(source).directives[0];
  expect(apply(source, createAtomicStatusEdit(source, directive, 'met'))).toBe(source.replace('status=unmet', 'status=met'));
});

test('CRLF, Unicode, IDs, and no final newline survive targeted source edits', () => {
  const source = taskSource('#abc status="open" evidence="✓ café 🍼"').replaceAll('\n', '\r\n').trimEnd();
  const edit = createAtomicStatusEdit(source, task(source), 'done');
  expect(apply(source, edit)).toBe(source.replace('status="open"', 'status="done"'));
});

test('stale header positions and stale attributes are rejected', () => {
  const source = taskSource('#abc status=open');
  const directive = task(source);
  expect(createAtomicStatusEdit(`\n${source}`, directive, 'done')).toBeNull();
  expect(createAtomicStatusEdit(source.replace('status=open', 'status=done'), directive, 'open')).toBeNull();
});

test('invalid status strings and no-op edits are rejected', () => {
  const source = taskSource('#abc status=open');
  for (const status of ['open', 'bad value', 'done}', '"done"', '', 'done\n:::']) {
    expect(createAtomicStatusEdit(source, task(source), status)).toBeNull();
  }
});

test('duplicate or missing status attributes stay raw', () => {
  for (const attributes of ['#abc status=open status=done', '#abc evidence="status=done"', '#abc status']) {
    const source = taskSource(attributes);
    const directive = task(source);
    expect(canEditAtomicStatus(directive)).toBe(false);
    expect(createAtomicStatusEdit(source, directive, 'done')).toBeNull();
  }
});

test('unfamiliar current status values are preserved in editing suggestions', () => {
  const source = taskSource('#abc status=blocked');
  expect(atomicStatusOptions(task(source))).toEqual(['blocked', 'open', 'in_progress', 'done']);
});

test('ordinary Markdown and non-intent frontmatter are not decorated', () => {
  for (const source of [':::why\nExample\n:::\n', wrap(':::why\nExample\n:::\n').replace('intent', 'memory')]) {
    expect(parseAtomicIntent(source).isIntent).toBe(false);
    expect(parseAtomicIntent(source).directives).toEqual([]);
  }
});

test('quoted and flow YAML are detected, invalid metadata remains raw', () => {
  expect(parseAtomicIntent('---\n{entry_type: "intent", title: "Flow YAML"}\n---\n').title).toBe('Flow YAML');
  for (const source of ['---\nentry_type: [intent\n---\n', '---\nentry_type: intent\nentry_type: memory\n---\n']) {
    expect(parseAtomicIntent(source).isIntent).toBe(false);
  }
});

test('directive-like text in fences, inline code, indented code, and HTML comments stays source', () => {
  const source = wrap('```md\n:::task{status=open}\nExample\n:::\n```\n\n`:::task{status=open}`\n\n    :::task{status=open}\n    Example\n    :::\n\n<!--\n:::task{status=open}\nExample\n:::\n-->\n');
  expect(parseAtomicIntent(source).directives).toEqual([]);
});

test('unknown and incomplete containers remain entirely source', () => {
  expect(parseAtomicIntent(wrap(':::custom\n:::task{status=open}\nWork\n:::\n')).directives).toEqual([]);
  expect(parseAtomicIntent(wrap(':::task{status=open}\nUnfinished')).directives).toEqual([]);
});

test('nested containers use real Markdown directive boundaries', () => {
  const source = wrap('::::task{#outer status=open}\n:::constraint\nKeep source.\n:::\n::file-ref{path="src/a b.ts"}\n::::\n');
  const directives = parseAtomicIntent(source).directives;
  expect(directives.map((item) => item.name)).toEqual(['task', 'constraint', 'file-ref']);
  expect(directives[2].attributes.path).toBe('src/a b.ts');
  expect(source.slice(directives[0].closingFrom, directives[0].to)).toBe('::::');
});

test('file-reference normalization preserves local paths, including URI punctuation', () => {
  expect(normalizeAtomicFileReference('src/a b#c?.ts')).toBe('src/a b#c?.ts');
  expect(normalizeAtomicFileReference('src\\nested\\file.ts')).toBe('src/nested/file.ts');
  expect(normalizeAtomicFileReference('./src/nested/../file.ts')).toBe('src/file.ts');
});

test('file-reference normalization rejects external schemes, absolute paths, traversal and controls', () => {
  for (const value of ['', '../secret', 'src/../../secret', '/etc/passwd', '\\server\\file', 'C:\\file', 'command:run', 'https://example.com', 'file:///etc/passwd', 'a\0b', 'a\nb']) {
    expect(normalizeAtomicFileReference(value)).toBeNull();
  }
});

test('development manifest is opt-in and does not install default associations', async () => {
  const manifest = await Bun.file(new URL('../package.json', import.meta.url)).json();
  expect(manifest.contributes.customEditors[0].priority).toBe('option');
  expect(manifest.contributes.configurationDefaults).toBeUndefined();
  expect(manifest.contributes.configuration.properties['catalystIntent.useAsDefault'].default).toBe(false);
});

test('ticket selectors default only intent filenames and all IDs are isolated from MEO', async () => {
  const manifest = await Bun.file(new URL('../package.json', import.meta.url)).json();
  const ticket = manifest.contributes.customEditors.find((item) => item.viewType === 'catalystIntent.ticket');
  expect(ticket.priority).toBe('default');
  expect(ticket.selector.map((item) => item.filenamePattern)).toEqual(['**/intent.md', '*.intent.md']);
  expect(JSON.stringify(manifest.contributes)).not.toContain('markdownEditorOptimized');
});

test('ticket metadata edits preserve comments, quotation style and managed fields', () => {
  const source = "---\nentry_type: intent\ntitle: 'Old title' # keep comment\nstatus: planned\ncontent_hash: never-touch\ncustom: [a, b]\n---\n:::why\nReason\n:::\n";
  const intent = parseAtomicIntent(source);
  expect(apply(source, createAtomicMetadataEdit(source, intent, 'title', "Lee's title"))).toBe(source.replace("'Old title'", "'Lee''s title'"));
  expect(apply(source, createAtomicMetadataEdit(source, intent, 'status', 'needs-review'))).toBe(source.replace('status: planned', 'status: needs-review'));
  expect(createAtomicMetadataEdit(source, intent, 'content_hash', 'fake')).toBeNull();
  expect(createAtomicMetadataEdit(source, intent, 'title', 'new\nentry_type: fake')).toBeNull();
  expect(createAtomicMetadataEdit(source.replace('Old title', 'New title'), intent, 'title', 'overwrite')).toBeNull();
});

test('plain YAML title values with special syntax are safely quoted', () => {
  const source = '---\nentry_type: intent\ntitle: Original\n---\n';
  const edit = createAtomicMetadataEdit(source, parseAtomicIntent(source), 'title', 'New: title # literal');
  expect(apply(source, edit)).toBe(source.replace('Original', '"New: title # literal"'));
  expect(parseAtomicIntent(apply(source, edit)).title).toBe('New: title # literal');
});

test('body edits preserve header, file references, blank-line suffix and unrelated sections', () => {
  const source = wrap(':::task{#t status=open custom="keep"}\nOld prose.\n\n::file-ref{path=src/file.ts}\n:::\n\n:::constraint\nKeep safe.\n:::\n');
  const edit = createAtomicBodyEdit(source, task(source), 'New **prose**.');
  expect(apply(source, edit)).toBe(source.replace('Old prose.', 'New **prose**.'));
});

test('body edit rejects premature closing directives and preserves CRLF', () => {
  const source = taskSource('#t status=open').replaceAll('\n', '\r\n');
  expect(createAtomicBodyEdit(source, task(source), 'Oops\n:::\nextra')).toBeNull();
  expect(apply(source, createAtomicBodyEdit(source, task(source), 'First\nSecond'))).toBe(source.replace('Do the work.', 'First\r\nSecond'));
});

test('evidence attribute editing safely encodes quotes, newlines and directive punctuation', () => {
  const source = wrap(':::acceptance-criterion{#ac status=unmet evidence="old" custom="keep"}\nOutcome\n:::\n');
  const directive = parseAtomicIntent(source).directives[0];
  const value = 'A "quote" & } brace\nsecond line';
  const updated = apply(source, createAtomicAttributeEdit(source, directive, 'evidence', value));
  expect(parseAtomicIntent(updated).directives[0].attributes.evidence).toBe(value);
  expect(updated).toContain('custom="keep"');
  expect(updated).toContain('status=unmet');
  const added = apply(source, createAtomicAttributeEdit(source, directive, 'verifiedBy', 'tests/a.py'));
  expect(parseAtomicIntent(added).directives[0].attributes.verifiedBy).toBe('tests/a.py');
});
