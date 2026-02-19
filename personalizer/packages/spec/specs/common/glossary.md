# Glossary

## Terms
- **Template**: A versioned definition containing one or more scenes.
- **Scene**: A single renderable composition (grouped by usage, e.g. Thumb, PDP, Print).
- **Node**: An element rendered inside a scene (container, image, text, etc.).
- **Rect**: A node's bounding box.
- **unit**:
  - `px`: pixel
  - `pct`: percentage relative to the parent render box
- **Anchor**: How a rect is positioned within the parent box.
- **EffectChain**: Ordered list of effect steps applied to a node.
- **operation**: A stable effect step identifier. v1 uses the `core.*` namespace.
- **Binding**: Resolves template fields from runtime inputs.
- **EffectRef**: A reference from a design node to an effects chain (by `chainId`).
