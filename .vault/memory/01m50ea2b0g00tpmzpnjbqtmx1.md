---
createdAt: 2026-10-15T18:48:34Z
derivedFrom: ["urn:atomic:task:01M50DXGGGT32E3BPY1TTCDKX1-1","urn:atomic:intent:01M50DXGGGT32E3BPY1TTCDKX1"]
memoryKind: decision
status: active
uid: 01m50ea2b0g00tpmzpnjbqtmx1
entry_type: memory
content_hash: BIQXBZLRZPRYU4TJSATGPBI4NOQVKRTUXBGOEU5HJOJNUOBXFURA
created_at: 2026-10-15T18:48:34.430601+00:00
updated_at: 2026-10-15T18:48:34.430601+00:00
---
Catalyst change inspection now uses native view-to-hash navigation and a focused single-change webview instead of the aggregate draft dashboard. Expanding a view pages log rows, and selecting a hash lazily reads only that change and its explicit provenance-linked intents, allowing Shared-view inspection without bulk hydration. Display hashes use CLI-compatible Base32 while DTO IDs stay hex. Missing/multiple intent links are local requirement warnings, not canonical SHACL reports; the current nodeatomic query has no SHACL result and does not establish reverse one-to-one uniqueness across history.
