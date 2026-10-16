---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::3
priority: medium
project: CATA
seq: 3
status: needs-review
title: Present provenance as a navigable semantic relationship tree
uid: 01M4XT81Y018SDSVQ0R97HMW7Z
view: dev
entry_type: intent
content_hash: W7S5GRJEVOHM44Y7RFSG5OKNN46HY4F4HHRTVI4EBJG56WAKVYTA
created_at: 2026-10-14T18:24:14.761177+00:00
updated_at: 2026-10-14T18:24:14.761177+00:00
---
:::why
The provenance webview has crossing edges and truncated labels that obscure relationships. The user wants a semantic tree with navigable links to children.
:::

:::acceptance-criterion{#01M4XT81Y018SDSVQ0R97HMW7Z-ac-1 status=met verifiedBy="Bun tests, TypeScript and Puppeteer browser smoke" evidence="bun test scripts/: 103 passing; bun run typecheck: passed; bun run test:atomic:graph: passed with child and cycle navigation, keyboard activation and 600px width"}
Selected provenance renders expandable nodes grouped by exact recorded relationship, with full labels, relationship navigation and shared-child links. Every node and edge remains accessible, including cycles and disconnected nodes. Unit tests, browser smoke and typechecks pass without changing backend evidence semantics.
:::

:::task{#01M4XT81Y018SDSVQ0R97HMW7Z-1 status=done criteria=01M4XT81Y018SDSVQ0R97HMW7Z-ac-1}
Implement a bounded semantic tree renderer, wire it into the provenance overlay, style it for VS Code themes, and verify navigation and graph fidelity.
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=webview/src/atomicEvidenceTree.ts}
::file-ref{path=webview/src/atomicGraph.css}
::file-ref{path=scripts/atomicEvidence.test.mjs}
::file-ref{path=scripts/atomicGraphSmoke.mjs}
:::

:::scope-in
Provenance presentation, relationship navigation, and focused tests.
:::

:::scope-out
Change-dependency graph layout, RPC/native integration, signing, editor behavior and packaging.
:::

:::constraint
Preserve recorded edge direction and labels; shared references are not invented ownership. Render evidence as text, retain attribution disclaimers, and respect unrelated existing work.
:::
