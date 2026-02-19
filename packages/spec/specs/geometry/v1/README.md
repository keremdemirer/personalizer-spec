# Geometry Spec v1

Foundational types shared by Design and Effects specs.

## unit
- `px`: pixel
- `pct`: percentage

## Color
- `#RRGGBB` or `#RRGGBBAA`
- Canonical form recommendation: uppercase hex

## Rect
Fields:
- `x, y, w, h`: number
- `unit`: `px | pct`

Semantics:
- `pct` is evaluated relative to the parent render box.
- `w=100, h=100, unit=pct` fills the parent box.

## Point / Size
- Point: `x, y, unit`
- Size: `w, h, unit`

## Anchor
Minimum recommended set:
- `TopLeft, Top, TopRight`
- `Left, Center, Right`
- `BottomLeft, Bottom, BottomRight`

## Transform
- `translate`: Point (optional)
- `scale`: `{ x, y }` (optional, default 1)
- `rotate`: degrees (optional, default 0)
- `freeTransform`: optional placeholder for advanced transforms (e.g., quad mapping)

## BlendMode
Minimum recommended set:
- `Normal`
- `Multiply`
- `Screen`
- `Overlay`
- `Darken`
- `Lighten`
