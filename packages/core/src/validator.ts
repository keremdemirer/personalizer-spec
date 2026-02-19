import type { ZodError, ZodIssue } from "zod";
import {
  type DesignTemplate,
  type EffectsTemplate,
  designTemplateSchema,
  effectsTemplateSchema
} from "./schemas.js";

export interface ValidationDiagnostic {
  path: string;
  message: string;
}

export type ValidationResult =
  | {
      ok: true;
      diagnostics: ValidationDiagnostic[];
      designTemplate: DesignTemplate;
      effectsTemplate: EffectsTemplate;
    }
  | {
      ok: false;
      diagnostics: ValidationDiagnostic[];
    };

export class TemplateValidationError extends Error {
  public readonly diagnostics: ValidationDiagnostic[];

  public constructor(diagnostics: ValidationDiagnostic[]) {
    super(formatDiagnostics(diagnostics));
    this.name = "TemplateValidationError";
    this.diagnostics = diagnostics;
  }
}

const formatIssuePath = (issue: ZodIssue): string => {
  if (issue.path.length === 0) {
    return "root";
  }

  return issue.path
    .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
    .join(".")
    .replace(/\.\[/g, "[");
};

const zodToDiagnostics = (error: ZodError): ValidationDiagnostic[] =>
  error.issues.map((issue) => ({
    path: formatIssuePath(issue),
    message: issue.message
  }));

export const formatDiagnostics = (diagnostics: ValidationDiagnostic[]): string =>
  diagnostics
    .map((diagnostic, index) => `${index + 1}. ${diagnostic.path}: ${diagnostic.message}`)
    .join("\n");

export const validateTemplates = (
  designSource: unknown,
  effectsSource: unknown
): ValidationResult => {
  const diagnostics: ValidationDiagnostic[] = [];

  const designResult = designTemplateSchema.safeParse(designSource);
  if (!designResult.success) {
    diagnostics.push(...zodToDiagnostics(designResult.error));
  }

  const effectsResult = effectsTemplateSchema.safeParse(effectsSource);
  if (!effectsResult.success) {
    diagnostics.push(...zodToDiagnostics(effectsResult.error));
  }

  if (!designResult.success || !effectsResult.success) {
    return { ok: false, diagnostics };
  }

  const designTemplate = designResult.data;
  const effectsTemplate = effectsResult.data;

  if (designTemplate.templateId !== effectsTemplate.templateId) {
    diagnostics.push({
      path: "templateId",
      message: `design.templateId (${designTemplate.templateId}) must match effects.templateId (${effectsTemplate.templateId})`
    });
  }

  if (designTemplate.templateVersion !== effectsTemplate.templateVersion) {
    diagnostics.push({
      path: "templateVersion",
      message: `design.templateVersion (${designTemplate.templateVersion}) must match effects.templateVersion (${effectsTemplate.templateVersion})`
    });
  }

  const effectChainIds = new Set<string>();
  effectsTemplate.chains.forEach((chain, index) => {
    if (effectChainIds.has(chain.chainId)) {
      diagnostics.push({
        path: `effects.chains[${index}].chainId`,
        message: `Duplicate chainId '${chain.chainId}'`
      });
      return;
    }

    effectChainIds.add(chain.chainId);
  });

  const nodeIds = new Set(Object.keys(designTemplate.nodes));

  const checkNodeRef = (ref: { $ref: string }, path: string): void => {
    const nodeId = ref.$ref.slice("node:".length);
    if (!nodeIds.has(nodeId)) {
      diagnostics.push({
        path,
        message: `Referenced node '${nodeId}' does not exist in design.nodes`
      });
    }
  };

  designTemplate.scenes.forEach((scene, sceneIndex) => {
    scene.background.forEach((ref, refIndex) => {
      checkNodeRef(ref, `design.scenes[${sceneIndex}].background[${refIndex}]`);
    });

    scene.overlay.forEach((ref, refIndex) => {
      checkNodeRef(ref, `design.scenes[${sceneIndex}].overlay[${refIndex}]`);
    });

    checkNodeRef(scene.design, `design.scenes[${sceneIndex}].design`);

    scene.designOverlay.forEach((ref, refIndex) => {
      checkNodeRef(ref, `design.scenes[${sceneIndex}].designOverlay[${refIndex}]`);
    });
  });

  Object.entries(designTemplate.nodes).forEach(([nodeMapKey, node]) => {
    if (node.id !== nodeMapKey) {
      diagnostics.push({
        path: `design.nodes.${nodeMapKey}.id`,
        message: `Node id '${node.id}' must match map key '${nodeMapKey}'`
      });
    }

    if (node.type === "container") {
      node.children.forEach((childRef, index) => {
        checkNodeRef(childRef, `design.nodes.${nodeMapKey}.children[${index}]`);
      });
    }

    if (node.effects) {
      const chainId = node.effects.$ref.slice("effect:".length);
      if (!effectChainIds.has(chainId)) {
        diagnostics.push({
          path: `design.nodes.${nodeMapKey}.effects`,
          message: `Referenced effect chain '${chainId}' does not exist in effects.chains`
        });
      }
    }
  });

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics };
  }

  return {
    ok: true,
    diagnostics,
    designTemplate,
    effectsTemplate
  };
};

export const assertValidTemplates = (
  designSource: unknown,
  effectsSource: unknown
): { designTemplate: DesignTemplate; effectsTemplate: EffectsTemplate } => {
  const result = validateTemplates(designSource, effectsSource);
  if (!result.ok) {
    throw new TemplateValidationError(result.diagnostics);
  }

  return {
    designTemplate: result.designTemplate,
    effectsTemplate: result.effectsTemplate
  };
};
