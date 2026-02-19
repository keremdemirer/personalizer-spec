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

const readExpectedText = async (relativePath: string): Promise<string> => {
  const fileUrl = new URL(
    `../../shared-test-vectors/expected/${relativePath}`,
    import.meta.url
  );
  return (await readFile(fileUrl, "utf8")).trim();
};

const readExpectedJson = async <T>(relativePath: string): Promise<T> => {
  const fileUrl = new URL(
    `../../shared-test-vectors/expected/${relativePath}`,
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
    const [designTemplate, effectsTemplate, inputs, expectedInputs] =
      await Promise.all([
        readJsonFixture<unknown>("minimal-design.json"),
        readJsonFixture<unknown>("minimal-effects.json"),
        readJsonFixture<Record<string, unknown>>("inputs-normalization.json"),
        readExpectedJson<Record<string, unknown>>("normalized-inputs.json")
      ]);

    const renderModel = resolveRenderModel({
      designTemplate,
      effectsTemplate,
      inputs
    });

    expect(renderModel.resolvedInputs).toEqual(expectedInputs);

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
    const firstScene = renderModel.designTemplate.scenes[0];
    if (!firstScene) {
      throw new Error("expected at least one scene");
    }

    const keyA = computeRenderKey({
      templateId: renderModel.designTemplate.templateId,
      templateVersion: renderModel.designTemplate.templateVersion,
      sceneId: firstScene.sceneId,
      resolvedInputs: renderModel.resolvedInputs,
      assetContentHashes: {
        b: "bbb",
        a: "aaa"
      }
    });

    const keyB = computeRenderKey({
      templateId: renderModel.designTemplate.templateId,
      templateVersion: renderModel.designTemplate.templateVersion,
      sceneId: firstScene.sceneId,
      resolvedInputs: { ...renderModel.resolvedInputs },
      assetContentHashes: {
        a: "aaa",
        b: "bbb"
      }
    });

    const expectedKey = await readExpectedText("render-key.txt");

    expect(keyA).toBe(keyB);
    expect(keyA).toBe(expectedKey);
  });

  it("fails when a scene node ref is missing", async () => {
    const [designTemplate, effectsTemplate] = await Promise.all([
      readJsonFixture<Record<string, unknown>>("minimal-design.json"),
      readJsonFixture<Record<string, unknown>>("minimal-effects.json")
    ]);

    const brokenDesign = {
      ...designTemplate,
      scenes: [
        {
          ...((designTemplate.scenes as Array<Record<string, unknown>>)[0] ?? {}),
          background: [{ $ref: "node:not-found" }]
        }
      ]
    };

    const result = validateTemplates(brokenDesign, effectsTemplate);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.diagnostics.some((entry) =>
        entry.message.includes("Referenced node 'not-found'")
      )
    ).toBe(true);
  });

  it("fails when an effect chain ref is missing", async () => {
    const [designTemplate, effectsTemplate] = await Promise.all([
      readJsonFixture<Record<string, unknown>>("minimal-design.json"),
      readJsonFixture<Record<string, unknown>>("minimal-effects.json")
    ]);

    const nodes = designTemplate.nodes as Record<string, Record<string, unknown>>;
    const brokenDesign = {
      ...designTemplate,
      nodes: {
        ...nodes,
        name: {
          ...(nodes.name ?? {}),
          effects: { $ref: "effect:not-found" }
        }
      }
    };

    const result = validateTemplates(brokenDesign, effectsTemplate);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(
      result.diagnostics.some((entry) =>
        entry.message.includes("Referenced effect chain 'not-found'")
      )
    ).toBe(true);
  });
});
