---
memoryId: 01m507qajj1pzwaez5s4gscd5j
sourceContentHash: blake3:2a40c5fe86276a30cae5a47bf7e501c0e25b23f1ea10e5975d69c98193054c98
entry_type: attestation
content_hash: UTY7UG4RLUJBCRW6V3N6HD5NZZIRXB425PBZ5K3I7W6YG52U3YHA
created_at: 2026-10-15T16:53:41.139465+00:00
updated_at: 2026-10-15T16:53:41.139465+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m507qajj1pzwaez5s4gscd5j",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:4020119bd4579519b0790ad71a97bb706097f2bca030b0ed5876a9b8e467e058",
  "createdAt": "2026-10-15T16:53:28Z",
  "derivedFrom": [
    "urn:atomic:intent:01M503J8PH4AKS909RGXZ5RC3C",
    "urn:atomic:memory:01m5037emb9rr1t85tmgcesxr7"
  ],
  "memoryKind": "lesson",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z1LzUdrdH9t1DVwZ6bZ9c75AUYUMaZfQWPnu4gFRWfx3N92iBjbGpMcJKrYKxS3r5NKjXTGUzsecEkVtmFFm6Ewk",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Do not describe Catalyst's missing token/cost display as missing Change API data. atomic-core Change.hashed.provenance contains vendor/model/tool, TokenUsage and Cost. GetChange(includes.metadata=true) returns the complete atomic.change.v3 bundle with that data, but Catalyst 0.2.7 requests only signatures and file contents and its DTO projection omits AI usage. The bundle is binary V3, so expose decoded fields through the existing Rust decoder/native consumer rather than writing another frontend format decoder or inventing a separate usage service. ProvenanceLedger already carries the action DAG, and fileContents/bundle file_ops supply direct impact. Exact linked intent title/Why may still require existing intent context lookup when not embedded in recorded details."
}
