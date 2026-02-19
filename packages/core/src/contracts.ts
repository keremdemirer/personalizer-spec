import type { EffectsTemplate, ResolvedDesignTemplate } from "./schemas.js";
import { computeRenderKey } from "./render-key.js";

export interface RenderPlanScene {
  sceneId: string;
  renderKey: string;
}

export interface RenderPlan {
  templateId: string;
  templateVersion: string;
  resolvedInputs: Record<string, unknown>;
  assetContentHashes: Record<string, string>;
  scenes: RenderPlanScene[];
}

export interface RenderTarget {
  sceneId: string;
  format: "png" | "bitmap";
}

export interface RenderOutput {
  sceneId: string;
  format: "png" | "bitmap";
  mimeType: string;
  bytes: Uint8Array;
}

export interface RenderOutputs {
  outputs: RenderOutput[];
}

export interface RendererContract {
  compile: (
    designTemplate: ResolvedDesignTemplate,
    effectsTemplate: EffectsTemplate,
    resolvedInputs: Record<string, unknown>,
    assets: Record<string, string>
  ) => RenderPlan;
  render: (
    renderPlan: RenderPlan,
    target: RenderTarget
  ) => Promise<RenderOutputs> | RenderOutputs;
}

export const compileRenderPlan: RendererContract["compile"] = (
  designTemplate,
  _effectsTemplate,
  resolvedInputs,
  assets
) => ({
  templateId: designTemplate.templateId,
  templateVersion: designTemplate.templateVersion,
  resolvedInputs,
  assetContentHashes: assets,
  scenes: designTemplate.scenes.map((scene) => ({
    sceneId: scene.sceneId,
    renderKey: computeRenderKey({
      templateId: designTemplate.templateId,
      templateVersion: designTemplate.templateVersion,
      sceneId: scene.sceneId,
      resolvedInputs,
      assetContentHashes: assets
    })
  }))
});
