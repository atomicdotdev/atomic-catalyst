---
memoryId: 01m5037emb9rr1t85tmgcesxr7
sourceContentHash: blake3:1d737015e96362ebe59d773e73f88451a239bbad840c2b8fc995f78f08b7c16d
entry_type: attestation
content_hash: OGJ4E4S2H5M2FE4K3U3YOHX7NQIAPPHTW4E2JLNE5VQ2TAXMUM4A
created_at: 2026-10-15T15:35:02.567154+00:00
updated_at: 2026-10-15T15:35:02.567154+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m5037emb9rr1t85tmgcesxr7",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:ce249f00be2c1e1a881b9e7f8566eec016c0659a7184c2815d837601fa7cbfbb",
  "createdAt": "2026-10-15T15:34:54Z",
  "derivedFrom": [
    "urn:atomic:memory:01m5036mggn1zv4q47eymc9116",
    "urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R"
  ],
  "memoryKind": "context",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "zwyYDD8T1PtnCDwqdGxgnq2ViScF2okb8N8Dv2HVbPNdQtHz4Swvuog7b5sicRrzbGPUe3aTy3R2DdmNi6UeW1CL",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "The installed nodeatomic contract already exposes authoritative ViewInfo.scope (draft=1, shared=2, unspecified=0), parent, ownChangeCount and inheritedChangeCount; draft-only UI need not guess scope from names. However Catalyst currently drops all of that metadata into a string[] of view names. ChangeEvidence also reduces provenance to node id/kind/summary and edges, and does not expose run-level tool/token/cost totals or a typed affected-files projection. A future draft observability implementation needs those data contracts and exact draft-owned work boundaries before claiming a complete blast radius; visible inherited history and files merely read must not be treated as direct changes."
}
