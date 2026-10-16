---
createdAt: 2026-10-14T18:48:58Z
derivedFrom: ["urn:atomic:ac:01M4XVAVD7BSAMB69K4GN7WABC-ac-1","urn:atomic:intent:01M4XVAVD7BSAMB69K4GN7WABC"]
memoryKind: lesson
status: active
uid: 01m4xvy34mysghgf2r140r25s2
entry_type: memory
content_hash: PEWYJ7UZPRVE4FC6M7POTLQCZK4CBPRB2EW6LQ7Y34LOTGJOMVFQ
created_at: 2026-10-14T18:48:58.817075+00:00
updated_at: 2026-10-14T18:48:58.817075+00:00
---
Graph DOM-presence and selection smoke tests missed overlapping node labels and extreme sparse-graph magnification in a shipped VSIX. Regression checks must measure real rendered bounding boxes, label pixel scale and viewport containment for one node, three disconnected nodes, cycles and the full 500-entry history, alongside actual canvas hit testing, keyboard access, dragging and resizing. Checking the source version or rendering an unrelated tree is not enough to validate the dependency graph.
