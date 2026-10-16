---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::7
priority: medium
project: CATA
seq: 7
status: needs-review
title: Route typed view clicks to draft observability or shared placeholder
uid: 01M503J8PH4AKS909RGXZ5RC3C
view: dev
entry_type: intent
content_hash: E5ASPZNFV5IDMJGXUV3CN6NNONUP7CO4VROKELKVVSU36NRQMISA
created_at: 2026-10-15T16:20:52.128681+00:00
updated_at: 2026-10-15T16:20:52.128681+00:00
---
:::why
The user wants explicit Draft/Shared labels in the left views tree and click-to-open routing: shared views show Not implemented yet; drafts show an intent summary, blast radius and provenance log in the central webview without a right-hand Evidence Inspector.
:::

:::acceptance-criterion{#01M503J8PH4AKS909RGXZ5RC3C-ac-1 status=met verifiedBy="Bun unit suite, TypeScript, host-module smoke, strict-CSP browser checks and real packaged native smoke" evidence="118 Catalyst tests and 18 nodeatomic tests pass; typecheck passes; real native smoke verifies Draft scope, four own changes, inherited exclusion and affected paths; host smoke verifies left-tree click/ready routing without switching; browser verifies Shared/unknown gating, central blast-radius/log layout, filters, 50-row paging and stale-action guards; 0.2.7 VSIX assets/version/native addon match current build"}
Authoritative backend scope labels appear in the views tree; clicking opens the exact view without switching the working copy. Shared/unknown scopes do not fetch or render draft evidence. Draft pages show linked intent title/why/tool plus honest usage availability, recorded affected paths, and paged type-pill/action provenance rows with inline details, no canvas or inspector sidebar. Own-history requests exclude inherited history; stale results cannot repopulate another view. Tests, typecheck, strict-CSP browser checks and a verified 0.2.7 VSIX pass.
:::

:::task{#01M503J8PH4AKS909RGXZ5RC3C-1 status=done criteria=01M503J8PH4AKS909RGXZ5RC3C-ac-1}
Preserve typed scopes, route tree clicks through the panel, build bounded read-only draft projections from per-change files/provenance and explicitly linked vault intents, replace the graph-first webview, and verify shared/draft routing and safety.
::file-ref{path=src/atomic/sourceControl.ts}
::file-ref{path=src/atomic/graphPanel.ts}
::file-ref{path=src/atomic/evidenceExplorer.ts}
::file-ref{path=src/atomic/evidence.ts}
::file-ref{path=src/shared/atomicEvidence.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=webview/src/atomicGraph.css}
:::

:::scope-in
View navigation and labels, draft-only observability projections and central UI, tests, documentation/release metadata and local VSIX. The user explicitly approved rebuilding existing libatomic source and installing/regenerating nodeatomic to validate the real native path; no producer source edits are planned.
:::

:::scope-out
Shared-view implementation, producer source edits, general knowledge graph traversal, cost estimation, cryptographic verification, automatic installation and publication.
:::

:::constraint
Use backend scope, never view-name guesses; explicit view selection is read-only. Shared views stop before draft history/detail queries. Show backend-recorded files, not paths guessed from tool summaries; downstream impact, tokens and cost remain unavailable unless explicitly supplied. Preserve immutable signed-snapshot support, safe text rendering and generation fences.
:::
