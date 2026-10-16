---
intentId: CATA::continuouslee::4
sourceContentHash: blake3:659783d45318344e8830a261e2655c1c229a51f33d48f9d5e4af9ebf5ef7f0c1
entry_type: attestation
content_hash: 34SBCI7NYZQUU3EPDJ7ZMSV6R7WZQ6XAOUBSMRMDJIOQ2B6KOSSA
created_at: 2026-10-14T18:31:10.985862+00:00
updated_at: 2026-10-14T18:31:10.985862+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M4XTVF2EFVRAEGNZ269HG2MH",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:779c9d5b0b07af9d375e298a63dd3b68c9a80fa6d507635b4a7db68af8fcb80c",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M4XTVF2EFVRAEGNZ269HG2MH-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "bun run package:vsix succeeded; archive manifest/package version 0.2.4 and packaged graph JS/CSS exactly match current build; lockfile versions match; 103 tests pass; typecheck and graph browser smoke pass",
      "text": "Package metadata and lockfile identify version 0.2.4, the changelog describes the tree update, and a newly built local VSIX contains version 0.2.4 and the latest semantic-tree assets.",
      "verifiedBy": "VSIX archive assertions, Bun tests, TypeScript and Puppeteer"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m4xtvf2efvraegnz269hg2mh-constraint-1",
      "@type": "Constraint",
      "text": "Preserve prior release artifacts and unrelated work; verify packaged metadata rather than implying a source version bump updates an installed extension."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m4xtvf2efvraegnz269hg2mh-scope-in-1",
      "@type": "ScopeItem",
      "text": "Version metadata, release notes, generated build assets and local VSIX packaging."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m4xtvf2efvraegnz269hg2mh-scope-out-1",
      "@type": "ScopeItem",
      "text": "Marketplace publication, tags, dependency upgrades, automatic installation and unrelated source changes."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M4XTVF2EFVRAEGNZ269HG2MH-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4XTVF2EFVRAEGNZ269HG2MH-ac-1"
      ],
      "taskStatus": "done",
      "text": "Update release metadata, build and package the extension, and inspect the archive's manifest and graph bundle.",
      "touchesFile": [
        "package.json",
        "package-lock.json",
        "CHANGELOG.md"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::4",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3W1Kjps2bXSXStNYJpYyGuavurtKERGvHwsSPZsPNunux9RjJaHDYQuKMgeB19JscLEkwQGhWmri19YWaA2ssFtu",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Package Catalyst Intent Editor 0.2.4",
  "view": "dev",
  "why": "The user wants version 0.2.4 to distinguish the latest semantic-tree webview from earlier installed builds."
}
