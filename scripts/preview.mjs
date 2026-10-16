import path from 'node:path';
import { defaultThemeSettings } from '../src/shared/themeDefaults.ts';

// Local browser smoke-test host for the real built webview. No file writes,
// CLI calls, or signature/validation simulation; editor changes stay in memory.
const root = path.resolve(import.meta.dir, '..');
const staticRoot = path.join(root, 'webview/dist');
const text = await Bun.file(path.join(root, 'examples/catalyst.intent.md')).text();
const init = {
  type: 'init', text, version: 1, diagnostics: [], theme: defaultThemeSettings,
  mode: 'live', outlinePosition: 'right', outlineVisible: false,
  lineNumbers: false, readOnly: false, gitChangesGutter: false,
  gitDiffLineHighlights: false, spellCheckEnabled: false,
  contentMaxWidthEnabled: true, vimMode: false, vimKeybindings: [], vimLeader: '\\',
  keymap: [], findOptions: { wholeWord: false, caseSensitive: false }
};
const payload = JSON.stringify(init).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Catalyst Intent Editor — browser preview</title>
<link rel="stylesheet" href="/webview/index.css">
<style>:root{--vscode-editor-background:#1e1e1e;--vscode-editor-foreground:#ddd;--vscode-sideBar-background:#252526;--vscode-panel-border:#444;--vscode-font-family:system-ui;--vscode-editor-font-family:monospace;--vscode-editor-font-size:14px;--vscode-editor-selectionBackground:#264f78;--vscode-focusBorder:#007fd4;--vscode-descriptionForeground:#aaa;--vscode-textLink-foreground:#75beff}body{overflow:hidden}</style>
</head><body class="vscode-dark"><div id="app"></div>
<script>
const init=${payload};
let state;
let hostText=init.text;
window.__atomicPreviewSource=init.text;
window.__atomicPreviewMessages=[];
window.acquireVsCodeApi=()=>({getState:()=>state,setState:value=>state=value,postMessage:message=>{
  window.__atomicPreviewMessages.push(message);
  if(message.type==='ready') setTimeout(()=>window.postMessage(init,'*'),0);
  if(message.type==='draftChanged') window.__atomicPreviewSource=typeof message.text==='string'?message.text:hostText;
  if(message.type==='applyChanges'){
    if(typeof message.content==='string') hostText=message.content;
    else for(const edit of [...(message.changes||[])].sort((a,b)=>b.from-a.from))
      hostText=hostText.slice(0,edit.from)+edit.insert+hostText.slice(edit.to);
    window.__atomicPreviewSource=hostText;
    setTimeout(()=>window.postMessage({type:'applied',version:++init.version},'*'),0);
  }
}});
</script><script type="module" src="/webview/index.js"></script></body></html>`;

const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 4173),
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/') {
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
    if (!pathname.startsWith('/webview/')) {
      return new Response('Not found', { status: 404 });
    }
    const filePath = path.resolve(staticRoot, decodeURIComponent(pathname.slice('/webview/'.length)));
    if (!filePath.startsWith(`${staticRoot}${path.sep}`)) {
      return new Response('Not found', { status: 404 });
    }
    const file = Bun.file(filePath);
    return await file.exists() ? new Response(file) : new Response('Build first: npm run build', { status: 404 });
  }
});
console.log(`Editor-only preview: ${server.url} (changes stay in memory; no CLI integration)`);
