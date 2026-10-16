---
intentId: CATA::continuouslee::3
sourceContentHash: blake3:d19218e3a16dd92c7b854bc344c5e737f408a12fb658a122d4c73709de2fbe19
entry_type: attestation
content_hash: 5GWMR4IMRRMVKV6YWM7XFLA5OUJCMELTRIQG3VK566DVQCWNBO7A
created_at: 2026-10-14T18:23:45.785373+00:00
updated_at: 2026-10-14T18:23:45.785373+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M4XT81Y018SDSVQ0R97HMW7Z",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:68a044ee835ed3511e9a3eb6996f65bf3974a065ad4a416e8b4048e69a5dddaa",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M4XT81Y018SDSVQ0R97HMW7Z-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "bun test scripts/: 103 passing; bun run typecheck: passed; bun run test:atomic:graph: passed with child and cycle navigation, keyboard activation and 600px width",
      "text": "Selected provenance renders expandable nodes grouped by exact recorded relationship, with full labels, relationship navigation and shared-child links. Every node and edge remains accessible, including cycles and disconnected nodes. Unit tests, browser smoke and typechecks pass without changing backend evidence semantics.",
      "verifiedBy": "Bun tests, TypeScript and Puppeteer browser smoke"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m4xt81y018sdsvq0r97hmw7z-constraint-1",
      "@type": "Constraint",
      "text": "Preserve recorded edge direction and labels; shared references are not invented ownership. Render evidence as text, retain attribution disclaimers, and respect unrelated existing work."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m4xt81y018sdsvq0r97hmw7z-scope-in-1",
      "@type": "ScopeItem",
      "text": "Provenance presentation, relationship navigation, and focused tests."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m4xt81y018sdsvq0r97hmw7z-scope-out-1",
      "@type": "ScopeItem",
      "text": "Change-dependency graph layout, RPC/native integration, signing, editor behavior and packaging."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M4XT81Y018SDSVQ0R97HMW7Z-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4XT81Y018SDSVQ0R97HMW7Z-ac-1"
      ],
      "taskStatus": "done",
      "text": "Implement a bounded semantic tree renderer, wire it into the provenance overlay, style it for VS Code themes, and verify navigation and graph fidelity.",
      "touchesFile": [
        "webview/src/atomicGraphView.ts",
        "webview/src/atomicEvidenceTree.ts",
        "webview/src/atomicGraph.css",
        "scripts/atomicEvidence.test.mjs",
        "scripts/atomicGraphSmoke.mjs"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::3",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z4t9gPo5d2274h14Bw94qWE4TvLSyiA6AwSJ4stSP76YMaeN5AWbup6R7NGmBAYmT1XJZFvtewpPfEyVNq6tU2QXA",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Present provenance as a navigable semantic relationship tree",
  "view": "dev",
  "why": "The provenance webview has crossing edges and truncated labels that obscure relationships. The user wants a semantic tree with navigable links to children."
}
