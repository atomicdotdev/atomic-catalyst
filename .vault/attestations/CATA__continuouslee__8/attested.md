---
intentId: CATA::continuouslee::8
sourceContentHash: blake3:1d076b7fac05490c739601973d3ef19c66e6ae22dd41e3bc698b783435d56db8
entry_type: attestation
content_hash: RAFNGM4JLDNHOHB3IFCALAJF746E65MCAWJVRFAIKPEKHPNSOSYA
created_at: 2026-10-15T17:22:28.832480+00:00
updated_at: 2026-10-15T17:22:28.832480+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M5083XACC7PNDC83WR60990V",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:c47b02306b9aae75c04d6bd900716437fd6a78067a64dc39514d43b77b2c8f64",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M5083XACC7PNDC83WR60990V-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "2 metadata unit tests and 7 local-service integration tests pass, including canonical decode, stored positive cost and privacy; contract checker passes 101 RPCs; 19 nodeatomic and 126 Catalyst tests pass; native/host/browser checks pass; 0.2.8 VSIX version/assets/consumer/addon verified. Broader libatomic unit suite has 26 pass and one untouched compaction timeout test failure, reported separately.",
      "text": "GetChange with metadata enabled exposes a safe typed projection from the Rust-loaded change, preserving the existing V3 bundle. Regenerated nodeatomic exposes it and Catalyst requests it, validates it, displays recorded tool/model and all token categories/cost, and aggregates without double-counting shared request identities. Unknown/malformed/ambiguous/conflicting/legacy metadata is distinguished from recorded zero and never estimated. Producer tests, consumer tests, real native metadata checks, typechecks, webview tests/browser checks and a verified 0.2.8 VSIX pass.",
      "verifiedBy": "Rust metadata/service tests, descriptor checks, native consumer tests, Bun, TypeScript and Puppeteer"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m5083xacc7pndc83wr60990v-constraint-1",
      "@type": "Constraint",
      "text": "Use the canonical Rust-loaded change as source; expose only the approved recorded metadata fields, not prompts/reasoning or arbitrary provider metadata. Preserve uint64 precision and exact micro-USD arithmetic. Do not merge unidentified records across multiple changes or choose between conflicting records silently. Retain draft-only gates and stale-response fences."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m5083xacc7pndc83wr60990v-scope-in-1",
      "@type": "ScopeItem",
      "text": "Existing GetChange contract/handler/tests in libatomic, nodeatomic generated codecs and documentation/tests, Catalyst metadata projection/UI/tests, native rebuild and 0.2.8 packaging."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m5083xacc7pndc83wr60990v-scope-out-1",
      "@type": "ScopeItem",
      "text": "New service endpoints, frontend V3/Postcard parsers, signing/verification semantics, guessed costs, raw prompts/reasoning export, shared-view implementation and unrelated producer work."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M5083XACC7PNDC83WR60990V-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M5083XACC7PNDC83WR60990V-ac-1"
      ],
      "taskStatus": "done",
      "text": "Add backward-compatible GetChange metadata fields and a privacy-limited projection in ~/Projects/atomic/libatomic; regenerate the nodeatomic consumer and test the actual API; pass exact integer usage into the central draft overview with safe deduplication, coverage and inline per-change details.\nKnown unrelated broader-suite failure: libatomic services_maintenance::compact::tests::busy_reader_and_writer_time_out_then_retry_succeeds fails in both normal and serial full-unit runs. Its source was not changed; metadata-focused tests and service/native integration checks pass.",
      "touchesFile": [
        "src/atomic/evidence.ts",
        "src/atomic/evidenceExplorer.ts",
        "src/shared/atomicEvidence.ts",
        "webview/src/draftProjection.ts",
        "webview/src/atomicGraphView.ts",
        "scripts/atomicDraftView.test.mjs"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::8",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z4WzeBs5gRWHrEzhbmVbtPRy92UZGXtFUBbkKh2nMyQTFDj6tnoVjubPPU4MWuwjuUpH64XRdowtbtcsbnZJjZVs6",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Expose recorded change metadata and integrate draft usage totals",
  "view": "dev",
  "why": "The user wants the change's existing recorded model/tool/token/cost metadata integrated into the draft webview rather than displayed as unavailable. The data already lives in the canonical change; the integration must request and project it correctly."
}
