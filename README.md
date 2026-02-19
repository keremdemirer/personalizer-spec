# personalizer

TypeScript pnpm monorepo for a client-side product personalization SDK built around Web Components.

## Packages

- `packages/spec`
  - Copy of versioned specs and examples (Design v1, Effects v1, Geometry v1)
- `packages/core`
  - Strict zod-based validation, ref/link checks, binding resolution, canonical JSON, renderKey, and compile API
- `packages/renderer-canvas`
  - Canvas2D scene preview renderer with `renderToCanvas` and `renderToBlob`
- `packages/elements`
  - `<personalizer-editor>` Custom Element implemented in vanilla TypeScript
- `packages/shared-test-vectors`
  - Shared fixtures and expected normalization/hash outputs
- `examples/vanilla`
  - Vite demo app that mounts `<personalizer-editor>` and exports PNG

## What Works Now

- Spec-aligned types and strict checks:
  - `opacity` range `0-100`
  - color formats `#RRGGBB` and `#RRGGBBAA`
  - rect unit `px | pct`
  - effect step field `operation` with `core.*` namespace
  - effect refs only via `{ "$ref": "effect:<chainId>" }`
  - design/effects `templateId` and `templateVersion` linking
- Ref validation:
  - missing `node:<id>` refs fail
  - missing `effect:<chainId>` refs fail
- Binding resolution:
  - supports `{$bind}`, `{$bindAsset}`, `{$bindColor}`
  - deterministic normalization: trim spaces/tabs, NFC, CRLF to LF
- Deterministic renderKey:
  - SHA-256 hex over canonical sorted JSON using
    - `templateId`
    - `templateVersion`
    - `sceneId`
    - resolved inputs
    - asset content hashes (passed in)
- Canvas renderer v0:
  - node types: `container`, `image`, `text`, `fill`
  - render order: `background`, `overlay`, `design`, `designOverlay`
  - `px` and `pct` layout
  - anchor placement
  - opacity and `Normal` blend mode
- Web Component:
  - `<personalizer-editor></personalizer-editor>`
  - properties: `designTemplate`, `effectsTemplate`, `inputs`, `assets`, `scene`
  - methods: `validate`, `getResolvedModel`, `exportPreview`, `getOrderPayload`
  - events: `personalizer:change`, `personalizer:preview`
  - minimal UI: preview canvas, generated binding form, upload slots

## What Is Stubbed

- Blend modes other than `Normal` are currently mapped to `source-over`
- Effects execution pipeline is not implemented yet
- Advanced text layout/alignment and shape rendering are not implemented
- Full editor UX and schema-driven field typing are minimal in v0

## Install And Test

```bash
pnpm install
pnpm -r test
pnpm -r build
```

## Web Component Embed

After building `@personalizer/elements`, load one module script and use the custom element.

```html
<script type="module" src="/node_modules/@personalizer/elements/dist/personalizer-editor.js"></script>
<personalizer-editor id="editor"></personalizer-editor>
```

Then set templates and inputs from JavaScript:

```js
const editor = document.getElementById("editor");
editor.designTemplate = designTemplate;
editor.effectsTemplate = effectsTemplate;
editor.inputs = { name: "Kero" };
editor.assets = { uploads: {}, contentHashes: {} };
```

## Run Example

```bash
pnpm -C examples/vanilla dev
```

Open the local Vite URL. The page loads minimal templates, updates preview live, and supports PNG export.
