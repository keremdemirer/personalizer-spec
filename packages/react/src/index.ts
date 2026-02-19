import type { DesignTemplate, EffectsTemplate } from "@personalizer/core";
import { resolveRenderModel } from "@personalizer/core";

export interface PersonalizerEditorProps {
  designTemplate: DesignTemplate;
  effectsTemplate: EffectsTemplate;
}

export const PersonalizerEditor = (_props: PersonalizerEditorProps): null => null;

export { resolveRenderModel };
