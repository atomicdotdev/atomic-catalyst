---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::9
priority: medium
project: CATA
seq: 9
status: in_progress
title: Simplify view navigation to hash-selected change details
uid: 01M50DXGGGT32E3BPY1TTCDKX1
view: dev
entry_type: intent
content_hash: VERBEHAAUJQDXHB2PCTJLJ4UJA5JOSGGSMGT2A27PHYKUL4RYJYA
created_at: 2026-10-15T18:57:08.970180+00:00
updated_at: 2026-10-15T18:57:08.970180+00:00
---
:::why
Users need view-to-change navigation whose webview represents Atomic's native change output, not a redesigned dashboard. The reference is the continuous monospace change report, attestation and change ledger; editor-only linked-intent controls must remain secondary.
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-1 status=met verifiedBy="TypeScript, Bun regression tests and Chromium browser smoke" evidence="bun run typecheck; bun test scripts/ (130 pass); bun run test:atomic:graph; bun run build:extension:main"}
Views expand to paginated hash rows; selecting a hash opens focused change evidence with linked intent, recorded usage, affected paths and activities. Missing/multiple links are called out without fabricating a SHACL report. Type checks and targeted regression tests pass.
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-2 status=met verifiedBy="TypeScript, Bun tests and Chromium smoke" evidence="bun run typecheck; bun test scripts/ (131 pass); bun run test:atomic:graph; bun run build:extension:main; native-report screenshot inspected"}
The selected change uses a continuous monospace report with author/date/message/dependencies/files followed by Attestation and Change Ledger. Ledger kinds, order and command/path details remain visible without paging or per-action expansion. No cards, metric tiles or invented graph/hunk statistics appear. Type checks, unit regressions and Chromium smoke checks pass.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-2 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-2}
Replace the dashboard renderer and stylesheet with native report formatting, carry the recorded date across the presentation boundary, and cover the continuous ledger and secondary intent controls in regression tests.
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=webview/src/atomicGraph.css}
::file-ref{path=src/atomic/evidence.ts}
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-1 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-1}
Implement per-view history navigation, fenced detail selection and a focused single-change renderer; cover navigation and link states with regression tests.
::file-ref{path=src/atomic/sourceControl.ts}
::file-ref{path=src/atomic/evidenceExplorer.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
:::

:::scope-in
Atomic tree navigation and change-detail webview presentation. Per user correction, expose native graph/hunk summaries and change-local structural blast radius in ~/Projects/atomic/libatomic, consume the contract in ~/Projects/nodeatomic, then render the typed data in the extension. Use ~/Projects/noname as a read-only visual/behavior reference for the explicitly requested module-by-hop heatmap; do not replace the native report with a dashboard. File entries now open VS Code native diffs: tracked SCM files compare the recorded baseline with the live working file, while historical change paths compare immutable recorded before/after snapshots. The existing read-only restore preview may supply baseline bytes; no restore mutation is permitted.
:::

:::scope-out
Canonical SHACL shapes, recording or view switching. No JavaScript binary decoder or CLI subprocess fallback.
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-5 status=met verifiedBy="Bun tests, VS Code API host double, Chromium, native Node consumer and Rust service tests" evidence="bun test scripts/ (140 pass); typecheck; test:atomic:graph including atomicDiffHostSmoke and browser diff-link checks; test:atomic:native; nodeatomic npm test (23 pass); libatomic local_service_test (11 pass, before/after presence and read-only baseline/view checks); native addon, consumer and extension builds rebuilt"}
Tracked SCM entries and eligible selected-change paths open vscode.diff with the correct recorded and working/historical sides. Adds/deletes use an empty side only for known absence; missing content is not replaced with empty text. Historical snapshots remain immutable/read-only and survive navigation. Path/view/owner/trust/stale guards reject unsafe opens; indirect callers are not mislabeled as edited, and binary/unsupported/oversized content is handled honestly. Host-routing, native read-only baseline/side-presence, unit, browser and type checks pass.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-5 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-5}
Expose recorded baseline bytes through nodeatomic's existing read-only preview path; disambiguate missing versus absent historical sides; add a bounded read-only snapshot provider and wire SCM/webview file links to vscode.diff; test actual host handlers, native baseline reads and stale/unsafe requests. Canonical intent creation/sync/signing remains blocked by the pre-existing repository database corruption.
::file-ref{path=src/atomic/diffEditor.ts}
::file-ref{path=src/atomic/fileDiff.ts}
::file-ref{path=src/atomic/sourceControl.ts}
::file-ref{path=src/atomic/graphPanel.ts}
::file-ref{path=scripts/atomicDiffHostSmoke.mjs}
:::

:::constraint
No inferred intent links, no fabricated validation results, no bulk shared-view hydration; retain path safety and stale-response fences.
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-3 status=met verifiedBy="Rust unit/service tests, nodeatomic native integration tests, TypeScript and Chromium" evidence="libatomic change_metadata_tests (3 pass) and local_service_test (8 pass); nodeatomic npm test (21 pass, CLI parity for additions/edits/deletes); Catalyst bun test scripts/ (133 pass), typecheck, test:atomic:graph and test:atomic:native; producer addon and extension rebuilt"}
GetChange metadata exposes native graph counts, content bytes and canonical per-path symbols/hunk descriptions; nodeatomic generates and exports those types from the rebuilt addon; Catalyst displays the native summary with uint64 precision. Rust service tests, Node native integration tests, extension type checks and browser tests pass.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-3 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-3}
Share the CLI graph counter in atomic-repository, add a typed libatomic summary, rebuild/install the producer addon in nodeatomic, then carry validated data into the report and test the whole pipeline. Intent CLI creation/sync/signing is blocked by the existing repository database corruption, so this continuation remains on the existing work intent. Feature service tests and 89 CLI change tests pass; broader Rust checks expose unrelated stale replication-example APIs and the busy-reader/writer compaction timeout test failure, which remain untouched.
::file-ref{path=src/atomic/changeMetadata.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-4 status=met verifiedBy="Rust unit/service tests, native Node consumer, TypeScript and Chromium" evidence="libatomic change_impact (3 pass), local_service_test (10 pass including database-byte equality, recorded-source and private-mode tests); nodeatomic npm test (22 pass); Catalyst bun test scripts/ (136 pass), typecheck, test:atomic:graph, test:atomic:native; blast-radius screenshot inspected; producer/consumer/extension artifacts rebuilt"}
The selected change has Noname's module-by-hop blast-radius matrix, pink direct-impact cells, total bars, a proximity legend, accessible file drill-down and a working change-graph escape hatch. Native read-only analysis uses recorded before/after sources and incoming current-KG CALLS/INCLUDES; no co-change inference, hash-jitter percentages, automatic enrichment or historical snapshot claims. Unknown/partial analysis is not labeled private or zero. Native, consumer, unit, browser and type checks pass.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-4 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-4}
Trace noname's BlastTriage/kgHops and adapt the matrix with scoped drill-down; expose opt-in typed blast-radius data through libatomic/nodeatomic; test real recorded changes, incoming-edge direction, stale controls, keyboard access and narrow/CSP rendering. Repository database corruption still blocks intent CLI creation/sync/attestation, so continue under this existing intent without claiming it is signed.
::file-ref{path=webview/src/blastRadius.ts}
::file-ref{path=src/atomic/changeImpact.ts}
::file-ref{path=scripts/atomicBlastRadius.test.mjs}
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-6 status=met verifiedBy="Full build, TypeScript, Bun tests, VSCE and extracted-archive verification" evidence="0.2.9 darwin-arm64 VSIX built (25.06 MB); 140 tests and typecheck pass; archive CRC, version/platform manifest, exact bundled-asset SHA-256 matches, source/vault exclusions and extracted native runtime loading verified; VSIX SHA-256 a4bfc702f7a6ab6ec47c7c3e078d4ef0e463f50e936a8ce1fb5165ac68ca5b08"}
An installable, platform-correct VSIX includes the current native report, blast-radius UI, file-diff routing and updated native consumer/addon, not just a source version bump.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-6 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-6}
Bump package/lockfile to 0.2.9, document the release, build and package releases/catalyst-intent-editor-0.2.9-darwin-arm64.vsix, then verify the archive's payload and extracted native runtime. Existing database corruption prevents canonical intent sync/attestation; no signing or publication is claimed.
::file-ref{path=package.json}
::file-ref{path=CHANGELOG.md}
:::

:::acceptance-criterion{#01M50DXGGGT32E3BPY1TTCDKX1-ac-7 status=met verifiedBy="Rust service regressions, generated native consumer, TypeScript, Bun tests, Chromium and extracted VSIX" evidence="6 plan-context and 11 existing native service tests pass; nodeatomic npm test (24 pass); Catalyst unit tests (144 pass), typecheck, host/browser and packaged-native smoke pass; full build and 0.2.10 darwin-arm64 VSIX verified by CRC, manifest, asset hashes and extracted native API against real PX4CWVRU (planId null, associated HELL::continuouslee::1, not_checked); VSIX SHA-256 c784e046775eedf6bcb5c06c4fef7de69f6707672b816fcfeaeed6c1e464a812"}
Atomic exposes typed, hash-bound plan/intent context through libatomic GetChange and generated nodeatomic bindings. Governing IDs come only from recorded covering graphs or exact matching session turns; edited intent documents and intent-creation session links are not promoted into governors. The webview visibly shows plan_id/source, separately labels associated intent documents, handles UID/human-key aliases and ambiguity, and removes the false requirement-failure banner. Missing/partial metadata is not SHACL failure, no history is backfilled, and native/consumer/UI/regression checks pass.
:::

:::task{#01M50DXGGGT32E3BPY1TTCDKX1-7 status=done criteria=01M50DXGGGT32E3BPY1TTCDKX1-ac-7}
Implement a read-only atomic-repository resolver and additive libatomic intent_context projection, regenerate nodeatomic, replace client-side plan-only assumptions with the typed result, verify the real PX4CWVRU case and source/trust/scope guards, and ship a new platform-correct VSIX. Canonical intent CLI operations remain blocked by the existing repository database corruption; do not claim a fresh attestation or inferred historical plan_id.
::file-ref{path=src/atomic/changeIntentContext.ts}
::file-ref{path=src/shared/changeIntentContext.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=scripts/atomicPlanContext.test.mjs}
:::
