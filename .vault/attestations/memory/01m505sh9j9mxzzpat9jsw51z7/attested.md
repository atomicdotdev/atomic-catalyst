---
memoryId: 01m505sh9j9mxzzpat9jsw51z7
sourceContentHash: blake3:7eb50066d6e2e1368739c1b30e0e745c10b465c2312468a32e9900b9cc9aa73d
entry_type: attestation
content_hash: DEG3AA3J5GFF6FUOUXKUGVYI4YX2DMQDMGCYSXBXZU6BXYR5JZKA
created_at: 2026-10-15T16:19:56.826272+00:00
updated_at: 2026-10-15T16:19:56.826272+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m505sh9j9mxzzpat9jsw51z7",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:3f81b26d9589667a6d7e61f04bbf883f0b1bb14a0b415f4f28384807f0e1b80f",
  "createdAt": "2026-10-15T16:19:44Z",
  "derivedFrom": [
    "urn:atomic:task:01M503J8PH4AKS909RGXZ5RC3C-1",
    "urn:atomic:intent:01M503J8PH4AKS909RGXZ5RC3C"
  ],
  "memoryKind": "context",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3U6XMwYnk6gQyAYAoFQDTcByPsoLEmUm4MteuAFbarTyT1rvx2aKfLyXSEJiM6UaqGQ7qTfA2gaZermqoB8ypqMD",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "Atomic's current libatomic Log handler in libatomic/src/daemon/services.rs emits ChangeLogEntry.dependencies as an empty Vec; those rows cannot support a true dependency graph. GetChange returns the actual hashed dependencies and, with includeFileContents=true, recorded touched-file paths. Normal Log requests for an explicit view with allViews=false use own history and exclude inherited changes. Catalyst's draft projection therefore hydrates bounded own change pages instead of inferring impact or dependency relationships from history summaries. Shared overviews must stop before these reads."
}
