import { computeRenderKey } from "./render-key.js";
import { resolveRenderModel, type ResolvedRenderModel } from "./bindings.js";

export interface CompileAssets extends Record<string, unknown> {
  contentHashes?: Record<string, string>;
  assetContentHashes?: Record<string, string>;
  hashes?: Record<string, string>;
}

export interface RenderModel extends ResolvedRenderModel {
  assets: CompileAssets;
  assetContentHashes: Record<string, string>;
  sceneRenderKeys: Record<string, string>;
}

const readStringMap = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (typeof nested === "string") {
      out[key] = nested;
    }
  }

  return out;
};

const extractAssetContentHashes = (assets: CompileAssets): Record<string, string> => {
  return {
    ...readStringMap(assets.assetContentHashes),
    ...readStringMap(assets.contentHashes),
    ...readStringMap(assets.hashes)
  };
};

export const compile = (
  designTemplate: unknown,
  effectsTemplate: unknown,
  resolvedInputs: Record<string, unknown>,
  assets: CompileAssets = {}
): RenderModel => {
  const resolved = resolveRenderModel({
    designTemplate,
    effectsTemplate,
    inputs: resolvedInputs,
    assets
  });

  const assetContentHashes = extractAssetContentHashes(assets);

  const sceneRenderKeys: Record<string, string> = {};
  for (const scene of resolved.designTemplate.scenes) {
    sceneRenderKeys[scene.sceneId] = computeRenderKey({
      templateId: resolved.designTemplate.templateId,
      templateVersion: resolved.designTemplate.templateVersion,
      sceneId: scene.sceneId,
      resolvedInputs: resolved.resolvedInputs,
      assetContentHashes
    });
  }

  return {
    ...resolved,
    assets,
    assetContentHashes,
    sceneRenderKeys
  };
};
