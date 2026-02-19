import { createHash } from "node:crypto";

export interface RenderKeyInput {
  templateId: string;
  templateVersion: string;
  sceneId: string;
  resolvedInputs: Record<string, unknown>;
  assetContentHashes: Record<string, string>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    return Object.keys(objectValue)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(objectValue[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function computeRenderKey(input: RenderKeyInput): string {
  const payload = {
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    sceneId: input.sceneId,
    resolvedInputs: input.resolvedInputs,
    assetContentHashes: input.assetContentHashes,
  };

  return createHash("sha256").update(stableCanonicalJson(payload)).digest("hex");
}
