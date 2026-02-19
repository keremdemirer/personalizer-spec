import { z } from "zod";

export const semverRegex =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
export const colorRegex = /^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
export const nodeRefRegex = /^node:[^:]+$/;
export const effectRefRegex = /^effect:[^:]+$/;

export const bindSchema = z.object({ $bind: z.string().min(1) }).strict();
export const bindAssetSchema = z
  .object({ $bindAsset: z.string().min(1) })
  .strict();
export const bindColorSchema = z
  .object({ $bindColor: z.string().min(1) })
  .strict();

export const nodeRefSchema = z
  .object({ $ref: z.string().regex(nodeRefRegex, "Expected node:<id>") })
  .strict();

export const effectRefSchema = z
  .object({ $ref: z.string().regex(effectRefRegex, "Expected effect:<id>") })
  .strict();

export const unitSchema = z.enum(["px", "pct"]);
export const colorSchema = z.string().regex(colorRegex, "Invalid color hex format");

export const rectSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    unit: unitSchema
  })
  .strict();

export const pointSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    unit: unitSchema
  })
  .strict();

export const transformSchema = z
  .object({
    translate: pointSchema.optional(),
    scale: z
      .object({
        x: z.number(),
        y: z.number()
      })
      .strict()
      .optional(),
    rotate: z.number().optional(),
    freeTransform: z.record(z.unknown()).optional()
  })
  .strict();

const makeNodeSchema = (options: {
  assetRefSchema: z.ZodTypeAny;
  textBodySchema: z.ZodTypeAny;
  colorValueSchema: z.ZodTypeAny;
  backgroundColorSchema: z.ZodTypeAny;
}) => {
  const baseNodeSchema = z
    .object({
      id: z.string().min(1),
      rect: rectSchema,
      anchor: z.string().min(1).optional(),
      opacity: z.number().min(0).max(100).optional(),
      blendMode: z.string().min(1).optional(),
      backgroundColor: options.backgroundColorSchema.optional(),
      transform: transformSchema.optional(),
      locks: z
        .object({
          locked: z.boolean().optional(),
          gravityLocked: z.boolean().optional(),
          rotateLocked: z.boolean().optional()
        })
        .strict()
        .optional(),
      effects: effectRefSchema.optional()
    })
    .strict();

  const containerNodeSchema = baseNodeSchema
    .extend({
      type: z.literal("container"),
      children: z.array(nodeRefSchema),
      clipToBounds: z.boolean().optional()
    })
    .strict();

  const imageNodeSchema = baseNodeSchema
    .extend({
      type: z.literal("image"),
      image: z
        .object({
          assetRef: options.assetRefSchema
        })
        .strict()
    })
    .strict();

  const textNodeSchema = baseNodeSchema
    .extend({
      type: z.literal("text"),
      text: z
        .object({
          body: options.textBodySchema,
          fontRef: z.string().min(1),
          size: z.number(),
          color: options.colorValueSchema,
          stroke: z.record(z.unknown()).optional(),
          shadow: z.record(z.unknown()).optional(),
          align: z.string().optional(),
          maxLength: z.number().optional(),
          autoFit: z.boolean().optional()
        })
        .strict()
    })
    .strict();

  const fillNodeSchema = baseNodeSchema
    .extend({
      type: z.literal("fill"),
      fill: z.record(z.unknown()).optional()
    })
    .strict();

  const shapeNodeSchema = baseNodeSchema
    .extend({
      type: z.literal("shape"),
      shape: z.record(z.unknown()).optional()
    })
    .strict();

  return z.discriminatedUnion("type", [
    containerNodeSchema,
    imageNodeSchema,
    textNodeSchema,
    fillNodeSchema,
    shapeNodeSchema
  ]);
};

const designNodeSchema = makeNodeSchema({
  assetRefSchema: z.union([z.string().min(1), bindAssetSchema]),
  textBodySchema: z.union([z.string(), bindSchema]),
  colorValueSchema: z.union([colorSchema, bindColorSchema]),
  backgroundColorSchema: z.union([colorSchema, bindColorSchema])
});

const resolvedDesignNodeSchema = makeNodeSchema({
  assetRefSchema: z.string().min(1),
  textBodySchema: z.string(),
  colorValueSchema: colorSchema,
  backgroundColorSchema: colorSchema
});

const designAssetsSchema = z
  .object({
    fonts: z
      .array(
        z
          .object({
            id: z.string().min(1),
            src: z.string().min(1),
            metadata: z.record(z.unknown()).optional()
          })
          .strict()
      )
      .optional(),
    images: z
      .array(
        z
          .object({
            id: z.string().min(1),
            src: z.string().min(1),
            metadata: z.record(z.unknown()).optional()
          })
          .strict()
      )
      .optional()
  })
  .strict();

const designSceneSchema = z
  .object({
    sceneId: z.string().min(1),
    group: z.string().min(1),
    canvas: z
      .object({
        size: z
          .object({
            w: z.number(),
            h: z.number(),
            unit: unitSchema
          })
          .strict(),
        dpi: z.number().optional()
      })
      .strict(),
    background: z.array(nodeRefSchema),
    overlay: z.array(nodeRefSchema),
    design: nodeRefSchema,
    designOverlay: z.array(nodeRefSchema)
  })
  .strict();

export const designTemplateSchema = z
  .object({
    spec: z.literal("personalizer.design.v1"),
    templateId: z.string().min(1),
    templateVersion: z.string().regex(semverRegex, "Invalid semver"),
    assets: designAssetsSchema.optional(),
    scenes: z.array(designSceneSchema).min(1),
    nodes: z.record(z.string().min(1), designNodeSchema)
  })
  .strict();

export const resolvedDesignTemplateSchema = z
  .object({
    spec: z.literal("personalizer.design.v1"),
    templateId: z.string().min(1),
    templateVersion: z.string().regex(semverRegex, "Invalid semver"),
    assets: designAssetsSchema.optional(),
    scenes: z.array(designSceneSchema).min(1),
    nodes: z.record(z.string().min(1), resolvedDesignNodeSchema)
  })
  .strict();

export const effectStepSchema = z
  .object({
    operation: z
      .string()
      .regex(/^core\.[A-Za-z0-9_.-]+$/, "Operation must use the core.* namespace"),
    params: z.record(z.unknown()),
    enabled: z.boolean().optional(),
    opacity: z.number().min(0).max(100).optional(),
    ui: z
      .object({
        label: z.string().optional(),
        controlType: z.string().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        group: z.string().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const effectsTemplateSchema = z
  .object({
    spec: z.literal("personalizer.effects.v1"),
    templateId: z.string().min(1),
    templateVersion: z.string().regex(semverRegex, "Invalid semver"),
    chains: z.array(
      z
        .object({
          chainId: z.string().min(1),
          name: z.string().optional(),
          steps: z.array(effectStepSchema)
        })
        .strict()
    )
  })
  .strict();

export type Bind = z.infer<typeof bindSchema>;
export type BindAsset = z.infer<typeof bindAssetSchema>;
export type BindColor = z.infer<typeof bindColorSchema>;
export type NodeRef = z.infer<typeof nodeRefSchema>;
export type EffectRef = z.infer<typeof effectRefSchema>;

export type DesignTemplate = z.infer<typeof designTemplateSchema>;
export type ResolvedDesignTemplate = z.infer<typeof resolvedDesignTemplateSchema>;
export type EffectsTemplate = z.infer<typeof effectsTemplateSchema>;

export type DesignNode = DesignTemplate["nodes"][string];
