---
author: continuouslee
created_by: continuouslee <lee@atomic.dev>
goals: []
id: VSCO::continuouslee::2
priority: medium
project: VSCO
seq: 2
status: needs-review
title: Rename the desktop application to Catalyst
uid: 01M4REEBQZEK2QC1ATSBF3CCHC
view: dev
entry_type: intent
content_hash: GECUUUXPLJBG234MXLLYQO45NTQVHO3WJEWAM7RYFWYFI22WFAQQ
created_at: 2026-10-12T16:25:28.947816+00:00
updated_at: 2026-10-12T16:25:28.947816+00:00
---
:::why
The user chose Catalyst as the developer tool's app name. Builds must consistently identify themselves as Catalyst and coexist safely with VSCodium instead of sharing its installation and user-data identity.
:::

:::acceptance-criterion{#01M4REEBQZEK2QC1ATSBF3CCHC-ac-1 status=met verifiedBy="tests/test_branding.py" evidence="python3 -m unittest discover -s tests -p 'test_branding.py' -v: 12 tests passed, including real stable/insider preparation prefixes, endpoint removal, metadata preservation, distinct identifiers, entry-point agreement, MSI metadata and Bash syntax. git diff --check passed. Native full builds not run."}
Stable and insider branding generates Catalyst display names, executable/protocol/data-folder identities and distinct Windows/macOS identifiers; local and CI build entry points and Linux/MSI metadata agree; automated branding tests and shell syntax checks pass. Desktop and CLI update endpoints no longer default to VSCodium releases.
:::

:::task{#01M4REEBQZEK2QC1ATSBF3CCHC-1 status=done criteria=01M4REEBQZEK2QC1ATSBF3CCHC-ac-1}
Centralize channel-specific product identity, update preparation and build defaults, adjust desktop/installer metadata, document the rename, and test branding without executing a full editor build.
::file-ref{path=prepare_vscode.sh}
::file-ref{path=utils.sh}
::file-ref{path=build/windows/msi/build.sh}
::file-ref{path=dev/build.sh}
:::

:::scope-in
App identity, local/CI build name defaults, Linux app descriptions/search keywords, Windows installer identity, safe update defaults, branding tests and migration documentation.
:::

:::scope-out
No full editor build, icon integration, Atomic backend integration, automatic settings migration, replacement of upstream licenses, new public domains/repositories, or store publication infrastructure migration.
:::

:::constraint
Preserve upstream attribution and dependency identifiers. Do not reuse VSCodium's Windows installation/upgrade IDs or data directories. Do not invent release endpoints. Respect existing user changes.
:::
