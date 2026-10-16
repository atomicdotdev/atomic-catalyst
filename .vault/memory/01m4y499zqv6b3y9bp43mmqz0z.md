---
createdAt: 2026-10-14T21:14:54Z
derivedFrom: ["urn:atomic:ac:01M4Y086Q42WPFGRAJ2NDDQB9R-ac-1","urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R"]
memoryKind: preference
status: active
uid: 01m4y499zqv6b3y9bp43mmqz0z
entry_type: memory
content_hash: LDLT3IU7CG7WHEQIJQX2WYIQPGCXU7TSBO42XXHMX5AQHB5WCVMQ
created_at: 2026-10-14T21:14:54.899558+00:00
updated_at: 2026-10-14T21:14:54.899558+00:00
---
Catalyst graph views should share the established visual of Atomic's query graph viewer, not introduce a separate graph aesthetic. The reference is emit_html in ~/Projects/atomic/atomic-cli/src/commands/query/mod.rs: D3 canvas, dark #1a1a2e background, compact kind-colored circles, subdued links, tooltips and a node-type legend. Catalyst adds click-to-inspect interactions and a polished card-based Evidence Inspector; node labels and proof/trust details belong there rather than oversized graph cards.
