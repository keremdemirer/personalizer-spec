import {
  type EffectsTemplate,
  type ResolvedDesignTemplate,
  colorRegex,
  resolvedDesignTemplateSchema
} from "./schemas.js";
import {
  TemplateValidationError,
  type ValidationDiagnostic,
  validateTemplates
} from "./validator.js";

export interface ResolveRenderModelOptions {
  designTemplate: unknown;
  effectsTemplate: unknown;
  inputs: Record<string, unknown>;
  assets?: Record<string, unknown>;
}

export interface RenderModel {
  designTemplate: ResolvedDesignTemplate;
  effectsTemplate: EffectsTemplate;
  resolvedInputs: Record<string, unknown>;
}

export class BindingResolutionError extends Error {
  public readonly diagnostics: ValidationDiagnostic[];

  public constructor(diagnostics: ValidationDiagnostic[]) {
    super(
      diagnostics
        .map((diagnostic, index) => `${index + 1}. ${diagnostic.path}: ${diagnostic.message}`)
        .join("\n")
    );
    this.name = "BindingResolutionError";
    this.diagnostics = diagnostics;
  }
}

const stripPrefix = (value: string, prefix: string): string =>
  value.startsWith(prefix) ? value.slice(prefix.length) : value;

const normalizeString = (value: string): string =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/^[ \t]+|[ \t]+$/g, "")
    .normalize("NFC");

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = normalizeValue(nested);
    }
    return out;
  }

  return value;
};

const getByPath = (source: unknown, path: string): unknown => {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const sourceRecord = source as Record<string, unknown>;

  if (path in sourceRecord) {
    return sourceRecord[path];
  }

  if (path.length === 0) {
    return source;
  }

  const segments = path.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const readFromInputs = (
  inputs: Record<string, unknown>,
  path: string
): unknown => {
  const direct = getByPath(inputs, path);
  if (direct !== undefined) {
    return direct;
  }

  const withoutPrefix = stripPrefix(path, "inputs.");
  return getByPath(inputs, withoutPrefix);
};

const readFromAssets = (
  assets: Record<string, unknown>,
  path: string
): unknown => {
  const direct = getByPath(assets, path);
  if (direct !== undefined) {
    return direct;
  }

  const withoutPrefix = stripPrefix(path, "uploads.");
  return getByPath(assets, withoutPrefix);
};

const isSingleKeyObject = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.keys(value).length === 1;
};

const resolveBindings = (
  value: unknown,
  inputs: Record<string, unknown>,
  assets: Record<string, unknown>,
  diagnostics: ValidationDiagnostic[],
  path: string
): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      resolveBindings(entry, inputs, assets, diagnostics, `${path}[${index}]`)
    );
  }

  if (value && typeof value === "object") {
    if (isSingleKeyObject(value) && "$bind" in value) {
      const bindPath = value.$bind;
      const boundValue = readFromInputs(inputs, bindPath);
      if (boundValue === undefined) {
        diagnostics.push({
          path,
          message: `Missing input for binding '${bindPath}'`
        });
        return null;
      }
      return normalizeValue(boundValue);
    }

    if (isSingleKeyObject(value) && "$bindAsset" in value) {
      const bindPath = value.$bindAsset;
      const boundValue =
        readFromAssets(assets, bindPath) ?? readFromInputs(inputs, bindPath);

      if (boundValue === undefined) {
        diagnostics.push({
          path,
          message: `Missing asset for binding '${bindPath}'`
        });
        return null;
      }

      if (typeof boundValue !== "string") {
        diagnostics.push({
          path,
          message: `Asset binding '${bindPath}' must resolve to a string`
        });
        return null;
      }

      return normalizeString(boundValue);
    }

    if (isSingleKeyObject(value) && "$bindColor" in value) {
      const bindPath = value.$bindColor;
      const boundValue = readFromInputs(inputs, bindPath);

      if (boundValue === undefined) {
        diagnostics.push({
          path,
          message: `Missing input for color binding '${bindPath}'`
        });
        return null;
      }

      if (typeof boundValue !== "string") {
        diagnostics.push({
          path,
          message: `Color binding '${bindPath}' must resolve to a string`
        });
        return null;
      }

      const normalizedColor = normalizeString(boundValue).toUpperCase();
      if (!colorRegex.test(normalizedColor)) {
        diagnostics.push({
          path,
          message: `Color binding '${bindPath}' resolved to invalid color '${normalizedColor}'`
        });
        return null;
      }

      return normalizedColor;
    }

    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const childPath = path === "root" ? key : `${path}.${key}`;
      out[key] = resolveBindings(nested, inputs, assets, diagnostics, childPath);
    }
    return out;
  }

  return value;
};

export const resolveRenderModel = (
  options: ResolveRenderModelOptions
): RenderModel => {
  const validationResult = validateTemplates(
    options.designTemplate,
    options.effectsTemplate
  );

  if (!validationResult.ok) {
    throw new TemplateValidationError(validationResult.diagnostics);
  }

  const normalizedInputs = normalizeValue(options.inputs);

  if (!normalizedInputs || typeof normalizedInputs !== "object") {
    throw new BindingResolutionError([
      {
        path: "inputs",
        message: "Inputs must resolve to an object"
      }
    ]);
  }

  const normalizedInputMap = normalizedInputs as Record<string, unknown>;
  const assetMap = options.assets ?? {};

  const diagnostics: ValidationDiagnostic[] = [];
  const resolvedDesignTemplateRaw = resolveBindings(
    validationResult.designTemplate,
    normalizedInputMap,
    assetMap,
    diagnostics,
    "root"
  );

  if (diagnostics.length > 0) {
    throw new BindingResolutionError(diagnostics);
  }

  const resolvedDesignResult = resolvedDesignTemplateSchema.safeParse(
    resolvedDesignTemplateRaw
  );

  if (!resolvedDesignResult.success) {
    throw new BindingResolutionError(
      resolvedDesignResult.error.issues.map((issue) => ({
        path:
          issue.path.length === 0
            ? "root"
            : issue.path
                .map((part) =>
                  typeof part === "number" ? `[${part}]` : String(part)
                )
                .join(".")
                .replace(/\.\[/g, "["),
        message: issue.message
      }))
    );
  }

  return {
    designTemplate: resolvedDesignResult.data,
    effectsTemplate: validationResult.effectsTemplate,
    resolvedInputs: normalizedInputMap
  };
};

export const normalizeBoundString = normalizeString;
