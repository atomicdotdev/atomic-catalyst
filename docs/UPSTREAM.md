# MEO source provenance

This development fork starts from [Markdown Editor Optimized (MEO)](https://github.com/vadimmelnicuk/meo), by Vadim Melnicuk.

- Imported revision: `8a60715abaec18935aaa80d71e4178f618285528`
- Upstream version: `0.1.30`
- Imported on: October 12, 2026
- License: MIT; the upstream `LICENSE` is retained unchanged.
- Upstream source was copied without its Git metadata. Atomic owns this workspace's history.

The editing foundation is CodeMirror 6 with MEO's live/source presentation and VS Code custom-editor integration. Existing upstream features are retained for this first spike rather than aggressively stripped out.

Atomic-specific additions live in `webview/src/helpers/atomicIntentDocument.ts`, `webview/src/helpers/atomicIntent.ts`, and `src/shared/atomicFileReference.ts`. The directive parser indexes syntax for presentation; it is not Atomic's canonical lifter or validator.

The development manifest uses `catalyst-local` as a placeholder publisher; this is not a claim of a registered Marketplace publisher. Version 0.2.0 isolates all command/settings/editor IDs under `catalystIntent.*`, so the original MEO extension can remain installed. Intent filenames default to a separately registered ticket editor; unrelated Markdown remains opt-in.

Review corrected the initial UI direction: an Atomic intent should render as a Jira-style ticket, not a decorated Markdown document. `atomicTicket.ts` supplies a title/status header, editable issue sections, task and criterion cards, and a metadata sidebar. The underlying MEO editor remains available in Source mode; YAML and directive syntax are hidden in the ticket surface.

## Dependency audit

The initial `npm install` reported 23 dependency vulnerabilities. After adding test dependencies, npm reported 22 (1 low, 10 moderate, 10 high, 1 critical), including inherited Mermaid/export dependencies. This prototype is not release-ready. Run `npm audit` for current details; resolve and test dependency updates before distributing the extension. No forced major-version audit fix was applied as part of this editing spike.

Small inherited TypeScript issues were also fixed to establish a clean typecheck: export-window property declarations, narrowing the Git-blame unavailable union, and a missing `markdown-it-emoji` type dependency.

`package-lock.json` is the installation lockfile for this fork. The stale upstream `bun.lock` was removed rather than maintaining two conflicting dependency resolutions; Bun remains the build/test runner.
