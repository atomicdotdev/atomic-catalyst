---
intentId: CATA::continuouslee::10
sourceContentHash: blake3:1aacab8523bf7f828094b69438ab2e815f600b4bec38465ece7ca34912e3af16
entry_type: attestation
content_hash: RUYCGF5MAQOTJEBCRNM72LNB4IGCLORLNVNB47SRUOQG5WF3LVKQ
created_at: 2026-10-25T11:57:39.461863+00:00
updated_at: 2026-10-25T11:57:39.461863+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M5SEMGH89WD3V9TXJ5JANTW9",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:80d914f3a07ca7d7ab3f7cce6a9a7d9723792f7ac6dfa973a6f93548a92e7083",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M5SEMGH89WD3V9TXJ5JANTW9-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "bun test scripts/universalVsix.test.mjs: 6 pass, 0 fail; cmp confirms backpack.png matches Downloads source exactly. Full suite: 164 pass, 4 failures in untouched atomicBlastRadius tests. No release archive built or published.",
      "text": "Manifest and lockfile identify atomic-sherpa / Atomic Sherpa; current editor labels and documentation reflect the rename; the manifest icon is an exact copy of the supplied backpack PNG. Packaging regression tests pass and existing command/settings/editor IDs remain stable.",
      "verifiedBy": "Bun packaging regression tests and byte comparison"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m5semgh89wd3v9txj5jantw9-constraint-1",
      "@type": "Constraint",
      "text": "Preserve catalystIntent and catalystAtomic IDs and unrelated user changes. Do not rename references to the separate Catalyst desktop application."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m5semgh89wd3v9txj5jantw9-scope-in-1",
      "@type": "ScopeItem",
      "text": "Current extension identity, visible editor labels, browser preview title, documentation and packaging test fixtures."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m5semgh89wd3v9txj5jantw9-scope-out-1",
      "@type": "ScopeItem",
      "text": "Historical signed vault records, upstream attribution, desktop Catalyst fixture, runtime behavior, publishing and release builds."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M5SEMGH89WD3V9TXJ5JANTW9-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M5SEMGH89WD3V9TXJ5JANTW9-ac-1"
      ],
      "taskStatus": "done",
      "text": "Update branding, copy the backpack asset, and verify package metadata, image bytes and packaging tests.",
      "touchesFile": [
        "package.json",
        "package-lock.json",
        "README.md",
        "scripts/universalVsix.test.mjs"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::10",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z2P2QTB99iSudt6fvCL5PVqjh2Ed9EGzY4SDV7d49Qf4myoSrXMRiPkRa2AZcii2jVMqSvW8XKDekJ1q8jsnx4BTw",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Rename extension to Atomic Sherpa and adopt backpack icon",
  "view": "withered-silence-019a",
  "why": "The user wants the plugin branded Atomic Sherpa (atomic-sherpa) using their Downloads/backpack.png image."
}
