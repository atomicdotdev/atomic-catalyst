---
createdAt: 2026-10-15T16:53:28Z
derivedFrom: ["urn:atomic:intent:01M503J8PH4AKS909RGXZ5RC3C","urn:atomic:memory:01m5037emb9rr1t85tmgcesxr7"]
memoryKind: lesson
status: active
uid: 01m507qajj1pzwaez5s4gscd5j
entry_type: memory
content_hash: KYDSL34SI4OASXGSK7ZKR6GCXL5DUTD53FHTSI6XMSVC4MFIQ4XQ
created_at: 2026-10-15T16:53:28.829564+00:00
updated_at: 2026-10-15T16:53:28.829564+00:00
---
Do not describe Catalyst's missing token/cost display as missing Change API data. atomic-core Change.hashed.provenance contains vendor/model/tool, TokenUsage and Cost. GetChange(includes.metadata=true) returns the complete atomic.change.v3 bundle with that data, but Catalyst 0.2.7 requests only signatures and file contents and its DTO projection omits AI usage. The bundle is binary V3, so expose decoded fields through the existing Rust decoder/native consumer rather than writing another frontend format decoder or inventing a separate usage service. ProvenanceLedger already carries the action DAG, and fileContents/bundle file_ops supply direct impact. Exact linked intent title/Why may still require existing intent context lookup when not embedded in recorded details.
