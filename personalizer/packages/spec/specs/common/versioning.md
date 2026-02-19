# Versioning

- Spec versions are expressed by path: `.../v1/...`
- Templates use semver: `templateVersion` (e.g. `1.2.0`)

## Breaking changes
- Introduce a new major spec folder: `v2`

## Backward-compatible changes
- Add new optional fields
- Add new `core.*` operations (renderers must update allowlists to support them)
