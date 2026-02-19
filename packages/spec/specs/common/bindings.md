# Bindings

A field can be either:
1) A literal value (string/number/bool/object), or
2) A binding object

## Binding objects
- `{ "$bind": "inputs.<path>" }` for general values (text/number/bool)
- `{ "$bindAsset": "uploads.<path>" }` for assets (image asset references)
- `{ "$bindColor": "inputs.<path>" }` optional, recommended for clarity

## Normalization (for determinism)
- Strings:
  - trim
  - Unicode normalize (NFC recommended)
  - normalize line endings (`\r\n` -> `\n`)
- Numbers:
  - use a standard decimal format
  - renderer MAY apply a fixed precision before hashing / rendering
