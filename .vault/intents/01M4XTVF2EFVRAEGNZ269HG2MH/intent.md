---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: CATA::continuouslee::4
priority: medium
project: CATA
seq: 4
status: needs-review
title: Package Catalyst Intent Editor 0.2.4
uid: 01M4XTVF2EFVRAEGNZ269HG2MH
view: dev
entry_type: intent
content_hash: EOSHMRDOGTIFYF5IEPOLZX7JIZMHNO5MHRYN54I5BHH2LGS5CY6A
created_at: 2026-10-14T18:31:23.537385+00:00
updated_at: 2026-10-14T18:31:23.537385+00:00
---
:::why
The user wants version 0.2.4 to distinguish the latest semantic-tree webview from earlier installed builds.
:::

:::acceptance-criterion{#01M4XTVF2EFVRAEGNZ269HG2MH-ac-1 status=met verifiedBy="VSIX archive assertions, Bun tests, TypeScript and Puppeteer" evidence="bun run package:vsix succeeded; archive manifest/package version 0.2.4 and packaged graph JS/CSS exactly match current build; lockfile versions match; 103 tests pass; typecheck and graph browser smoke pass"}
Package metadata and lockfile identify version 0.2.4, the changelog describes the tree update, and a newly built local VSIX contains version 0.2.4 and the latest semantic-tree assets.
:::

:::task{#01M4XTVF2EFVRAEGNZ269HG2MH-1 status=done criteria=01M4XTVF2EFVRAEGNZ269HG2MH-ac-1}
Update release metadata, build and package the extension, and inspect the archive's manifest and graph bundle.
::file-ref{path=package.json}
::file-ref{path=package-lock.json}
::file-ref{path=CHANGELOG.md}
:::

:::scope-in
Version metadata, release notes, generated build assets and local VSIX packaging.
:::

:::scope-out
Marketplace publication, tags, dependency upgrades, automatic installation and unrelated source changes.
:::

:::constraint
Preserve prior release artifacts and unrelated work; verify packaged metadata rather than implying a source version bump updates an installed extension.
:::
