---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::10
priority: medium
project: CATA
seq: 10
status: needs-review
title: Rename extension to Atomic Sherpa and adopt backpack icon
uid: 01M5SEMGH89WD3V9TXJ5JANTW9
view: withered-silence-019a
entry_type: intent
content_hash: NMZ6AMXGFMJXEDQXFCIFLD5JXEHELIPTEUA24OZIMGU3HS4IBGIA
created_at: 2026-10-25T11:57:46.627227+00:00
updated_at: 2026-10-25T11:57:46.627227+00:00
---
:::why
The user wants the plugin branded Atomic Sherpa (atomic-sherpa) using their Downloads/backpack.png image.
:::

:::acceptance-criterion{#01M5SEMGH89WD3V9TXJ5JANTW9-ac-1 status=met verifiedBy="Bun packaging regression tests and byte comparison" evidence="bun test scripts/universalVsix.test.mjs: 6 pass, 0 fail; cmp confirms backpack.png matches Downloads source exactly. Full suite: 164 pass, 4 failures in untouched atomicBlastRadius tests. No release archive built or published."}
Manifest and lockfile identify atomic-sherpa / Atomic Sherpa; current editor labels and documentation reflect the rename; the manifest icon is an exact copy of the supplied backpack PNG. Packaging regression tests pass and existing command/settings/editor IDs remain stable.
:::

:::task{#01M5SEMGH89WD3V9TXJ5JANTW9-1 status=done criteria=01M5SEMGH89WD3V9TXJ5JANTW9-ac-1}
Update branding, copy the backpack asset, and verify package metadata, image bytes and packaging tests.
::file-ref{path=package.json}
::file-ref{path=package-lock.json}
::file-ref{path=README.md}
::file-ref{path=scripts/universalVsix.test.mjs}
:::

:::scope-in
Current extension identity, visible editor labels, browser preview title, documentation and packaging test fixtures.
:::

:::scope-out
Historical signed vault records, upstream attribution, desktop Catalyst fixture, runtime behavior, publishing and release builds.
:::

:::constraint
Preserve catalystIntent and catalystAtomic IDs and unrelated user changes. Do not rename references to the separate Catalyst desktop application.
:::
