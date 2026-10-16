---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::2
priority: medium
project: CATA
seq: 2
status: in_progress
title: Add RPC-backed attestation badge and read-only signed intent view
uid: 01M4RQ7JR2CEK4QFJGV2B8K270
view: dev
entry_type: intent
content_hash: TXK4WZKN7GJOG2HWJK7SPDJU5YVG6V6DDGAEHVS4JKONX24VTWRQ
created_at: 2026-10-12T18:54:02.703046+00:00
updated_at: 2026-10-12T18:54:02.703046+00:00
---
:::why
The user wants a recognizable linked attestation symbol on intent tickets and a special read-only view of the signed revision. The user identified libatomic's RPC contract as the integration boundary and requested a TypeScript wrapper rather than CLI subprocesses or starting services.
:::

:::acceptance-criterion{#01M4RQ7JR2CEK4QFJGV2B8K270-ac-1 status=unmet}
A typed libatomic TypeScript client connects only to an existing gRPC endpoint, negotiates contract version/capabilities, and reads attestation snapshots and backend verification state. The ticket shows a linked attestation shield with truthful unavailable/unverified/stale/verified states; clicking opens a script-free read-only signed-intent view with signer/proof details and JSON-LD. Tests, typechecks, browser checks and a new VSIX pass, including no document mutation, stale-buffer and malformed-payload protection, and snapshot/view isolation. Missing default socket is reported honestly rather than auto-started.
:::

:::task{#01M4RQ7JR2CEK4QFJGV2B8K270-1 status=open criteria=01M4RQ7JR2CEK4QFJGV2B8K270-ac-1}
Inspect the canonical libatomic contract, generate a packaged descriptor without duplicating proto sources, implement and test the read-only RPC wrapper, wire the linked badge and immutable snapshot view, and package the extension.
::file-ref{path=src/libatomic/client.ts}
::file-ref{path=src/extension/intentAttestation.ts}
::file-ref{path=webview/src/helpers/atomicTicket.ts}
::file-ref{path=package.json}
:::

:::scope-in
Read-only gRPC integration, generated contract descriptor, typed wrapper, attestation UI state and snapshot viewer, tests, documentation and local VSIX packaging.
:::

:::scope-out
No automatic daemon startup, daemon shutdown, repository registration or mutation, direct redb access or filesystem fallback, reimplemented signing/cryptographic verification/SHACL/canonical lifting, changes to the Atomic repository, remote authentication infrastructure, or Marketplace publication.
:::

:::constraint
The proto contract in ~/Projects/atomic/libatomic is authoritative. Generate compiled descriptors from it rather than maintaining a second proto schema. Connect to an existing endpoint only. Signed-snapshot presentation must remain read-only regardless of normal editor settings and show the stored signed revision, never masquerade the editable working document as attested. Distinguish attestation existence, current-source freshness, backend verification and signer trust. Respect unrelated work and fail closed on incompatible/unsupported RPCs or malformed bundles.
:::
