---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::6
priority: medium
project: CATA
seq: 6
status: needs-review
title: Match Atomic query graph visuals and redesign node evidence inspector
uid: 01M4Y086Q42WPFGRAJ2NDDQB9R
view: dev
entry_type: intent
content_hash: ABIYPEA2WETVDNVD7NZAHMNIW634K47NHL7NSYIJRDP34OZKDIGQ
created_at: 2026-10-14T21:15:45.221038+00:00
updated_at: 2026-10-14T21:15:45.221038+00:00
---
:::why
The user wants Catalyst to reuse the established visual of atomic query graph rather than invent another graph style, with node clicks showing detailed, beautified evidence.
:::

:::acceptance-criterion{#01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1 status=met verifiedBy="Bun unit suite, TypeScript, strict-CSP Puppeteer checks and VSIX archive assertions" evidence="107 tests pass; typecheck passes; built browser checks verify CLI palette/radii and 1–500-node geometry, canvas/keyboard selection, tooltips, drag/pan/zoom, local provenance node details, stale-action guards and separate signature/source/trust/editor cards; package:vsix produced 0.2.6 and packaged JS/CSS and upstream license match current files"}
The graph adapts Atomic CLI emit_html's D3 canvas, palette, node radii, force parameters, subtle edges, tooltips and legend using locally bundled modules. Clicking graph or recorded provenance nodes opens a structured inspector with truthful evidence facts and relationships. Unit, typecheck and strict-CSP browser checks pass; a new 0.2.6 VSIX contains the current graph and inspector.
:::

:::task{#01M4Y086Q42WPFGRAJ2NDDQB9R-1 status=done criteria=01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1}
Adapt the CLI viewer to the webview without touching ~/Projects/atomic; replace the Cytoscape renderer, redesign the inspector and local provenance-node selection, test geometry/interactions/safety and package the update.
::file-ref{path=webview/src/atomicDependencyGraph.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=webview/src/atomicEvidenceTree.ts}
::file-ref{path=webview/src/atomicEvidenceInspector.ts}
::file-ref{path=webview/src/atomicGraph.css}
::file-ref{path=scripts/atomicGraphSmoke.mjs}
::file-ref{path=scripts/atomicEvidence.test.mjs}
::file-ref{path=package.json}
:::

:::scope-in
Graph presentation/dependencies, evidence inspector styling and selection, tests, release metadata and local 0.2.6 VSIX.
:::

:::scope-out
Atomic repository source, graph backend scope, RPC semantics, cryptographic verification, automatic extension installation and Marketplace publication.
:::

:::constraint
Use the CLI source as the visual reference, not a substitute for backend graph semantics. Keep recorded edge direction, unloaded references, stale-response guards and script-free signed snapshots. Do not add CDN access or weaken CSP; render evidence as text and preserve signature/freshness/trust separation.
:::
