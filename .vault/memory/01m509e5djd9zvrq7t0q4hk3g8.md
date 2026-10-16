---
createdAt: 2026-10-15T17:23:25Z
derivedFrom: ["urn:atomic:ac:01M5083XACC7PNDC83WR60990V-ac-1","urn:atomic:intent:01M5083XACC7PNDC83WR60990V"]
memoryKind: constraint
status: active
uid: 01m509e5djd9zvrq7t0q4hk3g8
entry_type: memory
content_hash: TPYZ53CRLM3AEZ6MI6D6W6L6C5OHNTJ7LKY7YYZW5ZVD24ZLPG3Q
created_at: 2026-10-15T17:23:25.785942+00:00
updated_at: 2026-10-15T17:23:25.785942+00:00
---
Recorded usage aggregation must preserve uint64 precision and use integer micro-USD (decimal-string DTOs plus BigInt). Do not recompute reported total tokens by adding cache/reasoning billing categories or estimate provider prices. Deduplicate repeated vendor/model/request identities, not sessions; exclude conflicting identities with a warning. Without request IDs, do not combine entries across multiple changes; preserve per-change values. Missing/unsupported/invalid metadata or absent cost is not zero, while a stored usage row reporting zero stays zero. Totals cover loaded associated changes and are not a per-intent billing allocation or independently verified invoice.
