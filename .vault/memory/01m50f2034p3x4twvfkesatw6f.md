---
createdAt: 2026-10-15T19:01:38Z
derivedFrom: ["urn:atomic:ac:01M50DXGGGT32E3BPY1TTCDKX1-ac-2","urn:atomic:ac:01M50DXGGGT32E3BPY1TTCDKX1-ac-3","urn:atomic:intent:01M50DXGGGT32E3BPY1TTCDKX1"]
memoryKind: lesson
status: active
uid: 01m50f2034p3x4twvfkesatw6f
entry_type: memory
content_hash: GADCM56XPU54OKYA4BDBU3IISW22TISIREGOIBMIF75SOEJJN5RA
created_at: 2026-10-15T19:01:38.574546+00:00
updated_at: 2026-10-15T19:01:38.574546+00:00
---
For Catalyst change inspection, translating native Atomic output into cards, metric tiles, renamed action kinds and collapsed action rows failed the user's visual requirement. Treat the native atomic change report as the presentation reference: continuous monospace text, the native Attestation and Change Ledger headings, recorded node order and kind labels, and visible command/path previews. Editor-only linked-intent and verification controls belong in secondary disclosures, not ahead of the report. Missing native fields are an implementation gap to close through ~/Projects/atomic/libatomic -> ~/Projects/nodeatomic -> Catalyst, not an endpoint for UI work. The GetChange metadata.graph_summary addition reuses atomic_repository::triage::{count_hunk_atoms,hunk_display_summaries}; nodeatomic generates metadata.graphSummary from the rebuilt addon's descriptor and Catalyst renders the validated counters/rows. Rebuild/install the producer artifact explicitly, regenerate the consumer, then rebuild the extension runtime. Never infer graph counts from ledger nodes, reconstruct hunks in JS, parse the binary bundle in the webview, or make consumer builds compile/discover producer source.
