---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::5
priority: medium
project: CATA
seq: 5
status: needs-review
title: Replace custom graph physics and rendering with Cytoscape.js
uid: 01M4XVAVD7BSAMB69K4GN7WABC
view: dev
entry_type: intent
content_hash: 5VAHVC7UHTBCYGJHQTANFTZ6NEZQR6S3RL52K4FFXIFWOYB2YG2Q
created_at: 2026-10-14T18:49:47.685321+00:00
updated_at: 2026-10-14T18:49:47.685321+00:00
---
:::why
The user identified that the hand-written force simulation produces overlapping nodes and giant labels and requested use of an established npm graph library.
:::

:::acceptance-criterion{#01M4XVAVD7BSAMB69K4GN7WABC-ac-1 status=met verifiedBy="Bun tests, TypeScript, Puppeteer rendered geometry and VSIX archive assertions" evidence="105 tests pass; typecheck passes; strict-CSP browser smoke verifies 1/3/30/500-node geometry, cycles, canvas and keyboard selection, node dragging, pan, zoom, resize and destroyed instances; 0.2.5 VSIX graph JS/CSS match current build and include Cytoscape/fCoSE plus license notices"}
Cytoscape.js owns graph layout, rendering and interactions; sparse graphs have readable non-overlapping nodes and initial zoom no greater than one. Directed edges, unloaded references, safe evidence selection and keyboard access remain truthful. Tests cover sparse, disconnected, connected and cyclic graphs, resizing and cleanup; typechecks and browser smoke pass and a fresh 0.2.5 VSIX contains the bundled library.
:::

:::task{#01M4XVAVD7BSAMB69K4GN7WABC-1 status=done criteria=01M4XVAVD7BSAMB69K4GN7WABC-ac-1}
Add Cytoscape.js with its fCoSE layout extension, remove bespoke physics/SVG rendering, provide theme-aware graph controls and accessible selection, test actual rendered geometry and interactions, and package version 0.2.5.
::file-ref{path=webview/src/atomicDependencyGraph.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=webview/src/atomicGraph.css}
::file-ref{path=src/atomic/graphPanel.ts}
::file-ref{path=scripts/atomicGraphSmoke.mjs}
::file-ref{path=scripts/atomicEvidence.test.mjs}
::file-ref{path=package.json}
:::

:::scope-in
Graph dependency and renderer, graph UI tests, version metadata, release notes and local VSIX.
:::

:::scope-out
Backend semantics, provenance tree relationships, cryptographic verification, automatic installation and Marketplace publication.
:::

:::constraint
Bundle graph code locally without CDN or new CSP permissions. Preserve recorded edge direction, render untrusted labels as data/text, maintain invalidation guards, and destroy graph listeners/observers on replacement.
:::
