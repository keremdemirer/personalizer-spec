import { z } from "zod";

export const SEMVER_REGEX =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export const COLOR_REGEX = /^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const unitSchema = z.enum(["px", "pct"]);

const pointSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    unit: unitSchema,
  })
  .strict();

const sizeSchema = z
  .object({
    w: z.number(),
    h: z.number(),
    unit: unitSchema,
  })
  .strict();

const rectSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    unit: unitSchema,
  })
  .strict();

const transformSchema = z
  .object({
    translate: pointSchema.optional(),
    scale: z
      .object({
        x: z.number(),
        y: z.number(),
      })
      .strict()
      .optional(),
    rotate: z.number().optional(),
    freeTransform: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const anchorSchema = z.enum([
  "TopLeft",
  "Top",
  "TopRight",
  "Left",
  "Center",
  "Right",
  "BottomLeft",
  "Bottom",
  "BottomRight",
]);

const blendModeSchema = z.enum(["Normal", "Multiply", "Screen", "Overlay", "Darken", "Lighten"]);

const nodeRefSchema = z
  .object({
    $ref: z.string().regex(/^node:[^\s]+$/, "NodeRef must be node:<id>"),
  })
  .strict();

const effectRefSchema = z
  .object({
    $ref: z.string().regex(/^effect:[^\s]+$/, "EffectRef must be effect:<id>"),
  })
  .strict();

const bindSchema = z
  .object({
    $bind: z.string().regex(/^inputs\..+$/, "$bind value must be inputs.<path>"),
  })
  .strict();

const bindAssetSchema = z
  .object({
    $bindAsset: z.string().regex(/^uploads\..+$/, "$bindAsset value must be uploads.<path>"),
  })
  .strict();

const bindColorSchema = z
  .object({
    $bindColor: z.string().regex(/^inputs\..+$/, "$bindColor value must be inputs.<path>"),
  })
  .strict();

const lockSchema = z
  .object({
    locked: z.boolean().optional(),
    gravityLocked: z.boolean().optional(),
    rotateLocked: z.boolean().optional(),
  })
  .strict();

const commonNodeFields = {
  id: z.string().min(1),
  rect: rectSchema,
  anchor: anchorSchema.optional(),
  opacity: z.number().min(0).max(100).optional(),
  blendMode: blendModeSchema.optional(),
  backgroundColor: z.union([z.string().regex(COLOR_REGEX), bindColorSchema]).optional(),
  transform: transformSchema.optional(),
  locks: lockSchema.optional(),
  effects: effectRefSchema.optional(),
};

const containerNodeSchema = z
  .object({
    ...commonNodeFields,
    type: z.literal("container"),
    children: z.array(nodeRefSchema),
    clipToBounds: z.boolean().optional(),
  })
  .strict();

const imageNodeSchema = z
  .object({
    ...commonNodeFields,
    type: z.literal("image"),
    image: z
      .object({
        assetRef: z.union([z.string().min(1), bindAssetSchema]),
      })
      .strict(),
  })
  .strict();

const textNodeSchema = z
  .object({
    ...commonNodeFields,
    type: z.literal("text"),
    text: z
      .object({
        body: z.union([z.string(), bindSchema]),
        fontRef: z.string().min(1),
        size: z.number(),
        color: z.union([z.string().regex(COLOR_REGEX), bindColorSchema]),
      })
      .strict(),
  })
  .strict();

const fillNodeSchema = z
  .object({
    ...commonNodeFields,
    type: z.literal("fill"),
  })
  .strict();

const shapeNodeSchema = z
  .object({
    ...commonNodeFields,
    type: z.literal("shape"),
  })
  .strict();

const nodeSchema = z.discriminatedUnion("type", [
  containerNodeSchema,
  imageNodeSchema,
  textNodeSchema,
  fillNodeSchema,
  shapeNodeSchema,
]);

const assetSchema = z
  .object({
    id: z.string().min(1),
    src: z.string().min(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const sceneSchema = z
  .object({
    sceneId: z.string().min(1),
    group: z.string().min(1),
    canvas: z
      .object({
        size: sizeSchema,
        dpi: z.number().optional(),
      })
      .strict(),
    background: z.array(nodeRefSchema),
    overlay: z.array(nodeRefSchema),
    design: nodeRefSchema,
    designOverlay: z.array(nodeRefSchema),
  })
  .strict();

export const designTemplateSchema = z
  .object({
    spec: z.literal("personalizer.design.v1"),
    templateId: z.string().min(1),
    templateVersion: z.string().regex(SEMVER_REGEX, "templateVersion must be semver"),
    assets: z
      .object({
        fonts: z.array(assetSchema).optional(),
        images: z.array(assetSchema).optional(),
      })
      .strict()
      .optional(),
    scenes: z.array(sceneSchema).min(1),
    nodes: z.record(z.string(), nodeSchema),
  })
  .strict();

const effectUiSchema = z
  .object({
    label: z.string().optional(),
    controlType: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    group: z.string().optional(),
  })
  .strict();

const effectStepSchema = z
  .object({
    operation: z.string().regex(/^core\./, "operation must use core.* namespace"),
    params: z.record(z.string(), z.unknown()),
    enabled: z.boolean().optional(),
    opacity: z.number().min(0).max(100).optional(),
    ui: effectUiSchema.optional(),
  })
  .strict();

const effectChainSchema = z
  .object({
    chainId: z.string().min(1),
    name: z.string().optional(),
    steps: z.array(effectStepSchema),
  })
  .strict();

export const effectsTemplateSchema = z
  .object({
    spec: z.literal("personalizer.effects.v1"),
    templateId: z.string().min(1),
    templateVersion: z.string().regex(SEMVER_REGEX, "templateVersion must be semver"),
    chains: z.array(effectChainSchema),
  })
  .strict();

export {
  nodeRefSchema,
  effectRefSchema,
  bindSchema,
  bindAssetSchema,
  bindColorSchema,
  nodeSchema,
  rectSchema,
  unitSchema,
};
