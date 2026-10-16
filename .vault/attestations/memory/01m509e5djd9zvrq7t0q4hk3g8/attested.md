---
memoryId: 01m509e5djd9zvrq7t0q4hk3g8
sourceContentHash: blake3:6b099c133be21d1ad574c7a0ee71bd52f33f414ec8bdc6cb67cc8520edf1166d
entry_type: attestation
content_hash: Q4K526237NOM3POGOJO4L7RKT6YMNBEMQBU2NEXOJ7S4AG3U2EHA
created_at: 2026-10-15T17:23:35.745604+00:00
updated_at: 2026-10-15T17:23:35.745604+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m509e5djd9zvrq7t0q4hk3g8",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:9d1b5715d516d7df9aa613536137cd2cf498fbb5a6f831f445509d8ae2f24da2",
  "createdAt": "2026-10-15T17:23:25Z",
  "derivedFrom": [
    "urn:atomic:ac:01M5083XACC7PNDC83WR60990V-ac-1",
    "urn:atomic:intent:01M5083XACC7PNDC83WR60990V"
  ],
  "memoryKind": "constraint",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z2pMxUk2yMUVi3bu9H92HjnrqfVebWSb143Grvfy2dxmefaf1CnprEg7VPK2ZJuFfyZXfFZDZBVELbVknFyKmWdBp",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Recorded usage aggregation must preserve uint64 precision and use integer micro-USD (decimal-string DTOs plus BigInt). Do not recompute reported total tokens by adding cache/reasoning billing categories or estimate provider prices. Deduplicate repeated vendor/model/request identities, not sessions; exclude conflicting identities with a warning. Without request IDs, do not combine entries across multiple changes; preserve per-change values. Missing/unsupported/invalid metadata or absent cost is not zero, while a stored usage row reporting zero stays zero. Totals cover loaded associated changes and are not a per-intent billing allocation or independently verified invoice."
}
