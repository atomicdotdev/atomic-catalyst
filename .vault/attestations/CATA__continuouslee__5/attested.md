---
intentId: CATA::continuouslee::5
sourceContentHash: blake3:8ad5f2f9d85eed7fc767f13c06fb7af828df0e9c13a7906e7defcb310931cdf6
entry_type: attestation
content_hash: LCZAZCES5B6ZLMGEKFDPPTDBF4SHBE4EUX632Y6BRSI6VKFNONIQ
created_at: 2026-10-14T18:48:33.197429+00:00
updated_at: 2026-10-14T18:48:33.197429+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M4XVAVD7BSAMB69K4GN7WABC",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:fd6adafc4070d99b7f7614e2f5e2be6ac801c4cbbaabc23ce55ac6ab3d69fcbd",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M4XVAVD7BSAMB69K4GN7WABC-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "105 tests pass; typecheck passes; strict-CSP browser smoke verifies 1/3/30/500-node geometry, cycles, canvas and keyboard selection, node dragging, pan, zoom, resize and destroyed instances; 0.2.5 VSIX graph JS/CSS match current build and include Cytoscape/fCoSE plus license notices",
      "text": "Cytoscape.js owns graph layout, rendering and interactions; sparse graphs have readable non-overlapping nodes and initial zoom no greater than one. Directed edges, unloaded references, safe evidence selection and keyboard access remain truthful. Tests cover sparse, disconnected, connected and cyclic graphs, resizing and cleanup; typechecks and browser smoke pass and a fresh 0.2.5 VSIX contains the bundled library.",
      "verifiedBy": "Bun tests, TypeScript, Puppeteer rendered geometry and VSIX archive assertions"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m4xvavd7bsamb69k4gn7wabc-constraint-1",
      "@type": "Constraint",
      "text": "Bundle graph code locally without CDN or new CSP permissions. Preserve recorded edge direction, render untrusted labels as data/text, maintain invalidation guards, and destroy graph listeners/observers on replacement."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m4xvavd7bsamb69k4gn7wabc-scope-in-1",
      "@type": "ScopeItem",
      "text": "Graph dependency and renderer, graph UI tests, version metadata, release notes and local VSIX."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m4xvavd7bsamb69k4gn7wabc-scope-out-1",
      "@type": "ScopeItem",
      "text": "Backend semantics, provenance tree relationships, cryptographic verification, automatic installation and Marketplace publication."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M4XVAVD7BSAMB69K4GN7WABC-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4XVAVD7BSAMB69K4GN7WABC-ac-1"
      ],
      "taskStatus": "done",
      "text": "Add Cytoscape.js with its fCoSE layout extension, remove bespoke physics/SVG rendering, provide theme-aware graph controls and accessible selection, test actual rendered geometry and interactions, and package version 0.2.5.",
      "touchesFile": [
        "webview/src/atomicDependencyGraph.ts",
        "webview/src/atomicGraphView.ts",
        "webview/src/atomicGraph.css",
        "src/atomic/graphPanel.ts",
        "scripts/atomicGraphSmoke.mjs",
        "scripts/atomicEvidence.test.mjs",
        "package.json"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::5",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z2KGsH7Sj8EPPa4V5oZoNgNbWiumshvTnYbHUMe52e6p4MqZvVtJsdHkmbpD5L1LW5HNmf4D7vpNddPS3eMjUwAkj",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Replace custom graph physics and rendering with Cytoscape.js",
  "view": "dev",
  "why": "The user identified that the hand-written force simulation produces overlapping nodes and giant labels and requested use of an established npm graph library."
}
