import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  computeRenderKey,
  resolveBindings,
  stableCanonicalJson,
  validateTemplates,
} from "../src/index.ts";

function loadFixture<T>(fileName: string): T {
  const path = new URL(`../../shared-test-vectors/fixtures/${fileName}`, import.meta.url);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("@personalizer/core", () => {
  it("validates minimal design and effects fixtures", () => {
    const design = loadFixture<unknown>("minimal-design.json");
    const effects = loadFixture<unknown>("minimal-effects.json");

    const result = validateTemplates(design, effects);
    expect(result.ok).toBe(true);
  });

  it("fails when a scene references a missing node", () => {
    const design = loadFixture<Record<string, unknown>>("minimal-design.json");
    const effects = loadFixture<unknown>("minimal-effects.json");

    const broken = structuredClone(design);
    const scenes = broken.scenes as Array<Record<string, unknown>>;
    const firstScene = scenes[0];
    if (!firstScene) {
      throw new Error("Expected at least one scene in fixture");
    }
    const background = firstScene.background as Array<Record<string, string>>;
    if (background.length === 0) {
      throw new Error("Expected at least one background node reference in fixture");
    }
    background[0] = { $ref: "node:missing" };

    const result = validateTemplates(broken, effects);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((error) => error.message.includes("does not exist"))).toBe(true);
    }
  });

  it("resolves bindings and normalizes strings", () => {
    const design = loadFixture<unknown>("minimal-design.json");
    const effects = loadFixture<unknown>("minimal-effects.json");
    const inputs = loadFixture<Record<string, unknown>>("inputs-normalization.json");
    const expectedInputs = loadFixture<Record<string, unknown>>("expected-normalized-inputs.json");

    const validation = validateTemplates(design, effects);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const resolution = resolveBindings(validation.data.designTemplate, validation.data.effectsTemplate, {
      inputs,
    });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) {
      return;
    }

    expect(resolution.data.resolvedInputs).toEqual(expectedInputs);

    const resolvedNameNode = resolution.data.designTemplate.nodes.name;
    if (!resolvedNameNode || resolvedNameNode.type !== "text") {
      throw new Error("Expected text node");
    }

    expect(resolvedNameNode.text.body).toBe("Kero\n");
  });

  it("computes a stable renderKey snapshot", () => {
    const design = loadFixture<unknown>("minimal-design.json");
    const effects = loadFixture<unknown>("minimal-effects.json");
    const inputs = loadFixture<Record<string, unknown>>("inputs-normalization.json");
    const assetContentHashes = loadFixture<Record<string, string>>("asset-content-hashes.json");

    const validation = validateTemplates(design, effects);
    expect(validation.ok).toBe(true);
    if (!validation.ok) {
      return;
    }

    const resolution = resolveBindings(validation.data.designTemplate, validation.data.effectsTemplate, {
      inputs,
    });
    expect(resolution.ok).toBe(true);
    if (!resolution.ok) {
      return;
    }

    const renderKey = computeRenderKey({
      templateId: resolution.data.templateId,
      templateVersion: resolution.data.templateVersion,
      sceneId: resolution.data.sceneId,
      resolvedInputs: resolution.data.resolvedInputs,
      assetContentHashes,
    });

    expect(stableCanonicalJson(resolution.data.resolvedInputs)).toBe('{"name":"Kero\\n"}');
    expect(renderKey).toBe("4dbca2cca97cfc12de0eb187bafce6e1034c9ea296981f051759b693fb87a0cd");
  });
});
