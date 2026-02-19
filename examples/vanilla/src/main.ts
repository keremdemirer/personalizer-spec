import "@personalizer/elements/register";
import type { PersonalizerEditorElement } from "@personalizer/elements";

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }
  return (await response.json()) as T;
};

const bootstrap = async (): Promise<void> => {
  const editor = document.querySelector(
    "#editor"
  ) as PersonalizerEditorElement | null;

  if (!editor) {
    return;
  }

  const [designTemplate, effectsTemplate] = await Promise.all([
    getJson<unknown>("/minimal-design.json"),
    getJson<unknown>("/minimal-effects.json")
  ]);

  editor.designTemplate = designTemplate;
  editor.effectsTemplate = effectsTemplate;
  editor.inputs = { name: "Kero" };
  editor.assets = {
    uploads: {},
    contentHashes: {}
  };

  editor.addEventListener("personalizer:change", (event) => {
    const detail = (event as CustomEvent).detail as { valid: boolean };
    console.log("change", detail.valid);
  });

  const exportButton = document.querySelector("#export-png") as HTMLButtonElement;
  exportButton.addEventListener("click", async () => {
    const blob = await editor.exportPreview();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "preview.png";
    anchor.click();
    URL.revokeObjectURL(url);
  });
};

bootstrap().catch((error) => {
  console.error(error);
});
