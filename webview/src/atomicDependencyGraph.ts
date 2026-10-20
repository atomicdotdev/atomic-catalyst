import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { drag, dragEnable } from 'd3-drag';
import { pointer, select as d3Select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import type { EvidenceEdge, EvidenceNode } from '../../src/shared/atomicEvidence';

/** Adapted from atomic-cli/src/commands/query/mod.rs, emit_html (Atomic query graph).
 * Copyright 2025-2026 Atomic Software, Co.; Apache-2.0 (THIRD_PARTY_APACHE_LICENSE.txt).
 * Webview changes: scoped canvas, bundled D3, directed arrows, safe text, inspector selection,
 * editor-theme background/label colors and basename labels on small graphs.
 * Keep its node palette, radii and force parameters; never fetch graph code from a CDN.
 */
export const QUERY_NODE_COLORS: Record<string, string> = {
  module: '#3498db', file: '#2ecc71', entity: '#e67e22', change: '#e74c3c',
  view: '#9b59b6', identity: '#f1c40f', goal: '#1abc9c', intent: '#1abc9c', memory: '#f39c12'
};
export const QUERY_EDGE_COLORS: Record<string, string> = {
  DEFINES: '#e67e22', MODIFIES: '#e74c3c', PART_OF: '#3498db', INCLUDES: '#2ecc71',
  AUTHORED_BY: '#f1c40f', DEPENDS_ON: '#e74c3c', ON_VIEW: '#9b59b6', REFERENCES: '#95a5a6'
};
export type QueryNode = EvidenceNode & SimulationNodeDatum & { r: number; selected: boolean };
export type QueryLink = { source: QueryNode; target: QueryNode; kind: string };
export function queryNodeRadius(kind: string): number {
  // These DTOs contain no content-match counts, so use the CLI's zero-match radii.
  return kind === 'module' ? 14 : kind === 'entity' || kind === 'change' ? 4 : 5;
}
export function queryGraphData(nodes: EvidenceNode[], edges: EvidenceEdge[]): { nodes: QueryNode[]; links: QueryLink[] } {
  const copied = nodes.map((node) => ({ ...node, r: queryNodeRadius(node.kind), selected: false }));
  const byId = new Map(copied.map((node) => [node.id, node]));
  const links = edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)).map((edge) => ({
    source: byId.get(edge.from)!, target: byId.get(edge.to)!, kind: edge.label
  }));
  return { nodes: copied, links };
}
export function queryGraphSimulation(nodes: QueryNode[], links: QueryLink[], width: number, height: number) {
  return forceSimulation(nodes)
    .force('link', forceLink<QueryNode, QueryLink>(links).id((node) => node.id).distance(80))
    .force('charge', forceManyBody().strength(-30).distanceMax(300))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide<QueryNode>().radius((node) => node.r + 2));
}
export type DependencyGraph = { destroy(): void; setEnabled(enabled: boolean): void; setSelected(id: string): void };

export function mountDependencyGraph(container: HTMLElement, nodes: EvidenceNode[], edges: EvidenceEdge[], onSelect: (id: string) => void,
  presentation?: { title: string; caption: string; description: string }): DependencyGraph {
  const doc = container.ownerDocument;
  const win = doc.defaultView!;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) => {
    const item = doc.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  container.replaceChildren();
  if (!nodes.length) {
    container.append(el('p', 'No nodes returned for this graph.', 'muted'));
    return { destroy() {}, setEnabled() {}, setSelected() {} };
  }
  let enabled = true;
  const toolbar = el('div', undefined, 'graph-toolbar');
  toolbar.append(el('strong', presentation?.title || 'Atomic query graph visual'));
  const viewport = el('div', undefined, 'graph-scroll query-graph-viewport');
  const caption = el('div', undefined, 'query-graph-caption');
  caption.append(el('strong', 'ATOMIC GRAPH'), el('span', presentation?.caption || 'Change dependencies', 'query'), el('span', `${nodes.length} nodes · ${edges.length} edges`, 'stats'));
  const canvas = el('canvas', undefined, 'dependency-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', presentation?.description || 'Atomic change dependency graph. Use the change list below for keyboard navigation.');
  const tooltip = el('div', undefined, 'query-graph-tooltip');
  tooltip.hidden = true;
  const ttKind = el('div', undefined, 'kind'), ttLabel = el('div', undefined, 'label'), ttSummary = el('div', undefined, 'summary');
  tooltip.append(ttKind, ttLabel, ttSummary);
  const legend = el('div', undefined, 'query-graph-legend');
  legend.append(el('strong', 'NODE TYPES'));
  for (const kind of new Set(nodes.map((node) => node.kind))) {
    const row = el('div'), dot = el('span', undefined, 'legend-dot');
    dot.style.backgroundColor = QUERY_NODE_COLORS[kind] || '#7f8c8d';
    row.append(dot, doc.createTextNode(kind));
    legend.append(row);
  }
  viewport.append(canvas, caption, tooltip, legend);
  const info = el('p', 'Click a node for evidence. Hover for its full summary; drag a node or the background to arrange the graph.', 'muted graph-info');
  const list = el('details', undefined, 'graph-node-list');
  list.append(el('summary', 'Change list · keyboard navigation and full summaries'));
  const items = el('ul');
  const buttons: HTMLButtonElement[] = [];
  for (const node of nodes) {
    const item = el('li'), action = el('button', `${node.label} · ${node.id}${node.loaded ? '' : ' · outside loaded history'}`);
    action.type = 'button';
    action.dataset.evidenceId = node.id;
    action.addEventListener('click', () => choose(node.id));
    buttons.push(action); item.append(action); items.append(item);
  }
  list.append(items);
  container.append(toolbar, viewport, info, list);

  let width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight);
  const context = canvas.getContext('2d')!;
  // Read the editor theme once so strokes and labels follow light/dark themes; node colors keep the CLI palette.
  const themeColor = (name: string, fallback: string) => (win.getComputedStyle(container).getPropertyValue(name) || '').trim() || fallback;
  const themeForeground = themeColor('--vscode-editor-foreground', '#cccccc');
  const themeBackground = themeColor('--vscode-editor-background', '#1e1e1e');
  const labelAll = nodes.length <= 40;
  const data = { ...queryGraphData(nodes, edges), transform: zoomIdentity, destroyed: false, width, height };
  // D3's bound presentation data contains only display DTOs and simulated positions.
  const surface = d3Select(canvas).datum(data);
  const simulation = queryGraphSimulation(data.nodes, data.links, width, height).stop();
  simulation.tick(240);
  const nodeColor = (node: QueryNode) => QUERY_NODE_COLORS[node.kind] || '#7f8c8d';
  function draw() {
    if (data.destroyed) return;
    const dpr = win.devicePixelRatio || 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(data.transform.x, data.transform.y);
    context.scale(data.transform.k, data.transform.k);
    context.lineWidth = 0.6; context.globalAlpha = 0.4;
    for (const link of data.links) {
      const s = link.source, t = link.target;
      context.strokeStyle = QUERY_EDGE_COLORS[link.kind.toUpperCase().replace(/ /g, '_')] || themeForeground;
      context.beginPath(); context.moveTo(s.x!, s.y!); context.lineTo(t.x!, t.y!); context.stroke();
      // Tiny arrowheads preserve the recorded dependency direction without changing the CLI visual.
      const angle = Math.atan2(t.y! - s.y!, t.x! - s.x!);
      const x = t.x! - Math.cos(angle) * (t.r + 2), y = t.y! - Math.sin(angle) * (t.r + 2);
      context.beginPath(); context.moveTo(x, y);
      context.lineTo(x - Math.cos(angle - 0.45) * 4, y - Math.sin(angle - 0.45) * 4);
      context.moveTo(x, y); context.lineTo(x - Math.cos(angle + 0.45) * 4, y - Math.sin(angle + 0.45) * 4); context.stroke();
    }
    for (const node of data.nodes) {
      context.globalAlpha = node.loaded ? 0.9 : 0.45;
      context.beginPath(); context.arc(node.x!, node.y!, node.r, 0, 2 * Math.PI);
      context.fillStyle = nodeColor(node); context.fill();
      context.globalAlpha = 1; context.strokeStyle = node.loaded ? themeBackground : nodeColor(node);
      context.lineWidth = 1.2; context.setLineDash(node.loaded ? [] : [2, 2]); context.stroke(); context.setLineDash([]);
      if (node.selected) {
        context.beginPath(); context.arc(node.x!, node.y!, node.r + 4, 0, 2 * Math.PI);
        context.strokeStyle = themeForeground; context.lineWidth = 1.5; context.stroke();
      }
      if (node.r > 10 || labelAll) {
        const label = node.r > 10 ? `${node.label}${node.kind === 'module' ? '/' : ''}` : node.label.split('/').pop() || node.label;
        context.globalAlpha = 0.85; context.fillStyle = themeForeground; context.textAlign = 'center'; context.textBaseline = 'top';
        context.font = `${node.r > 10 ? Math.max(9, Math.min(12, node.r * 0.7)) : 10}px -apple-system, BlinkMacSystemFont, sans-serif`;
        context.fillText(label.length > 28 ? `${label.slice(0, 25)}...` : label, node.x!, node.y! + node.r + 3);
      }
    }
    context.restore();
  }
  function setSelected(id: string) {
    data.nodes.forEach((node) => { node.selected = node.id === id; });
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.evidenceId === id)));
    draw();
  }
  function choose(id: string) { if (enabled && !data.destroyed) { setSelected(id); onSelect(id); } }
  function findNode(x: number, y: number) {
    const [sx, sy] = data.transform.invert([x, y]);
    let found: QueryNode | undefined, distance = Infinity;
    for (const node of data.nodes) {
      const d = Math.hypot(node.x! - sx, node.y! - sy);
      if (d < node.r + 4 / data.transform.k && d < distance) { found = node; distance = d; }
    }
    return found;
  }
  const zoomBehavior = zoom<HTMLCanvasElement, typeof data>().scaleExtent([0.001, 10])
    .extent(() => [[0, 0], [width, height]])
    .filter((event) => !event.button && (event.type !== 'mousedown' || !findNode(...pointer(event, canvas) as [number, number])))
    .on('zoom', (event) => { data.transform = event.transform; if (event.sourceEvent) tooltip.hidden = true; draw(); });
  surface.call(zoomBehavior);
  surface.call(drag<HTMLCanvasElement, typeof data, QueryNode>().container(() => canvas).clickDistance(4)
    .subject((event) => findNode(event.x, event.y))
    .on('start', (event) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x; event.subject.fy = event.subject.y;
      canvas.style.cursor = 'grabbing'; tooltip.hidden = true;
    })
    .on('drag', (event) => {
      const point = pointer(event.sourceEvent, canvas);
      const [x, y] = data.transform.invert(point);
      event.subject.fx = x; event.subject.fy = y;
    })
    .on('end', (event) => {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null; event.subject.fy = null; canvas.style.cursor = 'grab';
    }));
  simulation.on('tick', draw);
  surface.on('click.evidence', (event) => {
    const node = findNode(...pointer(event, canvas) as [number, number]);
    if (node) choose(node.id);
  }).on('mousemove.evidence', (event) => {
    const [x, y] = pointer(event, canvas), node = findNode(x, y);
    if (!node || event.buttons) { tooltip.hidden = true; return; }
    ttKind.textContent = node.kind.toUpperCase(); ttLabel.textContent = node.id; ttSummary.textContent = node.label;
    info.textContent = `${node.label} · ${node.id}${node.loaded ? '' : ' · reference outside loaded history'}`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.max(8, Math.min(x + 14, width - tooltip.offsetWidth - 8))}px`;
    tooltip.style.top = `${Math.max(48, Math.min(y + 14, height - tooltip.offsetHeight - 8))}px`;
    canvas.style.cursor = 'grab';
  }).on('mouseleave.evidence', () => { tooltip.hidden = true; });
  const fit = () => {
    const x1 = Math.min(...data.nodes.map((node) => node.x! - node.r - (node.r > 10 ? 90 : 8)));
    const x2 = Math.max(...data.nodes.map((node) => node.x! + node.r + (node.r > 10 ? 90 : 8)));
    const y1 = Math.min(...data.nodes.map((node) => node.y! - node.r - 8));
    const y2 = Math.max(...data.nodes.map((node) => node.y! + node.r + (node.r > 10 ? 24 : 8)));
    const scale = Math.max(0.001, Math.min(1, (width - 64) / Math.max(1, x2 - x1), (height - 120) / Math.max(1, y2 - y1)));
    surface.call(zoomBehavior.transform, zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-(x1 + x2) / 2, -(y1 + y2) / 2));
  };
  let sized = false;
  const resize = () => {
    const nextWidth = Math.max(1, viewport.clientWidth), nextHeight = Math.max(1, viewport.clientHeight);
    const pixelWidth = Math.round(nextWidth * (win.devicePixelRatio || 1)), pixelHeight = Math.round(nextHeight * (win.devicePixelRatio || 1));
    if (sized && nextWidth === width && nextHeight === height && canvas.width === pixelWidth && canvas.height === pixelHeight) return;
    sized = true;
    width = nextWidth; height = nextHeight; tooltip.hidden = true;
    data.width = width; data.height = height;
    canvas.width = pixelWidth; canvas.height = pixelHeight;
    simulation.force('center', forceCenter(width / 2, height / 2));
    fit();
  };
  for (const [label, action] of [['Fit graph', fit], ['Zoom in', () => surface.call(zoomBehavior.scaleBy, 1.25)], ['Zoom out', () => surface.call(zoomBehavior.scaleBy, 0.8)]] as const) {
    const button = el('button', label); button.type = 'button'; button.addEventListener('click', action); toolbar.append(button);
  }
  resize();
  canvas.dataset.ready = 'true';
  const observer = new ResizeObserver(() => { if (!data.destroyed) resize(); });
  observer.observe(viewport);
  return {
    setSelected,
    setEnabled(value) { enabled = value; buttons.forEach((button) => { button.disabled = !value; }); },
    destroy() {
      data.destroyed = true; simulation.stop(); observer.disconnect(); tooltip.hidden = true;
      surface.on('.zoom', null).on('.drag', null).on('.evidence', null);
      d3Select(win).on('.drag', null).on('.zoom', null);
      dragEnable(win);
    }
  };
}
