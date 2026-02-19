import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  computeRenderKey,
  resolveRenderModel,
  validateTemplates
} from "../src/index.js";

const readJsonFixture = async <T>(relativePath: string): Promise<T> => {
  const fileUrl = new URL(
    `../../shared-test-vectors/fixtures/${relativePath}`,
    import.meta.url
  );
  const content = await readFile(fileUrl, "utf8");
  return JSON.parse(content) as T;
};

describe("core validator and resolver", () => {
  it("validates the minimal design/effects fixtures", async () => {
    const [designTemplate, effectsTemplate] = await Promise.all([
      readJsonFixture<unknown>("minimal-design.json"),
      readJsonFixture<unknown>("minimal-effects.json")
    ]);

    const result = validateTemplates(designTemplate, effectsTemplate);
    expect(result.ok).toBe(true);
  });

  it("normalizes bound string inputs for determinism", async () => {
    const [designTemplate, effectsTemplate, inputs] = await Promise.all([
      readJsonFixture<unknown>("minimal-design.json"),
      readJsonFixture<unknown>("minimal-effects.json"),
      readJsonFixture<Record<string, unknown>>("inputs-normalization.json")
    ]);

    const renderModel = resolveRenderModel({
      designTemplate,
      effectsTemplate,
      inputs
    });

    expect(renderModel.resolvedInputs.name).toBe("Kero\n");

    const node = renderModel.designTemplate.nodes.name;
    expect(node.type).toBe("text");
    if (node.type !== "text") {
      return;
    }

    expect(node.text.body).toBe("Kero\n");
  });

  it("computes a stable renderKey", async () => {
    const [designTemplate, effectsTemplate, inputs] = await Promise.all([
      readJsonFixture<unknown>("minimal-design.json"),
      readJsonFixture<unknown>("minimal-effects.json"),
      readJsonFixture<Record<string, unknown>>("inputs-normalization.json")
    ]);

    const renderModel = resolveRenderModel({
      designTemplate,
      effectsTemplate,
      inputs
    });

    const keyA = computeRenderKey({
      templateId: renderModel.designTemplate.templateId,
      templateVersion: renderModel.designTemplate.templateVersion,
      sceneId: renderModel.designTemplate.scenes[0].sceneId,
      resolvedInputs: renderModel.resolvedInputs,
      assetContentHashes: {
        b: "bbb",
        a: "aaa"
      }
    });

    const keyB = computeRenderKey({
      templateId: renderModel.designTemplate.templateId,
      templateVersion: renderModel.designTemplate.templateVersion,
      sceneId: renderModel.designTemplate.scenes[0].sceneId,
      resolvedInputs: { ...renderModel.resolvedInputs },
      assetContentHashes: {
        a: "aaa",
        b: "bbb"
      }
    });

    expect(keyA).toBe(keyB);
    expect(keyA).toBe("REPLACE_ME_RENDER_KEY");
  });
});
