---
memoryId: 01m4y499zqv6b3y9bp43mmqz0z
sourceContentHash: blake3:0aaaa479c81f9cd61d456746d0a98d4cb470be851205648650df503291bfc671
entry_type: attestation
content_hash: 3VZHGEF25FQOHNV7QHMCTGWAKHG3DYSKILBOCS74FHOBNMLG7EOA
created_at: 2026-10-14T21:15:01.099931+00:00
updated_at: 2026-10-14T21:15:01.099931+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m4y499zqv6b3y9bp43mmqz0z",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:aa7d7015e63ac80da0ed20a2150b71497a3746c99f7d7750d86a23b9bd27c39f",
  "createdAt": "2026-10-14T21:14:54Z",
  "derivedFrom": [
    "urn:atomic:ac:01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1",
    "urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R"
  ],
  "memoryKind": "preference",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3zjrH2FMDvhHk66xyhiuA4FKFTXF4Rs1br7dJmVrju27oCwZnt7g3yqVVUwhyQoHLfaud5ZYupjKcxB1nAM5X1uN",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Catalyst graph views should share the established visual of Atomic's query graph viewer, not introduce a separate graph aesthetic. The reference is emit_html in ~/Projects/atomic/atomic-cli/src/commands/query/mod.rs: D3 canvas, dark #1a1a2e background, compact kind-colored circles, subdued links, tooltips and a node-type legend. Catalyst adds click-to-inspect interactions and a polished card-based Evidence Inspector; node labels and proof/trust details belong there rather than oversized graph cards."
}
