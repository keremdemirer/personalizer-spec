import { COLOR_REGEX } from "./schemas.ts";
import type {
  DesignTemplate,
  EffectsTemplate,
  RenderModel,
  ValidationIssue,
  ValidationResult,
} from "./types.ts";

export interface BindingSources {
  inputs?: Record<string, unknown>;
  uploads?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getByPath(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = source;

  for (const segment of segments) {
    if (!isPlainObject(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

export function normalizeString(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/^[ \t]+|[ \t]+$/g, "").normalize("NFC");
}

export function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]),
    );
  }

  return value;
}

function isBindObject(value: unknown): value is { $bind: string } {
  return isPlainObject(value) && Object.keys(value).length === 1 && typeof value.$bind === "string";
}

function isBindAssetObject(value: unknown): value is { $bindAsset: string } {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    typeof value.$bindAsset === "string"
  );
}

function isBindColorObject(value: unknown): value is { $bindColor: string } {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    typeof value.$bindColor === "string"
  );
}

function resolveTemplateBindings(
  value: unknown,
  normalizedInputs: Record<string, unknown>,
  normalizedUploads: Record<string, unknown>,
  errors: ValidationIssue[],
  path: string,
): unknown {
  if (isBindObject(value)) {
    const rawPath = value.$bind;
    const lookupPath = rawPath.replace(/^inputs\./, "");
    const resolved = getByPath(normalizedInputs, lookupPath);

    if (resolved === undefined) {
      errors.push({
        path,
        message: `Missing binding value for '${rawPath}'`,
      });
      return null;
    }

    return resolved;
  }

  if (isBindAssetObject(value)) {
    const rawPath = value.$bindAsset;
    const lookupPath = rawPath.replace(/^uploads\./, "");
    const resolved = getByPath(normalizedUploads, lookupPath);

    if (typeof resolved !== "string" || resolved.length === 0) {
      errors.push({
        path,
        message: `Missing asset binding value for '${rawPath}'`,
      });
      return null;
    }

    return resolved;
  }

  if (isBindColorObject(value)) {
    const rawPath = value.$bindColor;
    const lookupPath = rawPath.replace(/^inputs\./, "");
    const resolved = getByPath(normalizedInputs, lookupPath);

    if (typeof resolved !== "string" || !COLOR_REGEX.test(resolved)) {
      errors.push({
        path,
        message: `Binding '${rawPath}' must resolve to a color in #RRGGBB or #RRGGBBAA format`,
      });
      return null;
    }

    return resolved;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      resolveTemplateBindings(item, normalizedInputs, normalizedUploads, errors, `${path}[${index}]`),
    );
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveTemplateBindings(
          item,
          normalizedInputs,
          normalizedUploads,
          errors,
          `${path}.${key}`,
        ),
      ]),
    );
  }

  return normalizeValue(value);
}

export function resolveBindings(
  designTemplate: DesignTemplate,
  effectsTemplate: EffectsTemplate,
  bindingSources: BindingSources,
): ValidationResult<RenderModel> {
  const normalizedInputs = (normalizeValue(bindingSources.inputs ?? {}) as Record<string, unknown>) ?? {};
  const normalizedUploads =
    (normalizeValue(bindingSources.uploads ?? {}) as Record<string, unknown>) ?? {};

  const errors: ValidationIssue[] = [];

  const resolvedDesign = resolveTemplateBindings(
    designTemplate,
    normalizedInputs,
    normalizedUploads,
    errors,
    "design",
  );

  const resolvedEffects = resolveTemplateBindings(
    effectsTemplate,
    normalizedInputs,
    normalizedUploads,
    errors,
    "effects",
  );

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    data: {
      templateId: designTemplate.templateId,
      templateVersion: designTemplate.templateVersion,
      sceneId: designTemplate.scenes[0]?.sceneId ?? "",
      designTemplate: resolvedDesign as RenderModel["designTemplate"],
      effectsTemplate: resolvedEffects as RenderModel["effectsTemplate"],
      resolvedInputs: normalizedInputs,
      resolvedUploads: normalizedUploads,
    },
  };
}
