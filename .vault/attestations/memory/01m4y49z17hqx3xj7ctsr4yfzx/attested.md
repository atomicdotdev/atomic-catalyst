---
memoryId: 01m4y49z17hqx3xj7ctsr4yfzx
sourceContentHash: blake3:96a318e96c830847b73b0db321f51954e49fe10ac1095c2121e88c0a63fa1fbd
entry_type: attestation
content_hash: 223H5N4DB342MCBNFAKQPADOYJQKN442ZOSIWUHSBJA7SLEDYRIA
created_at: 2026-10-14T21:15:22.050820+00:00
updated_at: 2026-10-14T21:15:22.050820+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m4y49z17hqx3xj7ctsr4yfzx",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:a64df303099ce80d5d849d9a267d2b4aa084d84c06c56c9c0e2903131175ac4e",
  "createdAt": "2026-10-14T21:15:16Z",
  "derivedFrom": [
    "urn:atomic:task:01M4Y086Q42WPFGRAJ2NDDQB9R-1",
    "urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R",
    "urn:atomic:memory:01m4xvxh67rsmb3mv8vc8w2t2y",
    "urn:atomic:memory:01m4xvyttnrcf5cy0715n0bg92"
  ],
  "memoryKind": "decision",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z5hpc8qgEoMibJr534n7zMux7vxmt2kxMbKZVUzgNAyVr81Vz7ossf9dYvRD99Ho31JBciePavsfn7yeyzD7PJCmy",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "As of Catalyst 0.2.6, the Atomic query graph visual is adapted into a scoped TypeScript canvas renderer using locally bundled d3-force/selection/drag/zoom 3.0.0. This supersedes the Cytoscape/fCoSE graph decision and its internal stylesheet sentinel integration. Port the palette, radii and library force settings rather than embedding generated CLI HTML, invoking a CLI subprocess or loading its CDN script; this keeps strict CSP, allowlisted backend actions and untrusted-text safety. Preserve the existing dependency DTO scope rather than pretending it is the CLI knowledge graph, and allow provenance-node details through guarded local inspector navigation."
}
