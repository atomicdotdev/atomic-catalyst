# Atomic Sherpa

Connect **intent to source code** in VS Code-compatible editors: edit Atomic intent tickets, review source changes and history, manage **Draft and Shared views**, and explore the **blast radius** of code changes through file, caller, and importer relationships.

The intent editor is built on the MIT-licensed [Markdown Editor Optimized (MEO)](https://github.com/vadimmelnicuk/meo) foundation.

This is an **extension**, not a Markdown Preview plugin. It edits existing intent Markdown files and provides an Atomic version control panel through the in-process `nodeatomic` consumer. Intent validation and attestation are not performed by the editor.

## Install in your existing editor

Local packages are written to `releases/`. Use the version confirmed by the build and verification output; a source version bump alone does not update the installed extension.

**Atomic prerequisite:** Atomic features require a compatible complete Atomic installation on the **extension host**, including its CLI, platform library, and `libatomic-runtime.json`. This is a universal JavaScript-only VSIX, not a bundled native runtime. Install the complete release archive into a versioned directory and put it on PATH, or set an absolute `ATOMIC_RUNTIME_DIR` before launching the editor. Older CLI-only installations are insufficient. For Remote SSH/WSL/containers, install Atomic remotely. Fully restart the editor after environment/runtime changes. Intent/Markdown editing does not require loading the native runtime.

1. In VS Code, VSCodium, Catalyst, or another compatible editor, open the Command Palette.
2. Run **Extensions: Install from VSIX…** and select that file.
3. Reload the editor window if prompted.
4. Open a vault `intent.md` or `*.intent.md` file. These filenames now default to **Atomic Intent Ticket**.
5. If a file is already open in a text editor or Markdown Preview, close that preview and use **Reopen Editor With… → Atomic Intent Ticket** (or **Atomic Sherpa Intent Editor**). You can also run **Atomic: Open Intent as Ticket**.

**Do not choose Markdown Preview.** It is the editor's generic read-only Markdown renderer and cannot display Atomic ticket fields.

The extension package is `atomic-sherpa` (extension ID `atomicdotdev.atomic-sherpa`) and requires VS Code API 1.97+. Editor command, setting, and custom-editor IDs retain `catalystIntent.*`; version control commands retain `catalystAtomic.*` for compatibility with existing configurations. These do not collide with the original MEO extension. Ordinary Markdown keeps its current editor unless you explicitly choose Atomic Sherpa Intent Editor.

## Ticket layout

- **Header:** project/intent breadcrumb, title, status badge, title editing, and Source access.
- **Main column:** rendered Description/Why, acceptance-criterion cards, task cards, file references, scope, and constraints.
- **Criterion links:** scroll to the linked card and highlight it for three seconds so the target is easy to find.
- **Sidebar:** status and priority controls, project, author, view, dates, and a collapsed technical-metadata section.
- **Evidence:** expandable verification information with fields for verifier and evidence.
- **Prose editing:** Edit opens a CodeMirror Markdown field; Save changes only that section. Cancel leaves the source untouched.
- **Ticket / Source switch:** YAML and directive delimiters are hidden in Ticket mode and available in Source mode.

Recognized intents require YAML `entry_type: intent`. Metadata that is managed by the CLI, including hashes, IDs, authorship and timestamps, is displayed but not automatically rewritten. Unrecognized source is preserved and accessible in Source mode.

Status suggestions are editing conveniences, not a schema. Setting a criterion to `met` does not manufacture evidence or establish conformance. The validation/attestation panel explicitly says **not checked**: no signature or SHACL result is inferred from author fields or hashes.

## Atomic version control

Open a **trusted, local filesystem** workspace in an Atomic repository, then open **Source Control**:

- **Atomic: <repository>** shows tracked changes and untracked files separately, alongside any Git provider. Workspace folders inside a repository are supported; multiple repositories get separate providers.
- Click a **Tracked Changes** file to open VS Code's native diff editor: the recorded view baseline on the left and the live working file (including its editor buffer) on the right. Adds use an empty recorded side; deletions use an empty working side. Untracked files still open normally. Opening a diff never restores or writes files.
- Use **+ / Atomic: Add File** on an untracked file to track it. This is not Git staging; there is no invented staging/index layer.
- Enter a message and choose **✓ / Atomic: Record Tracked Changes** (or accept the input box). This records the displayed tracked paths, not untracked files, using the displayed status's concurrency fence. Save or close unsaved repository documents first. Backend fence failures are surfaced, not retried automatically.
- **Atomic History & Views** lists typed **Draft / Shared** views. Expand a view to see its change hashes, then click a hash to inspect the change without switching the working copy. **Load more changes…** pages through that view's history.
- Right-click a repository in that panel for **Create View**, **Switch View**, or **Delete View**. New views derive from the displayed current view. Deletion requires confirmation and excludes the current view. Switching never bypasses Atomic's dirty-working-copy check and also refuses unsaved editor documents.
- Filesystem events trigger debounced refreshes; **Atomic: Refresh Version Control** retries discovery and reloads state. Errors are available in the **Atomic Version Control** output channel.

### Change detail

Expand a view in the left **Views** tree and click a change hash. Hashes use Atomic's CLI-compatible Base32 encoding; full hashes are available in the tooltip and detail page. Inspection never switches the working copy. The webview follows the native `atomic change` report: continuous monospace text, change metadata/files, **Attestation**, then **Change Ledger**, rather than dashboard cards.

- **Lazy navigation:** expanding a view requests 30 history rows with `allViews=false`. Only clicking a hash loads its change details and explicitly linked intents, including for Shared views. There is no bulk change hydration or aggregate dashboard.
- **Plan ID and intent associations:** the report shows the native API's governing `planId` and its recorded graph/turn source, plus separately labeled intent documents edited by the change. Atomic resolves change-local declarations and current UID/human-key aliases; the webview does not guess governance from filenames, commands or a shared session. Older records with no `plan_id` can still show their associated intent and causal edit evidence without a false “requirement failed” warning. Ambiguous references and partial lookup remain explicit. Current title/Why/source controls are under **Plan, intent & verification notes**; neither a historical intent snapshot nor SHACL/signature/repository-wide 1:1 verification is implied.
- **Recorded attribution:** decoded GetChange metadata supplies vendor/model/tool, input/output/cache/reasoning/reported-total tokens and exact micro-USD cost for the selected change. No model prices are estimated. Conflicting request records are excluded with a warning; missing values remain unknown. These are recorded values, not an independently verified invoice.
- **Native graph and file summaries:** `GetChange.metadata.graphSummary` supplies added vertex spans, changed edge maps, uncompressed content bytes, changed-file count, and each path's native symbol/hunk description. The CLI and libatomic share the same Rust counting and per-path aggregation helpers. No provenance counts, reconstructed diffs or bundle-size estimates are substituted. Older addons show a compatibility notice and known affected paths, not invented zero counts. Tool-read paths are not treated as changed files.
- **Historical file diffs:** click an eligible filename in the change report or a directly edited blast-radius file to open `vscode.diff` beside the report. Both sides are immutable, read-only snapshots of that selected change's before/after content—not the working-copy file—and already-open diffs survive navigation. Indirect caller/importer files are not offered a fabricated change diff. Snapshot contents stay in the extension host, with an 8 MiB UTF-8 text limit per revision and bounded 32 MiB caches. Binary, directory, missing and unsupported revisions are not silently rendered as empty files.
- **Blast radius:** the selected-change panel follows Noname's module × hop heatmap: pink direct-file cells, hop-2 caller/importer cells, total bars, a proximity legend and clickable file drill-down. **Open in change graph →** opens the same change's direct edits and structural links, not repository-wide history. Hop counts deduplicate paths; no co-change inference, hash-jitter impact percentages or score-based hiding of callers is used. Graph drawing is capped at 100 files with a visible note; the matrix/drill-down retains all returned files.
- **Structural coverage:** opt-in native `GetChange.blastRadius` compares recorded before/after sources, including deleted code, and follows incoming current-KG `CALLS`/`INCLUDES`. It does not read unsaved/working-copy sources or automatically enrich the KG. This is a **current repository KG observation, not a historical or view-isolated dependency snapshot**. Unsupported languages, missing content/definitions and bounded analysis are marked partial. An absent result is marked unavailable, never mislabeled a private change or zero impact. See **Analysis coverage** for details.
- **Recorded actions:** the full bounded ledger stays in recorded order with original kind names and visible command/path previews. Relationship, duration and raw payload details are secondary under **Recorded ledger metadata**; actions are not paged or hidden behind individual disclosures.
- **Attestation evidence:** historical signature validity, source freshness, unknown signer trust and editor-buffer comparison remain separate from link checks and SHACL validation.
- **Metadata boundary:** libatomic projects safe fields from the canonical Rust-loaded change and retains the V3 bundle. nodeatomic generates the updated types from that addon's descriptor. Atomic Sherpa validates the metadata's schema and change hash and sends decimal-string counters, not binary bundles, prompts or reasoning text, into the webview. Graph counters preserve uint64 precision; BigInt arithmetic preserves token and currency precision.
- **Exact signed document:** opens the backend's exact stored signed JSON-LD in a frozen, script-free viewer, never mutable editor text. Already-open snapshots remain unchanged by later navigation or refresh.

All detail reads use the packaged in-process consumer. Webview actions and intent source paths are allowlisted, and later navigation/refresh fences stale results. No CLI subprocess, private-key access, direct database parsing, automatic repair or filesystem fallback is used for evidence reads. Ticket attestation badges remain separate work.

The native-field development path is **Atomic/libatomic → nodeatomic → Atomic Sherpa**: add the decoded projection in the producer, explicitly build/install its addon in nodeatomic, regenerate nodeatomic's codecs/types from the embedded descriptor, then rebuild Atomic Sherpa's consumer/runtime. Missing fields should be exposed along that chain, not decoded from the V3 bundle in JavaScript. Consumer build scripts do not compile or discover the producer. Restart the development extension host after updating its native runtime.

### “Repository upgrade required” on an existing repository

A `.atomic/atomic.redb` file can exist but use an older schema than the packaged native addon. If **Atomic Version Control** output reports `PATH_CLAIMS migration required`, the repository was discovered correctly; the backend is refusing legacy-schema reads.

Back up the repository (including `.atomic` and its change store), stop other Atomic operations, and use a compatible current Atomic CLI to run this **inside each affected repository**:

```sh
atomic doctor repair-native-indexes
```

This explicitly writes/rebuilds derived database indexes from repository authority. If it refuses, preserve the full error and resolve the reported authority problem rather than deleting the database or reinitializing the repository. Once it succeeds, run **Atomic: Refresh Version Control**. The extension does not run migrations or repairs automatically. Click the panel's warning or recovery item to open the exact per-repository error and guidance.

All repository calls run in the extension host through `nodeatomic` → the separately installed Node-enabled `libatomic.dylib`, `libatomic.so`, or `libatomic.dll`. nodeatomic selects the host OS/CPU, validates release metadata/checksums and its exact generated protobuf descriptor, then loads the library in-process. It follows the active Atomic executable on PATH (including executable symlinks), or explicit `ATOMIC_RUNTIME_DIR`, `LIBATOMIC_ADDON`, or `ATOMIC_BIN` configuration. Do not set `ATOMIC_RUNTIME_DIR` together with `LIBATOMIC_ADDON`; paths must be absolute. Automatic discovery excludes empty/relative PATH entries and the current working directory. Use a trusted installation PATH, not workspace-controlled executables.

There is no daemon startup, CLI subprocess for repository operations, socket, direct database access, or webview native access. Missing/incompatible runtimes fail with installation/recovery guidance, not an automatic download, compiler invocation, schema repair, or fallback to another installation. Native editor diffs use read-only backend content; no repository initialization, untracking, restore mutation, pull/push, signing, or attestation creation is added by this panel. The existing Git-specific editor gutter/blame features remain Git-specific.

## Develop and package

Build requirements: Node.js 22+/npm (for VSCE 4), Bun, a VS Code-compatible editor, and a **previously built universal nodeatomic JavaScript consumer**. The current development dependency is `file:../nodeatomic`; build that project independently using its README first. Its compiled codecs/fingerprint are bundled, so the resulting VSIX does not need that checkout. Atomic Sherpa never builds Rust or searches for Atomic producer sources. Building/packaging does not require a native library unless an explicit runtime override requests the native smoke.

```sh
npm ci
npm test
npm run typecheck
# Optional integration smoke: Atomic CLI is used only to create a temporary fixture.
# Requires a complete installed runtime on PATH or an explicit ATOMIC_RUNTIME_DIR.
npm run test:atomic:native
# Native dispatch without creating a repository (also supports PATH discovery).
npm run test:atomic:runtime
# Optional view-tree host-module and built overview browser checks (requires Chrome/Edge).
npm run test:atomic:graph
npm run package:vsix
# Recheck an existing archive (defaults to the current manifest's release filename).
npm run verify:vsix
```

The extension build bundles only JavaScript/protobuf dependencies as `dist/nodeatomic/index.mjs`. It checks lazy import, codec access and missing-runtime rejection in **Node**, not Bun. With an explicit runtime override it additionally checks actual native dispatch; an import alone is not evidence that a library loaded. The default build does not copy, remove or overwrite native libraries. `.vscodeignore` excludes legacy `dist/native/**` and native filenames even if old build artifacts remain on disk.

`package:vsix` deliberately sets no platform target. It validates the generated archive's identity/version, rejects platform-targeted manifests and native payloads, and runs the exact archived consumer from an isolated temporary directory without `node_modules`. Native dispatch is also checked when a runtime override is present. This guards against accidental sibling-checkout dependencies and stale native assets. `verify:vsix` accepts an archive path as an optional argument. Neither command publishes to the Marketplace.

**Universal packaging is not a claim of tested support on every host.** The external producer currently supplies macOS ARM64, Linux x64 glibc, and Windows x64 runtimes. Validate the same VSIX inside the actual VS Code/Electron extension host on each platform before claiming compatibility. Node-only integration tests do not establish Electron compatibility. Remote hosts need their own matching runtime. Browser preview does not exercise this panel. External Atomic installers and self-update must preserve the complete CLI/library pair; this extension does not implement those installation paths.

Alternatively, open this repository in VS Code and press **F5** to launch its Extension Development Host. Open `examples/catalyst.intent.md` there as **Atomic Intent Ticket**.

For a browser-only demo after building, run `npm run preview` and open `http://127.0.0.1:4173`. The demo uses the same built webview, but changes stay in memory. It does **not** install the extension or test VS Code file saving, host navigation, or CLI integration.

With the preview running and Chrome/Edge installed, `npm run test:browser` runs the browser smoke check. `CHROME_PATH` can select an executable; `SCREENSHOT_PATH` optionally saves a screenshot.

## Preservation and safety

The presentation parser never serializes the whole Markdown or YAML document. Field edits preserve unrelated text, unknown attributes, evidence, quotation style, and comments. Conflicting external source changes keep the active draft and block Save rather than overwriting the changed file. Unsafe prose that would prematurely close a directive is rejected.

Atomic CLI generation, JSON-LD lifting, SHACL validation, signing, and verification are not reimplemented. The version control panel and evidence inspector use the backend consumers; CLI-based intent workflows, signing, and ticket attestation badges remain separate work.

Full VS Code save/recovery and external CLI synchronization testing is still required. CodeMirror normalizes line endings internally, so exact CRLF round trips through the entire editor are not yet guaranteed, although targeted edit helpers preserve CRLF.

**Local development build, not production-ready:** the inherited dependency tree reports 22 advisories, including one critical. Review `npm audit` and harden dependencies before distribution. `catalyst-local` is a local publisher placeholder, not a registered Marketplace identity.

Upstream revision and attribution are documented in `docs/UPSTREAM.md`; the upstream README is retained in `docs/MEO-README.md`. The original MIT `LICENSE` is retained unchanged.
