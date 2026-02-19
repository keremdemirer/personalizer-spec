import {
  resolveBindings,
  validateTemplates,
  type BindingSources,
  type DesignTemplate,
  type EffectsTemplate,
  type RenderModel,
  type ValidationIssue,
} from "@personalizer/core";

export interface EditorModelResult {
  ok: boolean;
  errors: ValidationIssue[];
  renderModel?: RenderModel;
}

export function createEditorModel(
  designTemplate: DesignTemplate,
  effectsTemplate: EffectsTemplate,
  bindings: BindingSources,
): EditorModelResult {
  const validation = validateTemplates(designTemplate, effectsTemplate);
  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors,
    };
  }

  const resolution = resolveBindings(designTemplate, effectsTemplate, bindings);
  if (!resolution.ok) {
    return {
      ok: false,
      errors: resolution.errors,
    };
  }

  return {
    ok: true,
    errors: [],
    renderModel: resolution.data,
  };
}
