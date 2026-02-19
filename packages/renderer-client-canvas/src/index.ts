import {
  compileRenderPlan,
  type EffectsTemplate,
  type RenderOutputs,
  type RendererContract,
  type RenderTarget,
  type ResolvedDesignTemplate
} from "@personalizer/core";

export class CanvasPreviewRenderer implements RendererContract {
  public compile = (
    designTemplate: ResolvedDesignTemplate,
    effectsTemplate: EffectsTemplate,
    resolvedInputs: Record<string, unknown>,
    assets: Record<string, string>
  ) => compileRenderPlan(designTemplate, effectsTemplate, resolvedInputs, assets);

  public render = async (
    renderPlan: ReturnType<RendererContract["compile"]>,
    target: RenderTarget
  ): Promise<RenderOutputs> => {
    const scene =
      renderPlan.scenes.find((entry) => entry.sceneId === target.sceneId) ??
      renderPlan.scenes[0];

    if (!scene) {
      return { outputs: [] };
    }

    return {
      outputs: [
        {
          sceneId: scene.sceneId,
          format: target.format,
          mimeType: target.format === "png" ? "image/png" : "application/octet-stream",
          bytes: new Uint8Array()
        }
      ]
    };
  };
}
