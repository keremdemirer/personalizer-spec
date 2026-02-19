# personalizer monorepo

This repository bootstraps the OSS developer library plus Pro renderer stubs for the v1 personalizer specs.

## Packages

- `@personalizer/spec`: versioned spec docs copied from `personalizer-spec`
- `@personalizer/core`: core TypeScript types, strict validation, reference checks, binding resolution, render key utilities, and CLI
- `@personalizer/react`: minimal React-facing wrapper utilities over core
- `@personalizer/renderer-client-canvas`: browser renderer contract stub
- `@personalizer/renderer-server-chromium`: server renderer contract stub
- `@personalizer/shared-test-vectors`: JSON fixtures and expected deterministic outputs

## Quick start

```bash
pnpm install
pnpm test
pnpm personalizer validate \
  --design packages/shared-test-vectors/fixtures/minimal-design.json \
  --effects packages/shared-test-vectors/fixtures/minimal-effects.json
pnpm personalizer resolve \
  --design packages/shared-test-vectors/fixtures/minimal-design.json \
  --effects packages/shared-test-vectors/fixtures/minimal-effects.json \
  --inputs packages/shared-test-vectors/fixtures/inputs-normalization.json
```

## What works now

- Design v1, Effects v1, Geometry v1 shape definitions in TypeScript
- Strict validator for required fields and semantic linking checks
- Binding resolver for `$bind`, `$bindAsset`, `$bindColor`
- String normalization for determinism (`CRLF -> LF`, trim spaces/tabs, NFC)
- Stable SHA-256 `renderKey` from canonical JSON
- CLI commands:
  - `pnpm personalizer validate --design <path> --effects <path>`
  - `pnpm personalizer resolve --design <path> --effects <path> --inputs <path>`

## Stubbed intentionally

- Full rendering logic and production UI editor
- Chromium orchestration and deployment concerns
- Asset binary hashing from file contents

## Next steps

1. Implement operation execution in renderer packages using an allowlist by target.
2. Expand scene-level compile planning and target-specific failure policy.
3. Add richer editor components in `@personalizer/react`.
4. Add cross-package integration tests for renderer contracts.
