# Linking Design and Effects

Design and Effects specs are linked by template identity and chain references.

## Identity
- `design.templateId` MUST equal `effects.templateId`
- `design.templateVersion` MUST equal `effects.templateVersion`

## References
- `node.effects` uses: `{ "$ref": "effect:<chainId>" }`
- `effects.chains[].chainId` MUST contain the referenced `chainId`.

## Missing references
- Preview targets: implementation-defined (skip or fail)
- Print targets: SHOULD fail (recommended)
