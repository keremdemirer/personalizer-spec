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

const ONE_BY_ONE_TRANSPARENT_PNG = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1,
  8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255, 31, 0,
  2, 235, 1, 246, 196, 175, 173, 245, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

export class ClientCanvasRenderer implements RendererContract {
  compile(
    designTemplate: DesignTemplate,
    effectsTemplate: EffectsTemplate,
    resolvedInputs: Record<string, unknown>,
    assets: RendererAssets,
  ): RenderPlan {
    return compile(designTemplate, effectsTemplate, resolvedInputs, assets);
  }

  render(_renderPlan: RenderPlan, target: RenderTarget): RenderOutputs {
    if (target.format === "bitmap") {
      return {
        format: "bitmap",
        mimeType: "application/octet-stream",
        bytes: new Uint8Array([0, 0, 0, 0]),
        metadata: {
          width: target.width ?? 1,
          height: target.height ?? 1,
          note: "stub bitmap output",
        },
      };
    }

    return {
      format: "png",
      mimeType: "image/png",
      bytes: ONE_BY_ONE_TRANSPARENT_PNG,
      metadata: {
        width: target.width ?? 1,
        height: target.height ?? 1,
        note: "stub png output",
      },
    };
  }
}
