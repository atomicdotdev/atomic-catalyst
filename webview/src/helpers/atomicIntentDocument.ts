import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import { isScalar, parseDocument as parseYamlDocument } from 'yaml';
import type { Root, RootContent } from 'mdast';
import type { ContainerDirective, LeafDirective } from 'mdast-util-directive';

// This is a presentation index, not Atomic's canonical lifting or validation.
// Never stringify this tree: all edits address the original source directly.
const parser = unified().use(remarkParse).use(remarkFrontmatter).use(remarkDirective);

export const atomicSectionLabels: Record<string, string> = {
  why: 'Why',
  'acceptance-criterion': 'Acceptance criterion',
  task: 'Task',
  'scope-in': 'In scope',
  'scope-out': 'Out of scope',
  constraint: 'Constraint'
};

export interface AtomicDirective {
  name: string;
  from: number;
  to: number;
  headerTo: number;
  header: string;
  closingFrom?: number;
  parentFrom?: number;
  contentFrom?: number;
  contentTo?: number;
  attributes: Record<string, string>;
}

export interface AtomicIntentDocument {
  isIntent: boolean;
  title: string;
  id: string;
  status: string;
  directives: AtomicDirective[];
  metadata: Record<string, string>;
  metadataFrom?: number;
  metadataSource?: string;
}

export interface AtomicSourceEdit {
  from: number;
  to: number;
  insert: string;
}

function lineEnd(source: string, from: number): number {
  const newline = source.indexOf('\n', from);
  const end = newline < 0 ? source.length : newline;
  return end > from && source[end - 1] === '\r' ? end - 1 : end;
}

function asDirective(source: string, node: ContainerDirective | LeafDirective): AtomicDirective | null {
  const from = node.position?.start.offset;
  const to = node.position?.end.offset;
  if (from === undefined || to === undefined) {
    return null;
  }
  const headerTo = lineEnd(source, from);
  const header = source.slice(from, headerTo);
  // Incomplete containers remain plain source while the user is typing.
  let closingFrom: number | undefined;
  if (node.type === 'containerDirective') {
    const lastLineFrom = source.lastIndexOf('\n', to - 1) + 1;
    const closing = source.slice(lastLineFrom, to).trim();
    const opening = /^(:{3,})/.exec(header)?.[1];
    if (!opening || !/^:{3,}$/.test(closing) || closing.length < opening.length || lastLineFrom <= from) {
      return null;
    }
    closingFrom = lastLineFrom;
  }
  return {
    name: node.name,
    from,
    to,
    headerTo,
    header,
    closingFrom,
    contentFrom: closingFrom === undefined ? undefined : source.indexOf('\n', from) + 1,
    contentTo: closingFrom === undefined ? undefined :
      node.type === 'containerDirective' ?
        node.children.find((child) => child.type === 'containerDirective' || child.type === 'leafDirective')?.position?.start.offset ?? closingFrom : undefined,
    attributes: { ...node.attributes } as Record<string, string>
  };
}

/** Read-only presentation of a stored entry body, which may omit YAML frontmatter. */
export function readAtomicWhy(source: string): string {
  const tree = parser.parse(source) as Root;
  return tree.children.filter((node) => node.type === 'containerDirective' && node.name === 'why')
    .map((node) => asDirective(source, node as ContainerDirective))
    .filter((node): node is AtomicDirective => node?.contentFrom != null)
    .map((node) => source.slice(node.contentFrom, node.contentTo).trim()).join('\n\n');
}

export function parseAtomicIntent(source: string): AtomicIntentDocument {
  const result: AtomicIntentDocument = { isIntent: false, title: '', id: '', status: '', directives: [], metadata: {} };
  const tree: Root = parser.parse(source);
  const frontmatter = tree.children[0];
  if (frontmatter?.type !== 'yaml') {
    return result;
  }
  const metadataFrom = source.indexOf('\n', frontmatter.position!.start.offset!) + 1;
  const metadataTo = source.lastIndexOf('\n', frontmatter.position!.end.offset! - 1) + 1;
  const metadataSource = source.slice(metadataFrom, metadataTo);
  const metadata = parseYamlDocument(metadataSource);
  if (metadata.errors.length || metadata.get('entry_type') !== 'intent') {
    return result;
  }
  result.isIntent = true;
  result.metadataFrom = metadataFrom;
  result.metadataSource = metadataSource;
  for (const field of ['title', 'id', 'status', 'priority', 'project', 'author', 'created_by', 'uid', 'view', 'created_at', 'updated_at', 'content_hash']) {
    const value = metadata.get(field);
    result.metadata[field] = typeof value === 'string' ? value : '';
  }
  for (const field of ['title', 'id', 'status'] as const) {
    const value = metadata.get(field);
    result[field] = typeof value === 'string' ? value : '';
  }

  function collect(nodes: RootContent[], parentFrom?: number): void {
    for (const node of nodes) {
      if (node.type === 'containerDirective') {
        // Only recognized intent sections introduce Atomic presentation.
        // Unknown containers are kept entirely as source, including their children.
        if (!Object.hasOwn(atomicSectionLabels, node.name)) {
          continue;
        }
        const directive = asDirective(source, node);
        if (directive) {
          directive.parentFrom = parentFrom;
          result.directives.push(directive);
          collect(node.children as RootContent[], directive.from);
        }
      } else if (node.type === 'leafDirective' && node.name === 'file-ref') {
        const directive = asDirective(source, node);
        if (directive) {
          directive.parentFrom = parentFrom;
          result.directives.push(directive);
        }
      }
    }
  }
  collect(tree.children);
  return result;
}

interface StatusToken {
  from: number;
  to: number;
  quote: string;
}

// Tokenize the whole attribute list so a "status=..." substring in evidence
// cannot accidentally become the target. Ambiguous/unsupported syntax stays raw.
function attributeToken(header: string, attribute: string): StatusToken | null {
  if (!/^:{3,}(?:task|acceptance-criterion)\{.*\}[ \t]*$/.test(header)) {
    return null;
  }
  const from = header.indexOf('{') + 1;
  const to = header.lastIndexOf('}');
  const tokens = /\s*(?:[#.][^\s{}]+|([a-zA-Z_][\w-]*)(?:[ \t]*=[ \t]*("[^"]*"|'[^']*'|[^\s"'=<>`{}]+))?)/gy;
  tokens.lastIndex = from;
  let found: StatusToken | null = null;
  while (tokens.lastIndex < to) {
    const start = tokens.lastIndex;
    if (/^\s*$/.test(header.slice(start, to))) {
      break;
    }
    const match = tokens.exec(header);
    if (!match || tokens.lastIndex > to) {
      return null;
    }
    if (match[1] === attribute) {
      if (found || !match[2]) {
        return null;
      }
      const rawValue = match[2];
      const valueFrom = tokens.lastIndex - rawValue.length;
      const quote = /^["']/.test(rawValue) ? rawValue[0] : '';
      found = {
        from: valueFrom + quote.length,
        to: tokens.lastIndex - quote.length,
        quote
      };
    }
  }
  return found;
}

export function canEditAtomicStatus(directive: AtomicDirective): boolean {
  return attributeToken(directive.header, 'status') !== null;
}

export function atomicStatusOptions(directive: AtomicDirective): string[] {
  const suggestions = directive.name === 'acceptance-criterion'
    ? ['unmet', 'met']
    : ['open', 'in_progress', 'done'];
  return [...new Set([directive.attributes.status, ...suggestions].filter(Boolean))];
}

export function createAtomicStatusEdit(
  source: string,
  directive: AtomicDirective,
  nextStatus: string
): AtomicSourceEdit | null {
  if (!/^[a-zA-Z][\w-]*$/.test(nextStatus) || source.slice(directive.from, directive.headerTo) !== directive.header) {
    return null;
  }
  const token = attributeToken(directive.header, 'status');
  if (!token) {
    return null;
  }
  const from = directive.from + token.from;
  const to = directive.from + token.to;
  return source.slice(from, to) === nextStatus ? null : { from, to, insert: nextStatus };
}

export function createAtomicBodyEdit(source: string, directive: AtomicDirective, body: string): AtomicSourceEdit | null {
  const { contentFrom, contentTo, closingFrom } = directive;
  if (contentFrom === undefined || contentTo === undefined || closingFrom === undefined ||
      source.slice(directive.from, directive.headerTo) !== directive.header) {
    return null;
  }
  const current = parseAtomicIntent(source).directives.find((item) => item.from === directive.from && item.name === directive.name);
  if (!current || current.contentTo !== contentTo || current.closingFrom !== closingFrom) {
    return null;
  }
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const suffix = source.slice(contentFrom, contentTo).match(/(?:\r?\n)+$/)?.[0] ?? eol;
  const insert = body.replace(/\r\n|\r|\n/g, eol).replace(/(?:\r?\n)+$/, '') + suffix;
  if (source.slice(contentFrom, contentTo) === insert) {
    return null;
  }
  const candidate = source.slice(0, contentFrom) + insert + source.slice(contentTo);
  const updated = parseAtomicIntent(candidate).directives.find((item) => item.from === directive.from && item.name === directive.name);
  // Text such as a bare ::: must not prematurely close its containing directive.
  const delta = insert.length - (contentTo - contentFrom);
  return updated?.closingFrom === closingFrom + delta ? { from: contentFrom, to: contentTo, insert } : null;
}

export function createAtomicAttributeEdit(source: string, directive: AtomicDirective, attribute: string, value: string): AtomicSourceEdit | null {
  if (!['evidence', 'verifiedBy', 'criteria'].includes(attribute) ||
      source.slice(directive.from, directive.headerTo) !== directive.header ||
      !/^:{3,}(?:task|acceptance-criterion)\{.*\}[ \t]*$/.test(directive.header)) {
    return null;
  }
  const token = attributeToken(directive.header, attribute);
  const encode = (text: string, quote: string) => text.replace(/&/g, '&amp;').replace(/\r/g, '&#13;').replace(/\n/g, '&#10;')
    .replace(quote === "'" ? /'/g : /"/g, quote === "'" ? '&#39;' : '&quot;');
  if (!token) {
    // Do not insert over an ambiguous existing attribute.
    if (Object.hasOwn(directive.attributes, attribute)) {
      return null;
    }
    const position = directive.from + directive.header.lastIndexOf('}');
    return { from: position, to: position, insert: ` ${attribute}="${encode(value, '"')}"` };
  }
  const quote = token.quote || '"';
  const insert = token.quote ? encode(value, quote) : `"${encode(value, quote)}"`;
  const from = directive.from + token.from;
  const to = directive.from + token.to;
  return source.slice(from, to) === insert ? null : { from, to, insert };
}

export function createAtomicMetadataEdit(source: string, intent: AtomicIntentDocument, field: string, value: string): AtomicSourceEdit | null {
  if (!['title', 'status', 'priority'].includes(field) || intent.metadataFrom === undefined || !intent.metadataSource ||
      source.slice(intent.metadataFrom, intent.metadataFrom + intent.metadataSource.length) !== intent.metadataSource || /[\r\n\0]/.test(value)) {
    return null;
  }
  const metadata = parseYamlDocument(intent.metadataSource);
  const node = metadata.get(field, true);
  if (!isScalar(node) || !node.range ||
      !['PLAIN', 'QUOTE_SINGLE', 'QUOTE_DOUBLE'].includes(String(node.type))) {
    return null;
  }
  let insert = JSON.stringify(value);
  if (node.type === 'QUOTE_SINGLE') {
    insert = `'${value.replace(/'/g, "''")}'`;
  } else if (node.type === 'PLAIN') {
    const probe = parseYamlDocument(`value: ${value}\n`);
    if (!probe.errors.length && probe.get('value') === value) {
      insert = value;
    }
  }
  const from = intent.metadataFrom + node.range[0];
  const to = intent.metadataFrom + node.range[1];
  return source.slice(from, to) === insert ? null : { from, to, insert };
}
