import type { EvidenceEdge, EvidenceNode } from '../../src/shared/atomicEvidence';

type TreeEdge = { edge: EvidenceEdge; child?: TreeEntry };
type TreeEntry = { node: EvidenceNode; groups: Map<string, TreeEdge[]> };

/** A display spanning forest, not an assertion of ownership. Non-tree edges stay as links. */
export function evidenceForest(nodes: EvidenceNode[], edges: EvidenceEdge[]): TreeEntry[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, EvidenceEdge[]>();
  const incoming = new Set<string>();
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    const list = outgoing.get(edge.from) || [];
    list.push(edge);
    outgoing.set(edge.from, list);
    incoming.add(edge.to);
  }
  // Follow specific causal relationships before broad led_to shortcuts.
  for (const list of outgoing.values()) list.sort((a, b) => Number(a.label === 'led_to') - Number(b.label === 'led_to'));
  const roots: TreeEntry[] = [];
  const visited = new Set<string>();
  const candidates = [...nodes.filter((node) => !incoming.has(node.id)), ...nodes];
  for (const node of candidates) {
    if (visited.has(node.id)) continue;
    const entry: TreeEntry = { node, groups: new Map() };
    roots.push(entry);
    visited.add(node.id);
    const stack = [{ entry, index: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const edge = outgoing.get(frame.entry.node.id)?.[frame.index++];
      if (!edge) { stack.pop(); continue; }
      const group = frame.entry.groups.get(edge.label) || [];
      const item: TreeEdge = { edge };
      group.push(item);
      frame.entry.groups.set(edge.label, group);
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        item.child = { node: byId.get(edge.to)!, groups: new Map() };
        stack.push({ entry: item.child, index: 0 });
      }
    }
  }
  return roots;
}

let treeSerial = 0;

export function renderEvidenceTree(container: HTMLElement, nodes: EvidenceNode[], edges: EvidenceEdge[], onSelect?: (node: EvidenceNode) => void): void {
  const doc = container.ownerDocument;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  container.replaceChildren();
  container.classList.add('semantic-tree');
  if (!nodes.length) { container.append(el('p', 'No recorded nodes.', 'muted')); return; }
  const prefix = `evidence-tree-${++treeSerial}`;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const targets = new Map<string, HTMLElement>();
  const ids = new Map(nodes.map((node, index) => [node.id, `${prefix}-${index}`]));
  const branches: HTMLDetailsElement[] = [];
  const reveal = (id: string) => {
    const target = targets.get(id);
    if (!target) return;
    let parent: HTMLElement | null = target.parentElement;
    while (parent && parent !== container) {
      if (parent.tagName === 'DETAILS') (parent as HTMLDetailsElement).open = true;
      parent = parent.parentElement;
    }
    target.focus();
    target.scrollIntoView?.({ block: 'nearest' });
    onSelect?.(byId.get(id)!);
  };
  const link = (edge: EvidenceEdge, text: string) => {
    const item = el('a', text, 'relationship-link');
    item.href = `#${ids.get(edge.to)}`;
    item.title = `${edge.from} — ${edge.label} → ${edge.to}`;
    item.dataset.from = edge.from;
    item.dataset.to = edge.to;
    item.addEventListener('click', (event) => { event.preventDefault(); reveal(edge.to); });
    return item;
  };
  const toolbar = el('div', undefined, 'tree-toolbar');
  toolbar.append(el('strong', `${nodes.length} nodes · ${edges.length} relationships`));
  for (const [label, open] of [['Expand all', true], ['Collapse all', false]] as const) {
    const action = el('button', label);
    action.type = 'button';
    action.addEventListener('click', () => branches.forEach((branch) => { branch.open = open; }));
    toolbar.append(action);
  }
  container.append(toolbar, el('p', 'Follow recorded relationships below. Shared or cyclic children link to their existing node; nesting is a reading aid, not exclusive ownership.', 'muted'));

  const index = el('nav', undefined, 'relationship-index');
  index.setAttribute('aria-label', 'Recorded relationship links');
  const labels = new Map<string, EvidenceEdge[]>();
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    const group = labels.get(edge.label) || [];
    group.push(edge);
    labels.set(edge.label, group);
  }
  for (const [label, group] of labels) {
    const details = el('details');
    details.append(el('summary', `${label} · ${group.length}`));
    const list = el('ul');
    for (const edge of group) {
      const item = el('li');
      item.append(link(edge, `${byId.get(edge.from)!.label} → ${byId.get(edge.to)!.label}`));
      list.append(item);
    }
    details.append(list);
    index.append(details);
  }
  container.append(index);

  const forest = el('ul', undefined, 'tree-roots');
  forest.setAttribute('aria-label', 'Recorded provenance relationships');
  container.append(forest);
  const stack = evidenceForest(nodes, edges).reverse().map((entry) => ({ entry, parent: forest, depth: 0 }));
  while (stack.length) {
    const { entry, parent, depth } = stack.pop()!;
    const item = el('li', undefined, 'tree-node');
    item.dataset.nodeId = entry.node.id;
    const details = el('details');
    details.open = depth < 2;
    branches.push(details);
    const summary = el('summary', undefined, 'tree-node-heading');
    summary.id = ids.get(entry.node.id)!;
    summary.append(el('span', entry.node.kind, 'node-kind'), el('span', entry.node.label, 'tree-node-label'));
    summary.addEventListener('click', () => onSelect?.(entry.node));
    targets.set(entry.node.id, summary);
    details.append(summary, el('p', entry.node.id, 'tree-node-id'));
    if (!entry.node.loaded) details.append(el('p', 'Reference outside loaded evidence', 'muted'));
    if (!entry.groups.size) details.append(el('p', 'No outgoing recorded relationships.', 'muted tree-leaf'));
    const pending: typeof stack = [];
    for (const [label, group] of entry.groups) {
      const relation = el('details', undefined, 'tree-relationship');
      relation.open = depth < 2;
      branches.push(relation);
      relation.append(el('summary', `${label} · ${group.length}`));
      const children = el('ul');
      for (const child of group) {
        if (child.child) {
          // Reserve the child's location so references and siblings retain edge order.
          const slot = el('li', undefined, 'tree-slot');
          const list = el('ul');
          slot.append(list);
          children.append(slot);
          pending.push({ entry: child.child, parent: list, depth: depth + 1 });
        } else {
          const reference = el('li', undefined, 'tree-reference');
          reference.append(link(child.edge, `↗ ${byId.get(child.edge.to)!.label}`), el('span', 'Linked node', 'muted'));
          children.append(reference);
        }
      }
      relation.append(children);
      details.append(relation);
    }
    item.append(details);
    parent.append(item);
    stack.push(...pending.reverse());
  }
}
