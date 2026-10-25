---
intentId: CATA::continuouslee::10
sourceContentHash: blake3:b7f31132f9b1bd6605d498805217528808caa7e432f643f294e12635bd388757
entry_type: attestation
content_hash: ZDOAJPWI5R7ZFLBLR3DRUCD3HQECHLYILD4POM27YQDWJ4ABLRYQ
created_at: 2026-10-25T12:01:09.319576+00:00
updated_at: 2026-10-25T12:01:09.319576+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M5SEMGH89WD3V9TXJ5JANTW9",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:c2552cb4650d5293fb3bb87e732f239f291ee2bc313776b5c9e5781834a22570",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M5SEMGH89WD3V9TXJ5JANTW9-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "bun test scripts/universalVsix.test.mjs: 7 pass, 0 fail, including real README processing without repository metadata. Removed the relative README image that broke VSCE; backpack remains the extension icon. node scripts/package-universal.mjs produced and verified releases/atomic-sherpa-0.2.12.vsix, including extracted consumer and installed native dispatch. Earlier full suite: 164 pass, 4 failures in untouched atomicBlastRadius tests. No publication.",
      "text": "Manifest and lockfile identify atomic-sherpa / Atomic Sherpa; current editor labels and documentation reflect the rename; the manifest icon is an exact copy of the supplied backpack PNG. Packaging regression tests pass and existing command/settings/editor IDs remain stable.",
      "verifiedBy": "Bun packaging regression tests, byte comparison and VSCE"
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
      "text": "Historical signed vault records, upstream attribution, desktop Catalyst fixture, runtime behavior and publishing. Packaging existing build artifacts is allowed to verify the reported README packaging failure."
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
    "proofValue": "zpJJAJRG3BF213MPwrz8Xj2H3g9YwyfP2g3fS4bmC3U9krVbrh5Gaqkd7Czd7ZQkNAyzM3YSigGdzygT8yX3woD2",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Rename extension to Atomic Sherpa and adopt backpack icon",
  "view": "withered-silence-019a",
  "why": "The user wants the plugin branded Atomic Sherpa (atomic-sherpa) using their Downloads/backpack.png image."
}
