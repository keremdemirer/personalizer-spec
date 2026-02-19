import type {
  DesignNode,
  NodeRef,
  RenderModel,
  ResolvedDesignTemplate
} from "@personalizer/core";

const DEFAULT_CANVAS_SIZE = { w: 1, h: 1 };

type SceneSelector = string | undefined;

type RectBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type LoadedResources = {
  fonts: Set<string>;
  images: Map<string, HTMLImageElement>;
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const readyImages = new Map<string, HTMLImageElement>();
const fontCache = new Set<string>();

const getScene = (template: ResolvedDesignTemplate, selector?: SceneSelector) => {
  if (!selector) {
    return template.scenes[0];
  }

  return (
    template.scenes.find((scene) => scene.sceneId === selector) ??
    template.scenes.find((scene) => scene.group === selector) ??
    template.scenes[0]
  );
};

const resolveSceneRef = (template: ResolvedDesignTemplate, ref: NodeRef): DesignNode | null => {
  const nodeId = ref.$ref.replace(/^node:/, "");
  return template.nodes[nodeId] ?? null;
};

const unitToPixels = (
  value: number,
  unit: "px" | "pct",
  base: number
): number => (unit === "pct" ? (value / 100) * base : value);

const anchorOffset = (anchor: string | undefined, box: RectBox): { x: number; y: number } => {
  switch (anchor ?? "Center") {
    case "TopLeft":
      return { x: 0, y: 0 };
    case "Top":
      return { x: box.w / 2, y: 0 };
    case "TopRight":
      return { x: box.w, y: 0 };
    case "Left":
      return { x: 0, y: box.h / 2 };
    case "Center":
      return { x: box.w / 2, y: box.h / 2 };
    case "Right":
      return { x: box.w, y: box.h / 2 };
    case "BottomLeft":
      return { x: 0, y: box.h };
    case "Bottom":
      return { x: box.w / 2, y: box.h };
    case "BottomRight":
      return { x: box.w, y: box.h };
    default:
      return { x: box.w / 2, y: box.h / 2 };
  }
};

const toAbsoluteRect = (node: DesignNode, parent: RectBox): RectBox => {
  const raw = node.rect;
  const w = unitToPixels(raw.w, raw.unit, parent.w);
  const h = unitToPixels(raw.h, raw.unit, parent.h);
  const x = parent.x + unitToPixels(raw.x, raw.unit, parent.w);
  const y = parent.y + unitToPixels(raw.y, raw.unit, parent.h);
  const offset = anchorOffset(node.anchor, { x, y, w, h });

  return {
    x: x - offset.x,
    y: y - offset.y,
    w,
    h
  };
};

const resolveImageSource = (model: RenderModel, assetRef: string): string | undefined => {
  if (
    /^https?:\/\//.test(assetRef) ||
    assetRef.startsWith("data:") ||
    assetRef.startsWith("blob:")
  ) {
    return assetRef;
  }

  const imageAsset = model.designTemplate.assets?.images?.find(
    (asset) => asset.id === assetRef
  );
  if (imageAsset) {
    return imageAsset.src;
  }

  const uploaded = model.assets.uploads;
  if (uploaded && typeof uploaded === "object" && !Array.isArray(uploaded)) {
    const value = (uploaded as Record<string, unknown>)[assetRef];
    if (typeof value === "string") {
      return value;
    }
  }

  return assetRef;
};

const mapBlendMode = (blendMode: string | undefined): GlobalCompositeOperation => {
  if (!blendMode || blendMode === "Normal") {
    return "source-over";
  }

  return "source-over";
};

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      readyImages.set(src, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

  imageCache.set(src, pending);
  return pending;
};

const loadFont = async (family: string, src: string): Promise<void> => {
  if (fontCache.has(`${family}|${src}`)) {
    return;
  }

  if (!("FontFace" in globalThis) || !("fonts" in document)) {
    return;
  }

  const face = new FontFace(family, `url(${src})`);
  await face.load();
  document.fonts.add(face);
  fontCache.add(`${family}|${src}`);
};

const prepareResources = async (model: RenderModel): Promise<LoadedResources> => {
  const images = new Map<string, HTMLImageElement>();
  const fonts = new Set<string>();

  const fontAssets = model.designTemplate.assets?.fonts ?? [];
  await Promise.all(
    fontAssets.map(async (font) => {
      await loadFont(font.id, font.src).catch(() => undefined);
      fonts.add(font.id);
    })
  );

  const imageNodes = Object.values(model.designTemplate.nodes).filter(
    (node): node is DesignNode & { type: "image" } => node.type === "image"
  );

  await Promise.all(
    imageNodes.map(async (node) => {
      const src = resolveImageSource(model, node.image.assetRef);
      if (!src) {
        return;
      }

      const image = await loadImage(src).catch(() => undefined);
      if (image) {
        images.set(src, image);
      }
    })
  );

  return { fonts, images };
};

const collectCachedResources = (model: RenderModel): LoadedResources => {
  const images = new Map<string, HTMLImageElement>();
  const fonts = new Set<string>();

  (model.designTemplate.assets?.fonts ?? []).forEach((font) => {
    if (fontCache.has(`${font.id}|${font.src}`)) {
      fonts.add(font.id);
    }
  });

  Object.values(model.designTemplate.nodes).forEach((node) => {
    if (node.type !== "image") {
      return;
    }
    const src = resolveImageSource(model, node.image.assetRef);
    if (!src) {
      return;
    }
    const image = readyImages.get(src);
    if (image) {
      images.set(src, image);
    }
  });

  return { fonts, images };
};

const drawNode = (
  ctx: CanvasRenderingContext2D,
  model: RenderModel,
  node: DesignNode,
  parentRect: RectBox,
  resources: LoadedResources,
  inheritedOpacity: number
): void => {
  const rect = toAbsoluteRect(node, parentRect);
  const opacity = inheritedOpacity * ((node.opacity ?? 100) / 100);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = mapBlendMode(node.blendMode);

  if (node.backgroundColor) {
    ctx.fillStyle = node.backgroundColor;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (node.type === "fill") {
    ctx.fillStyle = node.backgroundColor ?? "#000000";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }

  if (node.type === "image") {
    const src = resolveImageSource(model, node.image.assetRef);
    if (src) {
      const image = resources.images.get(src);
      if (image) {
        ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
      } else {
        ctx.fillStyle = "#DDDDDD";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  }

  if (node.type === "text") {
    const fontFamily = node.text.fontRef;
    const fontSize = node.text.size;
    ctx.font = `${fontSize}px \"${fontFamily}\"`;
    ctx.fillStyle = node.text.color;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const textBody = typeof node.text.body === "string" ? node.text.body : "";
    ctx.fillText(textBody, rect.x, rect.y, rect.w);
  }

  if (node.type === "container") {
    if (node.clipToBounds) {
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
      ctx.clip();
    }

    node.children.forEach((childRef) => {
      const child = resolveSceneRef(model.designTemplate, childRef);
      if (!child) {
        return;
      }
      drawNode(ctx, model, child, rect, resources, opacity);
    });
  }

  ctx.restore();
};

const renderSceneToCanvas = (
  model: RenderModel,
  selector: SceneSelector,
  resources: LoadedResources
): HTMLCanvasElement => {
  const scene = getScene(model.designTemplate, selector);
  const canvas = document.createElement("canvas");

  const w = scene?.canvas.size.w ?? DEFAULT_CANVAS_SIZE.w;
  const h = scene?.canvas.size.h ?? DEFAULT_CANVAS_SIZE.h;
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));

  const ctx = canvas.getContext("2d");
  if (!ctx || !scene) {
    return canvas;
  }

  const rootRect: RectBox = { x: 0, y: 0, w: canvas.width, h: canvas.height };

  scene.background.forEach((ref) => {
    const node = resolveSceneRef(model.designTemplate, ref);
    if (node) {
      drawNode(ctx, model, node, rootRect, resources, 1);
    }
  });

  scene.overlay.forEach((ref) => {
    const node = resolveSceneRef(model.designTemplate, ref);
    if (node) {
      drawNode(ctx, model, node, rootRect, resources, 1);
    }
  });

  const designNode = resolveSceneRef(model.designTemplate, scene.design);
  if (designNode) {
    drawNode(ctx, model, designNode, rootRect, resources, 1);
  }

  scene.designOverlay.forEach((ref) => {
    const node = resolveSceneRef(model.designTemplate, ref);
    if (node) {
      drawNode(ctx, model, node, rootRect, resources, 1);
    }
  });

  return canvas;
};

export const renderToCanvas = (
  model: RenderModel,
  selector?: SceneSelector
): HTMLCanvasElement => {
  void prepareResources(model);
  const resources = collectCachedResources(model);

  return renderSceneToCanvas(model, selector, resources);
};

export const renderToBlob = async (
  model: RenderModel,
  selector?: SceneSelector,
  mimeType: "image/png" = "image/png"
): Promise<Blob> => {
  const resources = await prepareResources(model);
  const canvas = renderSceneToCanvas(model, selector, resources);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas export failed"));
        return;
      }
      resolve(blob);
    }, mimeType);
  });
};
