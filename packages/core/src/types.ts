export type Unit = "px" | "pct";

export type Anchor =
  | "TopLeft"
  | "Top"
  | "TopRight"
  | "Left"
  | "Center"
  | "Right"
  | "BottomLeft"
  | "Bottom"
  | "BottomRight";

export type BlendMode =
  | "Normal"
  | "Multiply"
  | "Screen"
  | "Overlay"
  | "Darken"
  | "Lighten";

export type SceneGroupRecommended = "Thumb" | "PDP" | "Cart" | "Order" | "Print";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  unit: Unit;
}

export interface Point {
  x: number;
  y: number;
  unit: Unit;
}

export interface Size {
  w: number;
  h: number;
  unit: Unit;
}

export interface Transform {
  translate?: Point;
  scale?: {
    x: number;
    y: number;
  };
  rotate?: number;
  freeTransform?: Record<string, unknown>;
}

export interface NodeRef {
  $ref: string;
}

export interface EffectRef {
  $ref: string;
}

export interface BindValue {
  $bind: string;
}

export interface BindAsset {
  $bindAsset: string;
}

export interface BindColor {
  $bindColor: string;
}

export interface AssetRef {
  id: string;
  src: string;
  metadata?: Record<string, unknown>;
}

export interface DesignAssets {
  fonts?: AssetRef[];
  images?: AssetRef[];
}

export interface Scene {
  sceneId: string;
  group: string;
  canvas: {
    size: Size;
    dpi?: number;
  };
  background: NodeRef[];
  overlay: NodeRef[];
  design: NodeRef;
  designOverlay: NodeRef[];
}

export interface BaseNode {
  id: string;
  type: "container" | "image" | "text" | "fill" | "shape";
  rect: Rect;
  anchor?: Anchor;
  opacity?: number;
  blendMode?: BlendMode;
  backgroundColor?: string | BindColor;
  transform?: Transform;
  locks?: {
    locked?: boolean;
    gravityLocked?: boolean;
    rotateLocked?: boolean;
  };
  effects?: EffectRef;
}

export interface ContainerNode extends BaseNode {
  type: "container";
  children: NodeRef[];
  clipToBounds?: boolean;
}

export interface ImageNode extends BaseNode {
  type: "image";
  image: {
    assetRef: string | BindAsset;
  };
}

export interface TextNode extends BaseNode {
  type: "text";
  text: {
    body: string | BindValue;
    fontRef: string;
    size: number;
    color: string | BindColor;
  };
}

export interface FillNode extends BaseNode {
  type: "fill";
}

export interface ShapeNode extends BaseNode {
  type: "shape";
}

export type Node = ContainerNode | ImageNode | TextNode | FillNode | ShapeNode;

export interface DesignTemplate {
  spec: "personalizer.design.v1";
  templateId: string;
  templateVersion: string;
  assets?: DesignAssets;
  scenes: Scene[];
  nodes: Record<string, Node>;
}

export interface EffectStep {
  operation: string;
  params: Record<string, unknown>;
  enabled?: boolean;
  opacity?: number;
  ui?: {
    label?: string;
    controlType?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    group?: string;
  };
}

export interface EffectChain {
  chainId: string;
  name?: string;
  steps: EffectStep[];
}

export interface EffectsTemplate {
  spec: "personalizer.effects.v1";
  templateId: string;
  templateVersion: string;
  chains: EffectChain[];
}

export interface ResolvedImageNode extends Omit<ImageNode, "image"> {
  image: {
    assetRef: string;
  };
}

export interface ResolvedTextNode extends Omit<TextNode, "text"> {
  text: {
    body: string;
    fontRef: string;
    size: number;
    color: string;
  };
}

export type ResolvedNode = ContainerNode | ResolvedImageNode | ResolvedTextNode | FillNode | ShapeNode;

export interface ResolvedDesignTemplate extends Omit<DesignTemplate, "nodes"> {
  nodes: Record<string, ResolvedNode>;
}

export interface RenderModel {
  templateId: string;
  templateVersion: string;
  sceneId: string;
  designTemplate: ResolvedDesignTemplate;
  effectsTemplate: EffectsTemplate;
  resolvedInputs: Record<string, unknown>;
  resolvedUploads: Record<string, unknown>;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: ValidationIssue[];
    };

export interface ValidatedTemplates {
  designTemplate: DesignTemplate;
  effectsTemplate: EffectsTemplate;
  nodeIndex: Record<string, Node>;
  effectChainIndex: Record<string, EffectChain>;
}

export interface RendererAssets {
  assetContentHashes: Record<string, string>;
}

export interface RenderPlan {
  templateId: string;
  templateVersion: string;
  sceneId: string;
  resolvedInputs: Record<string, unknown>;
  assetContentHashes: Record<string, string>;
  renderKey: string;
}

export interface RenderTarget {
  format: "png" | "bitmap";
  sceneId?: string;
  width?: number;
  height?: number;
}

export interface RenderOutputs {
  format: "png" | "bitmap";
  mimeType: string;
  bytes: Uint8Array;
  metadata?: Record<string, unknown>;
}

export interface RendererContract {
  compile(
    designTemplate: DesignTemplate,
    effectsTemplate: EffectsTemplate,
    resolvedInputs: Record<string, unknown>,
    assets: RendererAssets,
  ): RenderPlan;
  render(renderPlan: RenderPlan, target: RenderTarget): Promise<RenderOutputs> | RenderOutputs;
}
