# Graph webview third-party notices

## Atomic query graph adaptation

The retained legacy canvas viewer source and visual styling were adapted from `emit_html` in Atomic's
`atomic-cli/src/commands/query/mod.rs`.

Copyright 2025-2026 Atomic Software, Co.

Atomic is licensed under Apache-2.0; see `THIRD_PARTY_APACHE_LICENSE.txt`.
This adaptation uses local TypeScript/D3 modules, a webview-scoped canvas,
bounded initial fit, safe text tooltips, directed dependency arrows, keyboard
selection, lifecycle cleanup, and click-to-inspector actions. It does not embed
the CLI's generated HTML or load its CDN script.

## D3 modules

The legacy graph source uses d3-force, d3-selection, d3-drag, d3-zoom, and their D3
dependencies (d3-quadtree, d3-dispatch, d3-timer, d3-transition, d3-interpolate,
d3-color, and d3-ease) under the following ISC license. The active draft overview
does not load this canvas renderer.

Copyright 2010-2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
