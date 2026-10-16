---
memoryId: 01m505rs3523a7q1f7ned10j7f
sourceContentHash: blake3:01092ec441d2b1b63deb6edfd9f809f95774656c8256ea19a4f415d2109f4e03
entry_type: attestation
content_hash: 5LY7DNN6NIL3ZOQHYVOJYM4QO56KFUWFD3MJYR6RTDMXCI7E7RFA
created_at: 2026-10-15T16:19:26.761862+00:00
updated_at: 2026-10-15T16:19:26.761862+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:memory:01m505rs3523a7q1f7ned10j7f",
  "@type": "Memory",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:ae8d4a2d50a81884f47b3c92154d9009d106b82c3080301d3906d2d2120f89f2",
  "createdAt": "2026-10-15T16:19:19Z",
  "derivedFrom": [
    "urn:atomic:task:01M503J8PH4AKS909RGXZ5RC3C-1",
    "urn:atomic:intent:01M503J8PH4AKS909RGXZ5RC3C"
  ],
  "memoryKind": "lesson",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "z3BFRPZbi2k1DNg3dDP3g7iEzmVVZMbxaHdmUqq6cuBf82YhuevN12TCXMj1hscQoN25NXAFX2DhGbhLKq5vyAxQ9",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "active",
  "text": "A native smoke failure of 2 != 1 was initially misdiagnosed as Draft/Shared scope being wrong, causing an unnecessary native rebuild investigation. Inspection of the exact assertion showed scope and four own records already passed: the failed assertion hard-coded one inherited parent record, but atomic init can record repository files before the test's own base record. Compare the failing field and CLI/backend authority before diagnosing a runtime bug; derive inherited counts from the fixture's actual parent metadata. The corrected real-native smoke passes Draft classification, own-history exclusion and recorded affected-file paths."
}
