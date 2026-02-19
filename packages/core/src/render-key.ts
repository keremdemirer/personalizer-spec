import { createHash } from "node:crypto";
import { canonicalJsonStringify } from "./canonical-json.js";

export interface RenderKeyInput {
  templateId: string;
  templateVersion: string;
  sceneId: string;
  resolvedInputs: Record<string, unknown>;
  assetContentHashes: Record<string, string>;
}

export const computeRenderKey = (input: RenderKeyInput): string => {
  const payload = {
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    sceneId: input.sceneId,
    resolvedInputs: input.resolvedInputs,
    assetContentHashes: input.assetContentHashes
  };

  return createHash("sha256")
    .update(canonicalJsonStringify(payload), "utf8")
    .digest("hex");
};
