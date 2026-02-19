# personalizer monorepo

This repository contains a minimal OSS scaffold for a personalization system based on the v1 specs (Design, Effects, Geometry), plus Pro-ready renderer stubs.

## What exists now

- `packages/spec`: versioned spec docs and examples copied from `personalizer-spec`
- `packages/core`: framework-agnostic types, strict validation, reference checks, binding resolver, renderer contract, and CLI
- `packages/react`: minimal React wrapper exports around core
- `packages/renderer-client-canvas`: client renderer stub with contract-compatible compile/render methods
- `packages/renderer-server-chromium`: server renderer stub for future headless Chromium implementation
- `packages/shared-test-vectors`: fixtures and deterministic expected outputs used by tests

## What is intentionally stubbed

- Full editor UI
- Actual bitmap rendering logic
- Headless Chromium rendering pipeline and infra
- Asset file hashing (only precomputed content hashes are accepted as input)

## Workspace setup

```bash
pnpm install
pnpm test
pnpm build
```

## CLI

Build first:

```bash
pnpm --filter @personalizer/core run build
```

Validate templates:

```bash
pnpm --filter @personalizer/core exec personalizer validate --design packages/shared-test-vectors/fixtures/minimal-design.json --effects packages/shared-test-vectors/fixtures/minimal-effects.json
```

Resolve bindings:

```bash
pnpm --filter @personalizer/core exec personalizer resolve --design packages/shared-test-vectors/fixtures/minimal-design.json --effects packages/shared-test-vectors/fixtures/minimal-effects.json --inputs packages/shared-test-vectors/fixtures/inputs-normalization.json
```

## Behavior implemented in core

- Strict schema checks for required fields and value constraints
- Opacity range checks (`0-100`) for nodes and effect steps
- Color format checks (`#RRGGBB` and `#RRGGBBAA`)
- Rect unit checks (`px | pct`)
- Effect operation namespace checks (`core.*`)
- Link checks between Design and Effects (`templateId`, `templateVersion`)
- NodeRef and EffectRef existence checks
- Binding resolution for `{$bind}`, `{$bindAsset}`, `{$bindColor}`
- Deterministic string normalization (`NFC`, CRLF to LF, trim spaces/tabs)
- Stable render key via canonical sorted JSON + SHA-256 hex

## Next steps

1. Expand node schema coverage for richer shape/fill/text options.
2. Implement real canvas renderer output bytes and pixel tests.
3. Implement Chromium renderer execution and operation allowlist policy.
4. Add compatibility tests against larger multi-scene template sets.
