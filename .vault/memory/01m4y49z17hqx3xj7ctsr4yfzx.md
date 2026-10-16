---
createdAt: 2026-10-14T21:15:16Z
derivedFrom: ["urn:atomic:task:01M4Y086Q42WPFGRAJ2NDDQB9R-1","urn:atomic:intent:01M4Y086Q42WPFGRAJ2NDDQB9R","urn:atomic:memory:01m4xvxh67rsmb3mv8vc8w2t2y","urn:atomic:memory:01m4xvyttnrcf5cy0715n0bg92"]
memoryKind: decision
status: active
uid: 01m4y49z17hqx3xj7ctsr4yfzx
entry_type: memory
content_hash: JGV2WOIRHDQ254MAHAMHRM2EFNCWDJ3IZJYGQDFZD7D3PG6IZQEA
created_at: 2026-10-14T21:15:16.432482+00:00
updated_at: 2026-10-14T21:15:16.432482+00:00
---
As of Catalyst 0.2.6, the Atomic query graph visual is adapted into a scoped TypeScript canvas renderer using locally bundled d3-force/selection/drag/zoom 3.0.0. This supersedes the Cytoscape/fCoSE graph decision and its internal stylesheet sentinel integration. Port the palette, radii and library force settings rather than embedding generated CLI HTML, invoking a CLI subprocess or loading its CDN script; this keeps strict CSP, allowlisted backend actions and untrusted-text safety. Preserve the existing dependency DTO scope rather than pretending it is the CLI knowledge graph, and allow provenance-node details through guarded local inspector navigation.
