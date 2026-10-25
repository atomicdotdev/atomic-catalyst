# Atomic Sherpa

## Unreleased
- Rename the extension to Atomic Sherpa (`atomic-sherpa`) and use the backpack artwork as its icon.
- Update intent-editor labels and settings descriptions while preserving existing command, setting, and editor IDs.

## 0.2.12
- Package one universal, JavaScript-only VSIX; Atomic's platform library is supplied by the separate Atomic installation on the extension host.
- Stop copying nodeatomic's development addon and exclude stale native binaries from packaging.
- Verify every generated VSIX has no platform target or native payload, and smoke-test its extracted consumer outside the source checkout.
- Check lazy import and missing-runtime behavior without Atomic; when a runtime is explicitly configured, also verify actual installed native dispatch.
- Surface runtime installation, checksum, contract and platform failures with recovery guidance instead of recommending an extension rebuild.
- Platform-specific Node/Electron host testing remains required before claiming tested support; no Marketplace publication is performed.

## 0.2.11
- Rename the extension to Atomic Catalyst with the registered package name `atomic-catalyst` and publisher ID `atomicdotdev`.
- Use the flask artwork as the extension icon.
- Refresh the description, categories, keywords, and README to cover intents, source code, Draft and Shared views, change history, and blast-radius analysis.
- Replace inherited MEO branding in settings descriptions while preserving upstream attribution and existing command, setting, and editor IDs.

## 0.2.10
- Expose change-local governing plan IDs and their recorded graph/session-turn sources through Atomic, libatomic and generated nodeatomic types.
- Display Plan ID near the change header and in the ledger; keep edited intent-document associations separate from governing declarations.
- Resolve current UID/human-key aliases and source paths natively, including older changes with intent edits but no recorded plan_id.
- Remove the misleading “Intent-link requirement failed” message: missing or partial metadata is not SHACL failure, and ambiguous governors are not arbitrarily selected.
- Preserve recorded IDs when current intent metadata cannot be resolved; reject mismatched native context and never borrow another turn's plan or backfill old provenance.

## 0.2.9
- Replace the dashboard with a native-style Atomic change report and lazy, per-view change selection.
- Show native graph counts, content bytes, file symbols and hunk summaries through the updated libatomic/nodeatomic API.
- Add a selected-change blast-radius heatmap with module/hop counts, file drill-down and a working change-graph view, based on the Noname reference.
- Compute structural impact from recorded sources and incoming current-KG callers/importers; disclose partial coverage without fabricated impact percentages or historical snapshot claims.
- Open tracked SCM files in VS Code's native diff editor against their recorded baseline; open historical change files as immutable before/after diffs.
- Handle known added/deleted sides separately from unavailable revisions, and retain path, trust, view and stale-action guards.
- Bundle the rebuilt native addon and generated consumer, with bounded read-only snapshot caches and atomic addon publication.

## 0.2.8
- Request complete change metadata and consume the safe decoded projection returned by the existing GetChange API, using Atomic's Rust-loaded change rather than a frontend V3 parser.
- Show recorded vendor/model/tool, input/output/cache/reasoning/reported-total tokens, and exact USD cost in the draft overview, with request/session details under each change.
- Deduplicate repeated vendor/model/request identities across changes; flag conflicts and unidentified multi-change usage instead of guessing totals or counting one request multiple times.
- Preserve uint64 precision and distinguish recorded zero from missing, unsupported or malformed metadata; show partial coverage and missing costs explicitly.
- Rebuild the native addon and regenerate the nodeatomic codecs, retaining draft-only routing, inline provenance details and strict CSP.

## 0.2.7
- Label left-pane views as Draft, Shared, or Unknown scope using backend metadata, and make view clicks open the exact view without switching the working copy.
- Show a “Not implemented yet” page for shared views without fetching their draft history or evidence.
- Replace the graph and right-hand Evidence Inspector with a central draft overview: linked intent title/why, tool/agent, recorded affected-file blast radius, and a type-pill/action provenance log.
- Keep inherited history out of the draft projection; bound history hydration and activity rendering, deduplicate shared ledgers, and support type/search/file filters and inline details.
- Mark missing token/cost totals and downstream impact as unavailable; preserve stale-action guards and immutable signed snapshots.

## 0.2.6
- Adapt the D3 canvas visual from Atomic's `query graph` viewer: dark background, compact color-coded nodes, subtle links, hover tooltips, and a node-type legend.
- Bundle D3 force, selection, drag, and zoom locally instead of using a CDN or the separate Cytoscape visual.
- Redesign the Evidence Inspector with a clear title, kind badge, metadata cards, relationship details, and separate signature/source/trust/editor states.
- Make recorded provenance nodes and cross-links inspectable, with local relationship navigation and a return to the enclosing change's evidence.
- Keep stale-action guards, unloaded references, keyboard access, strict CSP, and 1–500-node browser regression checks.

## 0.2.5
- Replace the custom force simulation and SVG graph with locally bundled Cytoscape.js and its fCoSE layout extension.
- Keep sparse graphs at a readable scale with non-overlapping node cards, directed arrows, dragging, and fit/zoom controls.
- Preserve unloaded references and full summaries through hover details and a keyboard-accessible change list.
- Add rendered-geometry, canvas-selection, resize, lifecycle, and strict-CSP regression checks while retaining the semantic provenance tree.

## 0.2.4
- Present recorded provenance as an expandable semantic relationship tree with full summaries and node IDs.
- Add relationship links that reveal and focus connected children, preserving shared nodes and cycles as cross-links.
- Add expand/collapse controls, keyboard navigation, and narrow-screen browser checks.

## 0.2.3
- Add an Atomic change-dependency graph with a read-only Evidence inspector, perspective selection, paged history, and explicit unloaded references.
- Display supported recorded provenance DAGs, agents, sessions, and explicit plan IDs without inferring authorship or cryptographic verification.
- Inspect repository-wide stored intent attestations with separate historical signature, stored-source freshness, signer, trust, and editor-buffer facts.
- Open exact stored signed documents as immutable, script-free snapshots; fence stale reads and allowlist webview actions.
- Add evidence-model, request-race, DOM-safety, and built graph browser smoke tests.

## 0.2.2
- Show an explicit repository-upgrade requirement and manual repair guidance for legacy PATH_CLAIMS schemas, rather than a generic Atomic unavailable warning.
- Keep backend errors scoped to each repository and continue refreshing other repositories after a failure.
- Disable the record input while repository queries are unavailable; restore it after a successful refresh.
- Do not migrate or repair repositories automatically.

# Upstream Markdown Editor Optimized (MEO)
---
## 0.1.30
- Added ChatGPT citations rendering
- Added LaTeX display math delimiters and escaped variants
- Fixed custom editor edits when backing text documents close

## 0.1.29
- Fixed Cursor file editor associations on AI pending edits

## 0.1.28
- Added sticky table header
- Added HTML comment decorations and gutter support
- Fixed $ sign rendering issue
- Updated Read Only feature description for clarity

## 0.1.27
- Added a shared read only toggle
- Added the theme color to customize the active-line highlight
- Added visual multiline editing to live table cells
- Added link-reference definitions as visible linked lists in HTML and PDF exports
- Added configurable CodeMirror keymap in settings
- Fixed live table cell clicks caret placing
- Fixed the selection formatting toolbox flickering while highlighting text
- Fixed disappearing floating toolbar and missing spelling suggestions
- Fixed multiple selection shortcuts in Source mode
- Hardened external document sync

## 0.1.26
- Improved dark Mermaid diagram line contrast
- Fixed live find matches and preserve active highlight
- Fixed inline toolbox and ignore intraword underscores
- Fixed find results in rendered tables

## 0.1.25
- Added spellcheck suggestions and toolbar toggle
- Fixed mermaid diagram rendering and controls
- Fixed content width toggle state

## 0.1.24
- Added light theme and background customisation
- Added sync with VSCodeVim custom keybindings
- Added VS Code theme highlighting for code blocks
- Added spell diagnostics in MEO editor
- Added content width toolbar toggle
- Added contextual table cell editing controls
- Added sortable live table columns
- Improved wide table rendering
- Improved find result highlighting and controls
- Fixed Git baseline refreshes during editor startup
- Fixed pending markdown edits during save sync

## 0.1.23
- Added inline footnote support with decorations and styling
- Enhanced full list line decorations and currency vs latex rendering

## 0.1.22
- Added support for additional task statuses in-progress [~] and dropped [-]
- Added drag threshold handling for git blame gutter
- Enhanced single tilde strike handling with whitespace and boundary checks

## 0.1.21
- Added scroll position restoration for long markdown files
- Fixed shortcut handling for local search shortcut to exclude shift key

## 0.1.20
- Added export image mode configuration for HTML export
- Added font weight configuration for headings in theming
- Added ready handshake mechanism for webview
- Removed auto-save feature and related configurations
- Enhanced VSCode API compatibility with fallback state management
- Enhanced copilot handoff
- Updated anchor coordinates for improved selection handling
- Updated global configuration
- Fixed base01 theming issue
- Fixed padding for mode-toolbar when line numbers are hidden

## 0.1.19
- Added support for customizable font weights in theme settings
- Fixed URL boundary decorations
- Fixed agent review handling
- Fixed min-width for hidden line numbers
- Updated configuration for browser path handling
- Updated demo image URL for proper rendering outside of GitHub
- Removed git decorations from no git paths and files in .gitignore

## 0.1.18
- Implemented Theming v2
  - Built-in themes
  - Granular style customisation for individual markdown tags
  - Import/Export themes as JSON
- PR: Extra code block langs (#26)
- Fixed local link handling and navigation
- Various minor improvements

## 0.1.17
- Added latex math rendering
- Added kbd tag parsing and rendering
- Improved auto save stability
- Improved table inline parsing
- Updated demo gif and enhance feature descriptions

## 0.1.16
- Added mermaid colon fences in markdown rendering
- Fixed document offset mapping in applyDocumentChanges function (patch for issue 23)

## 0.1.15
- Added find functionality for whole word and case sensitivity options
- Added GitHub Copilot native change review support
- Fixed link decoration handling in live mode on text selection
- Refactor extension entry point
- Implemented load performance improvements

## 0.1.14
- Added .mdc/.mdx support
- Added collapsible details blocks with summary widget and styling
- Added GitHub alerts render
- Added footnotes
- Added emoji support
- Added floating toolbar display for table cells
- Added draft state synchronization and messaging
- Added git blame support for tables and mermaid diagrams in live mode
- Improved frontmatter HTML export
- Enhanced git diff functionality with live mode renderer
- Fixed z-index for row controls to get hover working

## 0.1.13
- Refactored webview from JS to TS
- Added image paste function with 'assets' as default folder
- Added font size setting
- Fixed top toolbar position
- Fixed numeric lists issue & double enter press behaviour
- Performance improvements

## 0.1.12
- Added Git change visualisations to the left gutter and scroller with toggle functionality
- Added Git blame feature
- Added basic support for merge conflict markers
- Added Vim mode and associated keyboard shortcuts, can be enabled in settings for Source mode
- Added a customisable shortcut to toggle between Live/Source modes, Option+Shift+M is default
- Enhanced list marker handling and indentation logic
- Improved arrow key navigation for list content in live mode
- Improved error handling for live mode transient render issues

## 0.1.11
- Added inline markdown rendering in table cells
- Added support for markdown code block rendering
- Added frontmatter styling for simple arrays
- Improved mode switching behaviour
- Enhanced table image rendering
- Enhanced inline code styling
- Fixed editor focus during mode toggling
- Fixed initial cursor position in editor and focus on mount

## 0.1.10
- Added HTML and PDF export functionality
- Improved handling of pending changes and flush logic in editor
- Enhanced frontmatter lists handling and styling for YAML fields
- Enhanced table cell editing with inline previews and improved selection styles
- Removed unnecessary multipleOf constraints for line height settings

## 0.1.9
- Added outline controller with drag-and-drop functionality for headings
- Added heading collapse functionality
- Added customizable line height settings for live and source modes
- Added keyboard handling to close find panel with Escape key
- Enhanced task list handling

## 0.1.8
- Added language label for code blocks
- Added outline position customization for the document sidebar
- Added powerquery syntax highlighting

## 0.1.7
- Fixed `Reset Theme to Defaults` so theme/font overrides are cleared correctly at global, workspace, and workspace-folder scopes.
- Improved live-mode thematic break decorations so active-line state and frontmatter boundary rendering stay consistent.

## 0.1.6
- Added settings for theme overrides and per-mode fonts.
- Added a `Markdown Editor Optimized: Reset Theme to Defaults` command to reset all theme colors/fonts to defaults.
- Added line number visibility toggle
- Added rendering for mermaid math blocks

## 0.1.5
- Added wiki link support, including link parsing, local file presense detection, and navigation for `[[...]]` references.
- Added local image source resolution so workspace-relative image paths render correctly in the editor.

## 0.1.4
- Added image insertion and rendering functionality in the editor.

## 0.1.3
- Added support for different list indentations.
- Added frontmatter support with enhanced styling for the editor.
- Added git associations resolver for native source control file loading.
- Improved editor loading time and performance.

## 0.1.2
- Added full find/replace support in the editor, including next/previous navigation, replace current, and replace all.

## 0.1.1
- Improved list handling, including consistent two-space indentation for nested lists.
- Applied packaging and documentation fixes (`package.json`, ignore files, and README updates).

## 0.1.0
- Initial build of the Markdown Editor Optimized (MEO) VSCode extension.
