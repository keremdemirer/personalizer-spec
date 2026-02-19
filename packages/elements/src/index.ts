import {
  compile,
  discoverBindingFields,
  formatDiagnostics,
  type CompileAssets,
  type RenderModel,
  type ValidationResult,
  validateTemplates
} from "@personalizer/core";
import { renderToBlob, renderToCanvas } from "@personalizer/renderer-canvas";

const TAG_NAME = "personalizer-editor";

export interface OrderPayload {
  templateId: string;
  templateVersion: string;
  sceneId: string;
  group: string;
  resolvedInputs: Record<string, unknown>;
  renderKey: string;
  assetRefs: {
    fonts: string[];
    images: string[];
    uploads: Record<string, string>;
  };
  assetHashes: Record<string, string>;
}

const cloneObject = <T extends Record<string, unknown>>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const getByPath = (source: Record<string, unknown>, path: string): unknown => {
  if (!path) {
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

const setByPath = (
  source: Record<string, unknown>,
  path: string,
  value: unknown
): void => {
  const segments = path.split(".");
  let current: Record<string, unknown> = source;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      current[segment] = value;
      return;
    }

    const next = current[segment];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  });
};

const humanizeBindingPath = (path: string): string =>
  path
    .replace(/^inputs\./, "")
    .replace(/^uploads\./, "")
    .split(".")
    .map((part) => part.replace(/([A-Z])/g, " $1"))
    .join(" ")
    .trim();

const computeSha256Hex = async (bytes: ArrayBuffer): Promise<string> => {
  if (!("crypto" in globalThis) || !("subtle" in crypto)) {
    return "";
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};

export class PersonalizerEditorElement extends HTMLElement {
  private _designTemplate: unknown;
  private _effectsTemplate: unknown;
  private _inputs: Record<string, unknown>;
  private _assets: CompileAssets;
  private _scene: string | undefined;
  private _queued = false;
  private _previewUrl: string | null = null;

  public constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._designTemplate = undefined;
    this._effectsTemplate = undefined;
    this._inputs = {};
    this._assets = { uploads: {}, contentHashes: {} };
    this._scene = undefined;
  }

  public connectedCallback(): void {
    this.requestRefresh();
  }

  public disconnectedCallback(): void {
    if (this._previewUrl) {
      URL.revokeObjectURL(this._previewUrl);
      this._previewUrl = null;
    }
  }

  public set designTemplate(value: unknown) {
    this._designTemplate = value;
    this.requestRefresh();
  }

  public get designTemplate(): unknown {
    return this._designTemplate;
  }

  public set effectsTemplate(value: unknown) {
    this._effectsTemplate = value;
    this.requestRefresh();
  }

  public get effectsTemplate(): unknown {
    return this._effectsTemplate;
  }

  public set inputs(value: Record<string, unknown>) {
    this._inputs = toRecord(cloneObject(toRecord(value)));
    this.requestRefresh();
  }

  public get inputs(): Record<string, unknown> {
    return this._inputs;
  }

  public set assets(value: CompileAssets) {
    const cloned = toRecord(cloneObject(toRecord(value)));
    this._assets = cloned as CompileAssets;
    if (!this._assets.uploads || typeof this._assets.uploads !== "object") {
      this._assets.uploads = {};
    }
    if (
      !this._assets.contentHashes ||
      typeof this._assets.contentHashes !== "object"
    ) {
      this._assets.contentHashes = {};
    }
    this.requestRefresh();
  }

  public get assets(): CompileAssets {
    return this._assets;
  }

  public set scene(value: string | undefined) {
    this._scene = value;
    this.requestRefresh();
  }

  public get scene(): string | undefined {
    return this._scene;
  }

  public validate(): ValidationResult {
    return validateTemplates(this._designTemplate, this._effectsTemplate);
  }

  public getResolvedModel(): RenderModel {
    return compile(
      this._designTemplate,
      this._effectsTemplate,
      this._inputs,
      this._assets
    );
  }

  public async exportPreview(): Promise<Blob> {
    const model = this.getResolvedModel();
    return renderToBlob(model, this._scene, "image/png");
  }

  public getOrderPayload(): OrderPayload {
    const model = this.getResolvedModel();
    const scene =
      model.designTemplate.scenes.find((entry) => entry.sceneId === this._scene) ??
      model.designTemplate.scenes.find((entry) => entry.group === this._scene) ??
      model.designTemplate.scenes[0];

    if (!scene) {
      throw new Error("No scene is available in designTemplate.scenes");
    }

    const uploads = toRecord(model.assets.uploads);
    const uploadRefs: Record<string, string> = {};
    for (const [key, value] of Object.entries(uploads)) {
      if (typeof value === "string") {
        uploadRefs[key] = value;
      }
    }

    return {
      templateId: model.designTemplate.templateId,
      templateVersion: model.designTemplate.templateVersion,
      sceneId: scene.sceneId,
      group: scene.group,
      resolvedInputs: model.resolvedInputs,
      renderKey: model.sceneRenderKeys[scene.sceneId] ?? "",
      assetRefs: {
        fonts: model.designTemplate.assets?.fonts?.map((font) => font.id) ?? [],
        images: model.designTemplate.assets?.images?.map((image) => image.id) ?? [],
        uploads: uploadRefs
      },
      assetHashes: model.assetContentHashes
    };
  }

  private requestRefresh(): void {
    if (this._queued) {
      return;
    }
    this._queued = true;

    queueMicrotask(() => {
      this._queued = false;
      this.refresh().catch((error) => {
        if (this.shadowRoot) {
          this.shadowRoot.innerHTML = `<pre>${String(error)}</pre>`;
        }
      });
    });
  }

  private async refresh(): Promise<void> {
    if (!this.shadowRoot) {
      return;
    }

    const validation = this.validate();
    const bindings = discoverBindingFields(this._designTemplate).filter(
      (entry) =>
        entry.bindingPath.startsWith("inputs.") ||
        entry.bindingPath.startsWith("uploads.")
    );

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: grid;
          grid-template-columns: minmax(280px, 1fr) 320px;
          gap: 16px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          color: #111827;
        }
        .panel {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 12px;
          background: #ffffff;
        }
        .preview {
          min-height: 320px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
        }
        .preview canvas {
          max-width: 100%;
          height: auto;
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }
        h3 {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
        }
        .field {
          margin-bottom: 10px;
        }
        .field label {
          display: block;
          font-size: 12px;
          margin-bottom: 4px;
          color: #374151;
        }
        .field input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px;
          font-size: 14px;
        }
        .status {
          font-size: 12px;
          color: #4b5563;
          white-space: pre-wrap;
          margin-top: 10px;
        }
        @media (max-width: 900px) {
          :host {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <div class="panel preview" id="preview-root"></div>
      <div class="panel">
        <h3>Bindings</h3>
        <div id="form-root"></div>
        <div class="status" id="status-root"></div>
      </div>
    `;

    const formRoot = this.shadowRoot.querySelector("#form-root") as HTMLDivElement;
    const statusRoot = this.shadowRoot.querySelector("#status-root") as HTMLDivElement;
    const previewRoot = this.shadowRoot.querySelector("#preview-root") as HTMLDivElement;

    bindings.forEach((binding) => {
      if (binding.bindingPath.startsWith("uploads.")) {
        formRoot.appendChild(this.createUploadField(binding.bindingPath));
        return;
      }

      formRoot.appendChild(this.createInputField(binding.kind, binding.bindingPath));
    });

    if (bindings.length === 0) {
      const note = document.createElement("div");
      note.className = "status";
      note.textContent = "No bindings found in template.";
      formRoot.appendChild(note);
    }

    if (!validation.ok) {
      statusRoot.textContent = `Invalid template:\n${formatDiagnostics(
        validation.diagnostics
      )}`;
    } else {
      statusRoot.textContent = "Template is valid.";
    }

    const isValid = validation.ok;
    this.dispatchEvent(
      new CustomEvent("personalizer:change", {
        detail: {
          inputs: this._inputs,
          valid: isValid
        },
        bubbles: true,
        composed: true
      })
    );

    if (!validation.ok) {
      return;
    }

    const model = this.getResolvedModel();
    const canvas = renderToCanvas(model, this._scene);
    previewRoot.replaceChildren(canvas);

    const blob = await renderToBlob(model, this._scene, "image/png").catch(
      () => null
    );

    if (blob) {
      if (this._previewUrl) {
        URL.revokeObjectURL(this._previewUrl);
      }
      this._previewUrl = URL.createObjectURL(blob);

      this.dispatchEvent(
        new CustomEvent("personalizer:preview", {
          detail: {
            blob,
            url: this._previewUrl
          },
          bubbles: true,
          composed: true
        })
      );
    }
  }

  private createInputField(
    kind: "bind" | "bindAsset" | "bindColor",
    bindingPath: string
  ): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.textContent = humanizeBindingPath(bindingPath);

    const path = bindingPath.replace(/^inputs\./, "");
    const existing = getByPath(this._inputs, path);

    const input = document.createElement("input");
    input.type = kind === "bindColor" ? "text" : typeof existing === "number" ? "number" : "text";
    input.value = typeof existing === "string" || typeof existing === "number" ? String(existing) : "";
    if (kind === "bindColor") {
      input.placeholder = "#RRGGBB or #RRGGBBAA";
    }

    input.addEventListener("input", () => {
      const value = input.type === "number" ? Number(input.value) : input.value;
      setByPath(this._inputs, path, value);
      this.requestRefresh();
    });

    wrapper.append(label, input);
    return wrapper;
  }

  private createUploadField(bindingPath: string): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const label = document.createElement("label");
    label.textContent = `${humanizeBindingPath(bindingPath)} (upload)`;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    const uploadPath = bindingPath.replace(/^uploads\./, "");

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      const buffer = await file.arrayBuffer();
      const hash = await computeSha256Hex(buffer);
      const url = URL.createObjectURL(file);

      if (!this._assets.uploads || typeof this._assets.uploads !== "object") {
        this._assets.uploads = {};
      }
      if (
        !this._assets.contentHashes ||
        typeof this._assets.contentHashes !== "object"
      ) {
        this._assets.contentHashes = {};
      }

      (this._assets.uploads as Record<string, unknown>)[uploadPath] = url;
      (this._assets.contentHashes as Record<string, string>)[uploadPath] = hash;

      this.requestRefresh();
    });

    wrapper.append(label, input);
    return wrapper;
  }
}

export const definePersonalizerEditor = (): void => {
  if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, PersonalizerEditorElement);
  }
};

export { TAG_NAME as PERSONALIZER_EDITOR_TAG };

declare global {
  interface HTMLElementTagNameMap {
    "personalizer-editor": PersonalizerEditorElement;
  }
}
