---
intentId: CATA::continuouslee::7
sourceContentHash: blake3:618c5df4b19e8b52e37a0ea58414db80e0b0c4e08b83a901cf77b0ac2b5651f6
entry_type: attestation
content_hash: 4EZ3VD2RVIXSI5PKF2XEZKMHY4GYSKVW3DUL4BILYKMQUUKWLQFA
created_at: 2026-10-15T16:18:34.920013+00:00
updated_at: 2026-10-15T16:18:34.920013+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M503J8PH4AKS909RGXZ5RC3C",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:43e235c9b5abdf8f63725bac2bdf5ddffad1fbb23c4214582308caaae2562b35",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M503J8PH4AKS909RGXZ5RC3C-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "118 Catalyst tests and 18 nodeatomic tests pass; typecheck passes; real native smoke verifies Draft scope, four own changes, inherited exclusion and affected paths; host smoke verifies left-tree click/ready routing without switching; browser verifies Shared/unknown gating, central blast-radius/log layout, filters, 50-row paging and stale-action guards; 0.2.7 VSIX assets/version/native addon match current build",
      "text": "Authoritative backend scope labels appear in the views tree; clicking opens the exact view without switching the working copy. Shared/unknown scopes do not fetch or render draft evidence. Draft pages show linked intent title/why/tool plus honest usage availability, recorded affected paths, and paged type-pill/action provenance rows with inline details, no canvas or inspector sidebar. Own-history requests exclude inherited history; stale results cannot repopulate another view. Tests, typecheck, strict-CSP browser checks and a verified 0.2.7 VSIX pass.",
      "verifiedBy": "Bun unit suite, TypeScript, host-module smoke, strict-CSP browser checks and real packaged native smoke"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m503j8ph4aks909rgxz5rc3c-constraint-1",
      "@type": "Constraint",
      "text": "Use backend scope, never view-name guesses; explicit view selection is read-only. Shared views stop before draft history/detail queries. Show backend-recorded files, not paths guessed from tool summaries; downstream impact, tokens and cost remain unavailable unless explicitly supplied. Preserve immutable signed-snapshot support, safe text rendering and generation fences."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m503j8ph4aks909rgxz5rc3c-scope-in-1",
      "@type": "ScopeItem",
      "text": "View navigation and labels, draft-only observability projections and central UI, tests, documentation/release metadata and local VSIX. The user explicitly approved rebuilding existing libatomic source and installing/regenerating nodeatomic to validate the real native path; no producer source edits are planned."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m503j8ph4aks909rgxz5rc3c-scope-out-1",
      "@type": "ScopeItem",
      "text": "Shared-view implementation, producer source edits, general knowledge graph traversal, cost estimation, cryptographic verification, automatic installation and publication."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M503J8PH4AKS909RGXZ5RC3C-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M503J8PH4AKS909RGXZ5RC3C-ac-1"
      ],
      "taskStatus": "done",
      "text": "Preserve typed scopes, route tree clicks through the panel, build bounded read-only draft projections from per-change files/provenance and explicitly linked vault intents, replace the graph-first webview, and verify shared/draft routing and safety.",
      "touchesFile": [
        "src/atomic/sourceControl.ts",
        "src/atomic/graphPanel.ts",
        "src/atomic/evidenceExplorer.ts",
        "src/atomic/evidence.ts",
        "src/shared/atomicEvidence.ts",
        "webview/src/atomicGraphView.ts",
        "webview/src/atomicGraph.css"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::7",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z31JZXNFipxUy5q1CTUPS62ZNuQyKU3ZnzfeuhCXT61GfvYkvag7PnXgR61bF3wrKNVWMfFK2mAYnKmA3m9yz4dTE",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Route typed view clicks to draft observability or shared placeholder",
  "view": "dev",
  "why": "The user wants explicit Draft/Shared labels in the left views tree and click-to-open routing: shared views show Not implemented yet; drafts show an intent summary, blast radius and provenance log in the central webview without a right-hand Evidence Inspector."
}
