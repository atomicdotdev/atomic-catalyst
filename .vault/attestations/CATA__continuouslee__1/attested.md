---
intentId: CATA::continuouslee::1
sourceContentHash: blake3:53b2a9821aec49a9f5e7794e606c97324626285a6659840e5104e4252394be99
entry_type: attestation
content_hash: BRMGIU4GKHECJ37QEGUBBLPEDAGUSERHHLLFJ5GKSDB7T5WQPW2A
created_at: 2026-10-12T18:19:52.267534+00:00
updated_at: 2026-10-12T18:19:52.267534+00:00
---
{
  "@context": "https://atomic.dev/ns/ctx.jsonld",
  "@id": "urn:atomic:intent:01M4RJ043MHF7FRHN69XXEJEWD",
  "@type": "Intent",
  "attributedTo": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q",
  "contentHash": "blake3:74a1cbf2a718362ead57f96496c1c2da566e40976057fe61f179cd5d9885060b",
  "createdAt": "",
  "hasAcceptanceCriterion": [
    {
      "@id": "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-1",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "npm test: 54 tests passed across 5 files; npm run typecheck passed; npm run build passed. npm run test:browser passed on installed Chrome: exact supplied LF fixture, targeted status edit, undo, Live/Source preservation, read-only protection, file-reference request and no page errors. MEO revision 8a60715abaec18935aaa80d71e4178f618285528 and MIT attribution documented. Full manual VS Code save/recovery and CLI integration not tested; 22 inherited dependency advisories remain release blockers.",
      "text": "The MIT-licensed MEO base is imported with attribution and upstream revision documented; an opt-in Atomic intent editor shows directive sections, enables targeted task/criterion status edits, and links file references. Automated preservation/parser tests, TypeScript checks, and the extension build pass. CLI-backed validation/signing are explicitly deferred, not reimplemented.",
      "verifiedBy": "Bun tests, TypeScript, build tooling and headless Chrome"
    },
    {
      "@id": "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-2",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "npm test: 64 tests passed, including ticket rendering, prose/title/evidence edits, source preservation, stale-draft conflict checks and read-only protection. npm run typecheck passed. npm run test:browser passed: Jira-style layout, hidden YAML/directives, exact LF fixture, targeted status/title edits, undo, ticket/source switching and no page errors. npm run package:vsix produced releases/catalyst-intent-editor-0.2.0.vsix; Python zip inspection confirmed isolated commands, scoped default ticket selectors, bundles/CSS and MIT license, with no vault/Atomic/node_modules data. Installation is user-directed; full VS Code host save/recovery and CLI integration remain untested. Inherited dependency advisories remain.",
      "text": "Intent Live mode is a Jira-style ticket: title/status header, description and task/criterion cards, metadata sidebar, hidden YAML/directives, source access, and source-preserving field/prose edits. A uniquely namespaced VSIX is packaged and verified with clear installation instructions; ticket rendering, editing, read-only behavior and preservation tests pass.",
      "verifiedBy": "Bun tests, TypeScript, headless Chrome and VSIX archive inspection"
    },
    {
      "@id": "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-3",
      "@type": "AcceptanceCriterion",
      "acStatus": "met",
      "evidence": "npm test: 67 tests passed, including correct target highlighting/focus, repeated navigation, previous-target clearing, timeout cleanup, reduced-motion scrolling and panel destruction. npm run typecheck passed. npm run test:browser passed, including criterion link highlight/focus with unchanged Markdown. npm run package:vsix built releases/catalyst-intent-editor-0.2.1.vsix.",
      "text": "Clicking a task's acceptance-criterion link scrolls to and visibly highlights the correct criterion card without changing Markdown. Repeated navigation resets the highlight and clears the previous target; the temporary highlight is cleaned up on timeout and panel destruction. Tests, TypeScript and an updated local VSIX pass.",
      "verifiedBy": "Bun UI tests, TypeScript and headless Chrome"
    }
  ],
  "hasConstraint": [
    {
      "@id": "urn:atomic:constraint:01m4rj043mhf7frhn69xxejewd-constraint-1",
      "@type": "Constraint",
      "text": "Preserve the upstream MIT license and attribution. Keep Markdown as the source of truth, preserve unrelated text and unknown attributes, do not edit CLI-managed metadata automatically, and respect existing files. Do not infer allowed statuses from a new schema: expose existing document values and the statuses shown in the supplied Atomic workflow as editing conveniences only."
    }
  ],
  "hasScopeIn": [
    {
      "@id": "urn:atomic:scope:01m4rj043mhf7frhn69xxejewd-scope-in-1",
      "@type": "ScopeItem",
      "text": "MEO source import, focused extension identity, Atomic intent detection and visual editing, preservation tests, example intent, and setup/provenance documentation. Follow-up review requires a Jira-style ticket layout with hidden syntax and an installable VSIX rather than a decorated Markdown preview."
    }
  ],
  "hasScopeOut": [
    {
      "@id": "urn:atomic:scope:01m4rj043mhf7frhn69xxejewd-scope-out-1",
      "@type": "ScopeItem",
      "text": "No separate SHACL engine, JSON-LD vocabulary, cryptography, CLI generation workflow, extension publication, wholesale removal of upstream features, or claim of completed manual VS Code testing."
    }
  ],
  "hasTask": [
    {
      "@id": "urn:atomic:task:01M4RJ043MHF7FRHN69XXEJEWD-1",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-1"
      ],
      "taskStatus": "done",
      "text": "Import and inspect MEO, add source-range-aware Atomic directive presentation and status editing, retain source editing and licenses, and test exact source preservation and build compatibility.",
      "touchesFile": [
        "package.json",
        "webview/src/liveMode.ts",
        "webview/src/helpers/atomicIntentDocument.ts",
        "webview/src/helpers/atomicIntent.ts",
        "scripts/atomicIntent.test.mjs",
        "scripts/atomicIntentView.test.mjs",
        "scripts/browserSmoke.mjs"
      ]
    },
    {
      "@id": "urn:atomic:task:01M4RJ043MHF7FRHN69XXEJEWD-2",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-2"
      ],
      "taskStatus": "done",
      "text": "Replace the decorated Markdown intent view with an editable ticket surface, isolate extension IDs, provide default opening for intent filenames without hijacking unrelated Markdown, and package a local VSIX.",
      "touchesFile": [
        "webview/src/helpers/atomicTicket.ts",
        "webview/src/helpers/atomicIntentDocument.ts",
        "package.json"
      ]
    },
    {
      "@id": "urn:atomic:task:01M4RJ043MHF7FRHN69XXEJEWD-3",
      "@type": "Task",
      "satisfies": [
        "urn:atomic:ac:01M4RJ043MHF7FRHN69XXEJEWD-ac-3"
      ],
      "taskStatus": "done",
      "text": "Add a visible navigation highlight, keyboard focus and reduced-motion-aware scrolling, test navigation and cleanup, and package the updated extension.",
      "touchesFile": [
        "webview/src/helpers/atomicTicket.ts",
        "webview/src/styles.css",
        "scripts/atomicIntentView.test.mjs"
      ]
    }
  ],
  "humanKey": "CATA::continuouslee::1",
  "priority": "medium",
  "proof": {
    "@type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "proofPurpose": "assertionMethod",
    "proofValue": "zviQHFLKcFYGMUWtTUKhswPpkZeKWU2HwhRaN99tsmsN4Xni6AaMvpaR6SwvqHrMf6tu9c19koSm8EiGqzkhYUkD",
    "verificationMethod": "did:atomic:U4NNGFTE7KZZKRML6TQDBJJMOMKDCEHZO64IKHGACVRYGZOQSH5Q#key-1"
  },
  "status": "in_progress",
  "title": "Prototype MEO-based Atomic intent editing",
  "view": "dev",
  "why": "The user selected MEO as the editing foundation for an Atomic intent extension. Reuse its source-first live editor to make directive-based intents easier to edit without duplicating Atomic CLI generation, validation, JSON-LD lifting, or signing."
}
