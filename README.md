# personalizer-spec

Versioned specifications for a product personalization system (Design + Effects + Geometry).

## Structure
- `specs/geometry/v1/` - foundational geometry types (rect, color, transform, units, etc.)
- `specs/design/v1/` - scenes and nodes (layout and composition)
- `specs/effects/v1/` - effect chains (operation + params), referenced from design nodes
- `specs/common/` - glossary, bindings, security, linking, versioning

These specs are intended to be renderer-agnostic:
- Client preview renderers (Canvas/SVG/WebGL)
- Server renderers (Headless Chromium, native render, etc.)
