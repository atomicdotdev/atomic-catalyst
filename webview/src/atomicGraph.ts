import { mountAtomicGraph } from './atomicGraphView';
import type { ExplorerEvent } from '../../src/shared/atomicEvidence';

const api = acquireVsCodeApi() as unknown as { postMessage(message: unknown): void };
const root = document.getElementById('atomic-graph');
if (root) {
  const graph = mountAtomicGraph(root, (message) => api.postMessage(message));
  window.addEventListener('message', (event: MessageEvent<ExplorerEvent>) => graph.receive(event.data));
  window.addEventListener('pagehide', () => graph.dispose(), { once: true });
  api.postMessage({ action: 'ready' });
}
