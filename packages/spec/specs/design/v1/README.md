# Design Spec v1

Defines scene composition and node layout.

## Template root
Required:
- `spec`: `"personalizer.design.v1"`
- `templateId`: string
- `templateVersion`: semver string
- `scenes`: Scene[]
- `nodes`: map of `id -> Node`

Recommended:
- `assets`: references (fonts/images)

## Assets (recommended)
- `fonts[]`: `{ id, src, metadata? }`
- `images[]`: `{ id, src, metadata? }`

## Scene
Required:
- `sceneId`: string
- `group`: string
- `canvas`: `{ size: { w, h, unit }, dpi?: number }`
- `background`: NodeRef[]
- `overlay`: NodeRef[]
- `design`: NodeRef
- `designOverlay`: NodeRef[]

### group
`group` is a free-form string. Recommended values:
- `Thumb` - listing cards / thumbnails
- `PDP` - product detail page
- `Cart` - cart / checkout preview
- `Order` - order summary / email preview
- `Print` - print-ready render target

You may define additional groups (e.g., `MockupFront`, `MockupBack`, `Packshot`, `AdsMeta`, `AdsGoogle`).

## NodeRef
- `{ "$ref": "node:<id>" }`

## Node (common fields)
Required:
- `id`: string (matches the `nodes` map key)
- `type`: `container | image | text | fill | shape`
- `rect`: Geometry Rect

Optional:
- `anchor`: Geometry Anchor (default `Center`)
- `opacity`: number 0-100 (default 100)
- `blendMode`: Geometry BlendMode (default `Normal`)
- `backgroundColor`: Geometry Color
- `transform`: Geometry Transform
- `locks`:
  - `locked` (default false)
  - `gravityLocked` (default false)
  - `rotateLocked` (default false)
- `effects`: EffectRef (see below)

### EffectRef (only supported format in v1)
- `{ "$ref": "effect:<chainId>" }`

Inline effect chains are not supported in v1.

## Container node
- `children`: NodeRef[]
Optional:
- `clipToBounds`: boolean (default false)

## Image node
- `image.assetRef`: string OR `{ "$bindAsset": "uploads.<path>" }`
Optional (v2 candidate):
- `fit` (cover/contain), crop controls

## Text node
- `text.body`: string OR `{ "$bind": "inputs.<path>" }`
- `text.fontRef`: string (assets.fonts id)
- `text.size`: number
- `text.color`: Color
Optional:
- `stroke`, `shadow`, `align`, `maxLength`, `autoFit`

## Render order
1) `background` (in list order)
2) `overlay` (in list order)
3) `design` (single node, uses its children order)
4) `designOverlay` (in list order)
