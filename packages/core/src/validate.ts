import type { ZodIssue } from "zod";
import { designTemplateSchema, effectsTemplateSchema } from "./schemas.ts";
import type {
  DesignTemplate,
  EffectChain,
  EffectRef,
  EffectsTemplate,
  Node,
  NodeRef,
  ValidatedTemplates,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";

function issuePath(path: (string | number)[]): string {
  if (path.length === 0) {
    return "$";
  }

  return path
    .map((segment) => (typeof segment === "number" ? `[${segment}]` : segment))
    .join(".")
    .replace(/\.\[/g, "[");
}

function fromZodIssues(issues: ZodIssue[], root: string): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issuePath([root, ...issue.path]),
    message: issue.message,
  }));
}

function nodeIdFromRef(ref: NodeRef): string {
  return ref.$ref.slice("node:".length);
}

function effectIdFromRef(ref: EffectRef): string {
  return ref.$ref.slice("effect:".length);
}

function pushIfMissingNode(
  ref: NodeRef,
  path: string,
  nodeIndex: Record<string, Node>,
  errors: ValidationIssue[],
): void {
  const nodeId = nodeIdFromRef(ref);
  if (!nodeIndex[nodeId]) {
    errors.push({
      path,
      message: `Referenced node '${nodeId}' does not exist`,
    });
  }
}

export function resolveNodeRef(designTemplate: DesignTemplate, ref: NodeRef): Node | undefined {
  return designTemplate.nodes[nodeIdFromRef(ref)];
}

export function resolveEffectRef(
  effectsTemplate: EffectsTemplate,
  ref: EffectRef,
): EffectChain | undefined {
  const effectId = effectIdFromRef(ref);
  return effectsTemplate.chains.find((chain) => chain.chainId === effectId);
}

export function validateTemplates(
  designInput: unknown,
  effectsInput: unknown,
): ValidationResult<ValidatedTemplates> {
  const designResult = designTemplateSchema.safeParse(designInput);
  const effectsResult = effectsTemplateSchema.safeParse(effectsInput);

  const errors: ValidationIssue[] = [];

  if (!designResult.success) {
    errors.push(...fromZodIssues(designResult.error.issues, "design"));
  }

  if (!effectsResult.success) {
    errors.push(...fromZodIssues(effectsResult.error.issues, "effects"));
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  const designTemplate = designResult.data;
  const effectsTemplate = effectsResult.data;

  if (designTemplate.templateId !== effectsTemplate.templateId) {
    errors.push({
      path: "design.templateId",
      message: `design.templateId '${designTemplate.templateId}' must match effects.templateId '${
        effectsTemplate.templateId
      }'`,
    });
  }

  if (designTemplate.templateVersion !== effectsTemplate.templateVersion) {
    errors.push({
      path: "design.templateVersion",
      message: `design.templateVersion '${designTemplate.templateVersion}' must match effects.templateVersion '${
        effectsTemplate.templateVersion
      }'`,
    });
  }

  const nodeIndex = designTemplate.nodes;
  const effectChainIndex: Record<string, EffectChain> = {};

  designTemplate.scenes.forEach((scene, sceneIndex) => {
    scene.background.forEach((ref, refIndex) => {
      pushIfMissingNode(
        ref,
        `design.scenes[${sceneIndex}].background[${refIndex}]`,
        nodeIndex,
        errors,
      );
    });

    scene.overlay.forEach((ref, refIndex) => {
      pushIfMissingNode(ref, `design.scenes[${sceneIndex}].overlay[${refIndex}]`, nodeIndex, errors);
    });

    pushIfMissingNode(scene.design, `design.scenes[${sceneIndex}].design`, nodeIndex, errors);

    scene.designOverlay.forEach((ref, refIndex) => {
      pushIfMissingNode(
        ref,
        `design.scenes[${sceneIndex}].designOverlay[${refIndex}]`,
        nodeIndex,
        errors,
      );
    });
  });

  Object.entries(nodeIndex).forEach(([mapKey, node]) => {
    if (mapKey !== node.id) {
      errors.push({
        path: `design.nodes.${mapKey}.id`,
        message: `Node id '${node.id}' must match nodes map key '${mapKey}'`,
      });
    }

    if (node.type === "container") {
      node.children.forEach((ref, childIndex) => {
        pushIfMissingNode(
          ref,
          `design.nodes.${mapKey}.children[${childIndex}]`,
          nodeIndex,
          errors,
        );
      });
    }
  });

  effectsTemplate.chains.forEach((chain, chainIndex) => {
    if (effectChainIndex[chain.chainId]) {
      errors.push({
        path: `effects.chains[${chainIndex}].chainId`,
        message: `Duplicate chainId '${chain.chainId}'`,
      });
      return;
    }

    effectChainIndex[chain.chainId] = chain;
  });

  Object.entries(nodeIndex).forEach(([mapKey, node]) => {
    if (!node.effects) {
      return;
    }

    const effectId = effectIdFromRef(node.effects);
    if (!effectChainIndex[effectId]) {
      errors.push({
        path: `design.nodes.${mapKey}.effects.$ref`,
        message: `Referenced effect chain '${effectId}' does not exist`,
      });
    }
  });

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    data: {
      designTemplate,
      effectsTemplate,
      nodeIndex,
      effectChainIndex,
    },
  };
}
