# Effects Spec v1

Defines effect chains referenced by Design nodes.

## Template root
Required:
- `spec`: `"personalizer.effects.v1"`
- `templateId`: string (must match Design templateId)
- `templateVersion`: semver (must match Design templateVersion)
- `chains`: EffectChain[]

## EffectChain
- `chainId`: string (unique)
- `name`: string (optional)
- `steps`: EffectStep[]

## EffectStep
Required:
- `operation`: string (v1 uses `core.*` namespace)
- `params`: object (key-value)

Optional:
- `enabled`: boolean (default true)
- `opacity`: number 0-100 (default 100)
- `ui`: UIHint (editor hinting)

## UIHint (optional)
- `label`: string
- `controlType`: string (e.g., slider, color, dropdown, text, toggle, image)
- `min/max`: number
- `minLength/maxLength`: number
- `minLength/maxLength`: number
- `group`: string

## operation namespace
- All official v1 operations MUST begin with `core.`
Examples:
- `core.drawText`
- `core.dropShadow`
- `core.quadWarp`
- `core.freeTransform`

## Allowlist rule
Renderers MUST NOT execute operations outside their allowlist.
Print targets SHOULD hard-fail on unknown operations.
