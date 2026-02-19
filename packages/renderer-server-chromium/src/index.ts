import {
  compile,
  type DesignTemplate,
  type EffectsTemplate,
  type RenderOutputs,
  type RenderPlan,
  type RendererAssets,
  type RendererContract,
  type RenderTarget,
} from "@personalizer/core";

export class ChromiumRendererStub implements RendererContract {
  compile(
    designTemplate: DesignTemplate,
    effectsTemplate: EffectsTemplate,
    resolvedInputs: Record<string, unknown>,
    assets: RendererAssets,
  ): RenderPlan {
    return compile(designTemplate, effectsTemplate, resolvedInputs, assets);
  }

  render(_renderPlan: RenderPlan, _target: RenderTarget): Promise<RenderOutputs> {
    return Promise.reject(
      new Error("@personalizer/renderer-server-chromium is currently a stub. Rendering is not implemented yet."),
    );
  }
}
