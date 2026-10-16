---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::8
priority: medium
project: CATA
seq: 8
status: needs-review
title: Expose recorded change metadata and integrate draft usage totals
uid: 01M5083XACC7PNDC83WR60990V
view: dev
entry_type: intent
content_hash: NYOOK5UZUWDRC57CK22YW3IT2OT73OKDLD3MXRID5LQ5JS7M5G4Q
created_at: 2026-10-15T17:24:42.382474+00:00
updated_at: 2026-10-15T17:24:42.382474+00:00
---
:::why
The user wants the change's existing recorded model/tool/token/cost metadata integrated into the draft webview rather than displayed as unavailable. The data already lives in the canonical change; the integration must request and project it correctly.
:::

:::acceptance-criterion{#01M5083XACC7PNDC83WR60990V-ac-1 status=met verifiedBy="Rust metadata/service tests, descriptor checks, native consumer tests, Bun, TypeScript and Puppeteer" evidence="2 metadata unit tests and 7 local-service integration tests pass, including canonical decode, stored positive cost and privacy; contract checker passes 101 RPCs; 19 nodeatomic and 126 Catalyst tests pass; native/host/browser checks pass; 0.2.8 VSIX version/assets/consumer/addon verified. Broader libatomic unit suite has 26 pass and one untouched compaction timeout test failure, reported separately."}
GetChange with metadata enabled exposes a safe typed projection from the Rust-loaded change, preserving the existing V3 bundle. Regenerated nodeatomic exposes it and Catalyst requests it, validates it, displays recorded tool/model and all token categories/cost, and aggregates without double-counting shared request identities. Unknown/malformed/ambiguous/conflicting/legacy metadata is distinguished from recorded zero and never estimated. Producer tests, consumer tests, real native metadata checks, typechecks, webview tests/browser checks and a verified 0.2.8 VSIX pass.
:::

:::task{#01M5083XACC7PNDC83WR60990V-1 status=done criteria=01M5083XACC7PNDC83WR60990V-ac-1}
Add backward-compatible GetChange metadata fields and a privacy-limited projection in ~/Projects/atomic/libatomic; regenerate the nodeatomic consumer and test the actual API; pass exact integer usage into the central draft overview with safe deduplication, coverage and inline per-change details.
Known unrelated broader-suite failure: libatomic services_maintenance::compact::tests::busy_reader_and_writer_time_out_then_retry_succeeds fails in both normal and serial full-unit runs. Its source was not changed; metadata-focused tests and service/native integration checks pass.
::file-ref{path=src/atomic/evidence.ts}
::file-ref{path=src/atomic/evidenceExplorer.ts}
::file-ref{path=src/shared/atomicEvidence.ts}
::file-ref{path=webview/src/draftProjection.ts}
::file-ref{path=webview/src/atomicGraphView.ts}
::file-ref{path=scripts/atomicDraftView.test.mjs}
:::

:::scope-in
Existing GetChange contract/handler/tests in libatomic, nodeatomic generated codecs and documentation/tests, Catalyst metadata projection/UI/tests, native rebuild and 0.2.8 packaging.
:::

:::scope-out
New service endpoints, frontend V3/Postcard parsers, signing/verification semantics, guessed costs, raw prompts/reasoning export, shared-view implementation and unrelated producer work.
:::

:::constraint
Use the canonical Rust-loaded change as source; expose only the approved recorded metadata fields, not prompts/reasoning or arbitrary provider metadata. Preserve uint64 precision and exact micro-USD arithmetic. Do not merge unidentified records across multiple changes or choose between conflicting records silently. Retain draft-only gates and stale-response fences.
:::
