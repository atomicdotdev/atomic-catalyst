# nodeatomic integration handoff: attestation badge and signed intent view

Applies to intent **CATA::continuouslee::2**
(`01M4RQ7JR2CEK4QFJGV2B8K270`), “Add RPC-backed attestation badge and read-only
signed intent view.” This is an investigation/handoff, not an implemented UI or
an amendment to the authoritative intent.

## Architecture update

The user has since required **no service process**, and the Atomic/Node proof of
concept now supports in-process service calls:

```text
Catalyst extension host (Node)
  -> nodeatomic TypeScript API
  -> prebuilt libatomic.node
  -> libatomic local dispatch and existing handlers
  -> repository database

Extension host -> small presentation DTO -> ticket webview
Extension host -> immutable signed revision -> script-free read-only viewer
```

The canonical protobufs remain the request/response contract, but there is no
gRPC connection, daemon startup, socket probing, or CLI subprocess in application
calls. The familiar `/atomic.Service/Method` strings identify local dispatch.
The webview must not load the native addon or obtain unrestricted service access.

The intent currently requires “connects only to an existing gRPC endpoint” and
“missing default socket” behavior. Those requirements need explicit revision
before this approach can satisfy its acceptance criterion. Do not claim the
existing criterion is met by changing the transport silently. Its scope-out also
forbids Atomic repository changes; required backend changes need separate Atomic
work rather than being hidden in this editor task.

## What exists now

In the inspected checkout:

- `nodeatomic` is a separate TypeScript/JavaScript project with no Rust sources.
- Atomic owns the Node-API exports behind libatomic's optional `node` feature.
- Consumers install an explicit prebuilt addon with `npm run install:addon`.
  `npm run build` does not invoke Cargo or discover an Atomic source checkout.
- Message codecs and TypeScript declarations are generated from the addon’s
  embedded descriptor, not a vendored `.proto` tree.
- The local dispatcher and generated consumer codecs support only
  **ResolveRepository and Status**. A descriptor containing another method is not
  proof that local dispatch supports it.
- Existing status/concurrency/worker-thread tests pass. This is not an attestation
  API test, VS Code extension-host test, or evidence that attestation semantics
  are complete.

This editor currently has gRPC packages installed, but the intent's proposed
`src/libatomic/client.ts` and `src/extension/intentAttestation.ts` files were not
present during inspection. The existing ticket's attestation panel says “Not
checked in this editor.” Preserve that honesty until the backend is sufficient.

## Existing message contracts to investigate

| Method | Intended role | Current integration status |
|---|---|---|
| DaemonService.ResolveRepository | Bind an explicit repository/workspace | Available through nodeatomic |
| VaultService.GetVaultEntry, include_bundle=true | Retrieve stored intent and raw attestation sources | Handler exists, not exposed by local dispatch/codecs |
| AttestationService.VerifyAttestation | Backend verification/freshness | Handler exists, but current behavior is unsuitable for this read-only contract |
| AttestationService.ListAttestations | Discover/select attestation records | Current intent-filter behavior is incomplete |
| DaemonService.GetCapabilities | Discover supported methods/contract | Exists in service layer, not exposed by current local dispatch |

`GetVaultEntryResponse.entry_bundle` has schema
`atomic.vault.entry.bundle.v1`. Its intent form carries the stored entry and raw
tracked/legacy attestation sources. It can be useful for retrieving stored signed
JSON-LD; it does not by itself prove signature validity, source freshness or view
isolation. The path-first variant does not include intent attestation sources.

A narrowly scoped, consistent read result may be preferable to stitching together
independent reads. Decide whether to strengthen existing messages/handlers or add
a dedicated read operation in Atomic; do not invent a second editor-owned signing
or canonicalization engine.

## Backend blockers found in source

These findings are from `atomic/libatomic/src/daemon/services_agent.rs`, not from
assuming the service names implement their documented semantics.

1. **Local exposure is absent.** `libatomic/src/local.rs` dispatches only two
   methods, and nodeatomic's generator selects only their message dependencies.
   Both allowlists need extension after the operations are validated.
2. **Verification is not a pure read path.** The intent verification arm calls
   `handle.repository()`, which opens the writable database, then `load_identity`,
   which also loads keypair material. Read-only verification should resolve public
   verification material without requiring a private signing key.
3. **View/snapshot semantics are incomplete.** GetVaultEntry currently doesn't
   use its requested `view` to select the perspective and returns `snapshot: None`.
   VerifyAttestation likewise doesn't use the requested view in the inspected
   implementation. Request fields alone do not establish view isolation.
4. **Listing isn't an intent-attestation listing yet.** ListAttestations handles
   graph attestation details/summaries and a graph-view listing. An intent target
   filter does not produce the signed-intent record list suggested by its shape.
5. **Attestation-ID verification isn't implemented.** The handler returns
   `valid: false` with a “lands with its slice” reason. Do not mistake unsupported
   verification for a proven-invalid signature.
6. **Freshness and signature validity are conflated.** VerifyAttestation checks
   the stored source hash and returns early when stale, so it doesn't establish
   whether the historical signed revision still has a valid signature. The UI
   must not collapse “stale source” and “invalid historical signature.”
7. **Working buffer freshness is a separate question.** Stored-vault freshness
   doesn't prove an unsaved—or changed-but-not-synced—editor document matches the
   signed revision. Don't reimplement Atomic's canonical lifting/hash rules in
   TypeScript merely to bridge this gap. Until backend-supported comparison is
   available, show that current-buffer freshness is unknown/stale rather than
   claiming the editor's current text is verified.
8. **Read-open recovery can write.** Existing repository read-only opens may do
   upgrade/repair recovery. A strict “no database mutation” acceptance test needs
   an explicit open/recovery policy, not just calling a method named read-only.

Malformed requests must be validated before invoking handler code that unwraps
optional repository fields. JSON bundle schemas, byte-array lengths, identifiers,
proof shapes and response provenance must also be checked before display.

## Proposed editor-side boundary

Implement a narrow `IntentAttestationClient` in the extension host that consumes
nodeatomic and returns presentation data. Keep the ticket renderer independent
of whether service calls are embedded or remote.

An attestation read result should establish:

- repository and explicit effective view;
- which stored intent/attestation revision was retrieved;
- the stored signed JSON-LD, signer/proof information and stable revision identity;
- cryptographic verification of that exact revision;
- freshness relative to the stored/current source, separately from verification;
- signer trust as a separate state, not implied by signature validity;
- supported/unsupported/unavailable state and actionable failure reason.

The exact DTO should follow the finalized backend result, not be treated as a new
wire schema in this document. Existing `nodeatomic.call` can carry protobuf bytes,
but the new methods must first be exposed by the producer and generated consumer.

No CLI call, direct redb access, file-based attestation fallback, or cryptographic
implementation belongs in this adapter. Reading the active editor document for
UI state is distinct from inventing a backend fallback.

## UI safety requirements remain unchanged

- Capture document URI/version, repository/view and request generation. Discard
  responses if any have changed before applying them to the badge.
- Keep attestation existence, historical signature validity, current-source
  freshness and signer trust separate. Do not infer verification from a content
  hash, author field, proof presence or a boolean from an unsupported branch.
- Missing native binary, incompatible/unsupported method, DB contention, unknown
  identity, malformed payload and missing attestation are distinct conditions.
  None may trigger daemon startup or an alternate filesystem/CLI path.
- Pass the webview only the data needed to render a badge. Its click sends an
  allowlisted command; it does not choose arbitrary service methods or paths.
- The signed viewer displays the stored signed revision, never freshly lifted
  JSON-LD from the mutable editor text. Don't label reconstructed Markdown as
  the original signed source unless the backend actually supplies it.
- Use a dedicated view with scripts disabled and restrictive CSP. Escape displayed
  text/JSON, exclude edit/save/source-mutation commands, and do not inherit the
  ticket's normal editability setting.
- A dirty or later-edited source must not alter the already-open signed snapshot.

## Consumer packaging: no producer build coupling

For a local proof, build/install the addon in nodeatomic explicitly, then create
an npm package artifact (`npm pack`) and consume that artifact in this project.
Do not add Cargo invocation, an Atomic source lookup, or a native source build to
Catalyst's build scripts. Package names/artifact publication aren't finalized.

The extension build currently bundles `src/extension.ts` into CommonJS with Bun.
nodeatomic is ESM and loads `../native/libatomic.node` relative to its own module.
Blindly flattening it into the extension bundle can break those paths.

Choose one deliberate packaging strategy, for example externalize the package and
copy its complete runtime directory into a known extension vendor directory,
then load it from the extension host. Preserve generated codecs and native-file
layout. Test the strategy rather than assuming bundling is transparent.

Current VSIX packaging uses `--no-dependencies`, and `.vscodeignore` excludes
`node_modules/**`; merely adding nodeatomic to dependencies won't ship it. Explicit
runtime/native inclusion and an actual packaged-extension-host test are required.

The native artifact must match the **extension host**, including remote SSH/WSL
hosts, not necessarily the local UI machine. Browser-only VS Code/webview previews
cannot load this addon; show a truthful unavailable state there. Test actual Node-
API loading in the target VS Code/Electron host. No remote service fallback is
introduced by this plan.

## Work order

1. Agree on the intent's revised local-transport criterion and preserve its
   immutability/view/freshness/trust requirements.
2. Create separate Atomic work for read-only, public-key-only, view-aware
   attestation reads/verification and coherent signed-revision identification.
3. Test those handlers with signed fixtures, stale source, unknown signer,
   malformed proof, sibling/ancestor views and database non-mutation.
4. Expose only the proven read methods through libatomic local dispatch and
   nodeatomic's descriptor-derived codecs/helpers. No mutations need to be added.
5. Consume a built nodeatomic artifact in the extension host, with honest
   unsupported/unavailable behavior and no service or source-build dependency.
6. Implement badge and frozen script-free viewer using mock client tests first.
7. Test packaged native loading, remote-host targeting, stale document responses,
   snapshot/view isolation, no source edits and no database writes; then package
   a VSIX. Do not claim browser tests prove native extension-host behavior.

## Implemented Node vault milestone

Following this handoff, the separate Atomic/nodeatomic projects now expose
read-only GetVaultEntry, ListVaultEntries, GetVaultContext and VerifyAttestation
through local dispatch. Catalyst can consume:

```ts
import { openRepository } from 'nodeatomic';
const repo = await openRepository(repositoryPath);
const intents = await repo.vault.listIntents();
const source = await repo.vault.getIntent(intentId);
const signed = await repo.vault.getSignedIntent(intentId);
```

Verification now uses a read-only repository handle and public identity data only;
it does not load a private key or initialize an identity store. The result carries
`signatureValid`, `sourceFresh`, exact stored `signedDocument`, `signerDid`, and a
`signedRevision` hash. Missing public keys are unverified, not invalid signatures.
A valid historical signature can be returned even when the stored source is stale.

This resolves the local-exposure/public-key/stale-versus-invalid blockers for these
operations, not the whole acceptance criterion. View-scoped vault reads are still
unsupported and explicitly rejected. Responses still have no ViewSnapshot;
signer trust and unsaved-buffer freshness remain separate concerns. Intent-filtered
ListAttestations, capability negotiation, strict no-recovery reads, editor UI and
VSIX integration are not implemented by this milestone. No mutation methods were
exposed. The consumer build still requires only an explicitly installed native
artifact, never Cargo or a service process.

## Status of the original investigation

No intent acceptance criterion was marked met, no signed intent was modified,
and no client/UI/native integration was implemented by this investigation. This
file exists so the in-progress editor task can consume the architecture update
without losing its original safety constraints or hiding backend blockers.
