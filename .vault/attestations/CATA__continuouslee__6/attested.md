---
intentId: CATA::continuouslee::6
sourceContentHash: blake3:267af212b129254ddad407a3f3c3fdaf0e49954454d13c0217aaf21217e1f78a
entry_type: attestation
content_hash: XDARXHMC56EUYVHLWRG6N6FCKRR27KM2KGJXPO242IZRCII5W3AA
created_at: 2026-10-14T21:14:45.652463+00:00
updated_at: 2026-10-14T21:14:45.652463+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:fc2d1f8a90a998f5dd21d295f6b5db6456072c01579409f8a3f98290902ab774",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "107 tests pass; typecheck passes; built browser checks verify CLI palette/radii and 1–500-node geometry, canvas/keyboard selection, tooltips, drag/pan/zoom, local provenance node details, stale-action guards and separate signature/source/trust/editor cards; package:vsix produced 0.2.6 and packaged JS/CSS and upstream license match current files",
      "text": "The graph adapts Atomic CLI emit_html's D3 canvas, palette, node radii, force parameters, subtle edges, tooltips and legend using locally bundled modules. Clicking graph or recorded provenance nodes opens a structured inspector with truthful evidence facts and relationships. Unit, typecheck and strict-CSP browser checks pass; a new 0.2.6 VSIX contains the current graph and inspector.",
      "verifiedBy": "Bun unit suite, TypeScript, strict-CSP Puppeteer checks and VSIX archive assertions"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m4y086q42wpfgraj2nddqb9r-constraint-1",
      "@type": "Constraint",
      "text": "Use the CLI source as the visual reference, not a substitute for backend graph semantics. Keep recorded edge direction, unloaded references, stale-response guards and script-free signed snapshots. Do not add CDN access or weaken CSP; render evidence as text and preserve signature/freshness/trust separation."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m4y086q42wpfgraj2nddqb9r-scope-in-1",
      "@type": "ScopeItem",
      "text": "Graph presentation/dependencies, evidence inspector styling and selection, tests, release metadata and local 0.2.6 VSIX."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m4y086q42wpfgraj2nddqb9r-scope-out-1",
      "@type": "ScopeItem",
      "text": "Atomic repository source, graph backend scope, RPC semantics, cryptographic verification, automatic extension installation and Marketplace publication."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M4Y086Q42WPFGRAJ2NDDQB9R-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1"
      ],
      "taskStatus": "done",
      "text": "Adapt the CLI viewer to the webview without touching ~/Projects/atomic; replace the Cytoscape renderer, redesign the inspector and local provenance-node selection, test geometry/interactions/safety and package the update.",
      "touchesFile": [
        "webview/src/atomicDependencyGraph.ts",
        "webview/src/atomicGraphView.ts",
        "webview/src/atomicEvidenceTree.ts",
        "webview/src/atomicEvidenceInspector.ts",
        "webview/src/atomicGraph.css",
        "scripts/atomicGraphSmoke.mjs",
        "scripts/atomicEvidence.test.mjs",
        "package.json"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::6",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z66FEBpsGQEUEMpuJ5TQC7KEA7izZjJWinEcg9wcqEZYo6u6aNPua8xetwRjy9Vzs1jPaRYg8ge9SpJaeZhRaLQHW",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Match Atomic query graph visuals and redesign node evidence inspector",
  "view": "dev",
  "why": "The user wants Catalyst to reuse the established visual of atomic query graph rather than invent another graph style, with node clicks showing detailed, beautified evidence."
}
