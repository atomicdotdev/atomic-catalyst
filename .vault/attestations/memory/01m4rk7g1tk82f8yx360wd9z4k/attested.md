---
memoryId: 01m4rk7g1tk82f8yx360wd9z4k
sourceContentHash: blake3:ab75d7559422267115a6de27713cff291d6ac9de0bc087954c7506dd5dce8501
entry_type: attestation
content_hash: QCKYG7MTPB3GFCVC5PWR2ZDM2XHDQNTWBGPRFQYF6JSRZIP2ONAA
created_at: 2026-10-12T17:41:01.849099+00:00
updated_at: 2026-10-12T17:41:01.849099+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m4rk7g1tk82f8yx360wd9z4k",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:e7f78dbd3dd3b047249c54d99a49b64fb3abb6a91088f3f0b7a61e789f4a3845",
  "createdAt": "2026-10-12T17:40:37Z",
  "derivedFrom": [
    "urn:atomic:intent:01M4RJ043MHF7FRHN69XXEJEWD"
  ],
  "memoryKind": "constraint",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "zC97kA3hRfZng7UxKW9NfaSsKpMhaymEXp7k7mArJPEv6GHAwzy5aL7VNtc5q6EFrx1ZoxoJGuNZkhRCUSVB58aK",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Atomic CLI is the authoritative owner of intent generation, canonical JSON-LD lifting, SHACL validation, hashes, attestations and verification. Catalyst's MEO-based extension should focus on presentation and source editing, and eventually display CLI results instead of reimplementing those semantics or cryptography. Frontmatter author fields and content hashes are not evidence of signature validity; a status dropdown or evidence-present indicator must not claim conformance."
}
