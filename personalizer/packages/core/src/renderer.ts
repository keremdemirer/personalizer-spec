import { computeRenderKey } from "./render-key.ts";
import type {
  DesignTemplate,
  EffectsTemplate,
  RenderPlan,
  RendererAssets,
  RenderOutputs,
  RenderTarget,
  RendererContract,
} from "./types.ts";
import { validateTemplates } from "./validate.ts";

export function compile(
  designTemplate: DesignTemplate,
  effectsTemplate: EffectsTemplate,
  resolvedInputs: Record<string, unknown>,
  assets: RendererAssets,
): RenderPlan {
  const validation = validateTemplates(designTemplate, effectsTemplate);
  if (!validation.ok) {
    const message = validation.errors
      .map((error) => `- ${error.path}: ${error.message}`)
      .join("\n");
    throw new Error(`Cannot compile invalid templates:\n${message}`);
  }

  const sceneId = designTemplate.scenes[0]?.sceneId;
  if (!sceneId) {
    throw new Error("Cannot compile without at least one scene");
  }

  return {
    templateId: designTemplate.templateId,
    templateVersion: designTemplate.templateVersion,
    sceneId,
    resolvedInputs,
    assetContentHashes: assets.assetContentHashes,
    renderKey: computeRenderKey({
      templateId: designTemplate.templateId,
      templateVersion: designTemplate.templateVersion,
      sceneId,
      resolvedInputs,
      assetContentHashes: assets.assetContentHashes,
    }),
  };
}

export class StubRenderer implements RendererContract {
  compile = compile;

  render(_renderPlan: RenderPlan, _target: RenderTarget): RenderOutputs {
    throw new Error("Render is not implemented in @personalizer/core. Use a renderer package.");
  }
}
