---
memoryId: 01m509d3vpq5de0k84ky9k62g4
sourceContentHash: blake3:ae46d9bb5d1fcc377d5776a62c61a298739fb219bc00c1a99b5e5f8ac836307f
entry_type: attestation
content_hash: BADHJZFQ4K7CMIBRQS433CKOGUJAZVHAPZPN7BZVU5HAI32HZHYA
created_at: 2026-10-15T17:23:01.969775+00:00
updated_at: 2026-10-15T17:23:01.969775+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m509d3vpq5de0k84ky9k62g4",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:7a3f9b00e1cb26a55baf3fda1fc4b00e1622937a245dedaa55eaed55810e4b13",
  "createdAt": "2026-10-15T17:22:51Z",
  "derivedFrom": [
    "urn:atomic:task:01M5083XACC7PNDC83WR60990V-1",
    "urn:atomic:intent:01M5083XACC7PNDC83WR60990V",
    "urn:atomic:memory:01m507qajj1pzwaez5s4gscd5j"
  ],
  "memoryKind": "decision",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z4URSQJmbZsd17Y5FxzGMrDk3p2oFF2MV17MV3zMGTWTyA55d25ad3PdgeCCfiuTwaK3ALvi7Uh7r51VCoZnUyS5K",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Catalyst 0.2.8 consumes an additive typed ChangeMetadata projection on the existing GetChange response (field 11, schema_version 1) when includes.metadata=true. libatomic projects it from the atomic-core-loaded change and preserves the existing V3 bundle; no frontend Postcard decoder or separate usage endpoint was added. The projection whitelists recorded vendor/model/tool, request/session context, six token counters, exact micro-USD and actual paths, excluding prompt/reasoning text/signatures and arbitrary provider metadata. Generated nodeatomic codecs/types carry it; Catalyst validates schema/source hash and forwards decimal strings to the central draft overview."
}
