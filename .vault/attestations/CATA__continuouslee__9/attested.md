---
intentId: CATA::continuouslee::9
sourceContentHash: blake3:09b8138f00f902c10fbd54f28ab1e76be33779659b2c4172bd8bafbb92e2b880
entry_type: attestation
content_hash: 5J4ZJFAV7T7JIGJN3NBXWFAX3XD5VPJFSITV5VKOSZCRE3DM3H3Q
created_at: 2026-10-15T18:48:34.333724+00:00
updated_at: 2026-10-15T18:48:34.333724+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M50DXGGGT32E3BPY1TTCDKX1",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:5d4e281f4331ff4e27674164ba456c7f83745d2e23a542aaa4b4b0c3d16ec93a",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M50DXGGGT32E3BPY1TTCDKX1-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "bun run typecheck; bun test scripts/ (130 pass); bun run test:atomic:graph; bun run build:extension:main",
      "text": "Views expand to paginated hash rows; selecting a hash opens focused change evidence with linked intent, recorded usage, affected paths and activities. Missing/multiple links are called out without fabricating a SHACL report. Type checks and targeted regression tests pass.",
      "verifiedBy": "TypeScript, Bun regression tests and Chromium browser smoke"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m50dxgggt32e3bpy1ttcdkx1-constraint-1",
      "@type": "Constraint",
      "text": "No inferred intent links, no fabricated validation results, no bulk shared-view hydration; retain path safety and stale-response fences."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m50dxgggt32e3bpy1ttcdkx1-scope-in-1",
      "@type": "ScopeItem",
      "text": "Atomic tree navigation and change-detail webview presentation."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m50dxgggt32e3bpy1ttcdkx1-scope-out-1",
      "@type": "ScopeItem",
      "text": "Native wire contracts, canonical SHACL shapes, recording or view switching."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M50DXGGGT32E3BPY1TTCDKX1-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M50DXGGGT32E3BPY1TTCDKX1-ac-1"
      ],
      "taskStatus": "done",
      "text": "Implement per-view history navigation, fenced detail selection and a focused single-change renderer; cover navigation and link states with regression tests.",
      "touchesFile": [
        "src/atomic/sourceControl.ts",
        "src/atomic/evidenceExplorer.ts",
        "webview/src/atomicGraphView.ts"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::9",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "zPnH153L6u8BRY1A4cecPuDxLiejd7dDroLQacajit8MqozJgAyBVJoqU132cNaFrP1Zp5gTCnhehF5vWDNHVRfB",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Simplify view navigation to hash-selected change details",
  "view": "dev",
  "why": "Users need a simple view-to-change navigation with the linked intent prominent, rather than an aggregate draft dashboard."
}
