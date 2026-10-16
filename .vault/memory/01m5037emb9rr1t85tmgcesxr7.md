---
createdAt: 2026-10-15T15:34:54Z
derivedFrom: ["urn:atomic:memory:01m5036mggn1zv4q47eymc9116","urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R"]
memoryKind: context
status: active
uid: 01m5037emb9rr1t85tmgcesxr7
entry_type: memory
content_hash: ZZNYN74V4BC2BJCA4BKZ32BFIWZDQVBM3YLS2FS5UZOK3GHM3CSA
created_at: 2026-10-15T15:34:54.391221+00:00
updated_at: 2026-10-15T15:34:54.391221+00:00
---
The installed nodeatomic contract already exposes authoritative ViewInfo.scope (draft=1, shared=2, unspecified=0), parent, ownChangeCount and inheritedChangeCount; draft-only UI need not guess scope from names. However Catalyst currently drops all of that metadata into a string[] of view names. ChangeEvidence also reduces provenance to node id/kind/summary and edges, and does not expose run-level tool/token/cost totals or a typed affected-files projection. A future draft observability implementation needs those data contracts and exact draft-owned work boundaries before claiming a complete blast radius; visible inherited history and files merely read must not be treated as direct changes.
