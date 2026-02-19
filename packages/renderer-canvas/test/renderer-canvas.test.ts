// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { compile } from "@personalizer/core";
import { renderToCanvas } from "../src/index.js";

const design = {
  spec: "personalizer.design.v1",
  templateId: "demo",
  templateVersion: "1.0.0",
  scenes: [
    {
      sceneId: "scene-main",
      group: "PDP",
      canvas: { size: { w: 640, h: 480, unit: "px" }, dpi: 96 },
      background: [{ $ref: "node:bg" }],
      overlay: [],
      design: { $ref: "node:root" },
      designOverlay: []
    }
  ],
  nodes: {
    bg: {
      id: "bg",
      type: "fill",
      rect: { x: 0, y: 0, w: 100, h: 100, unit: "pct" },
      backgroundColor: "#EEEEEEFF"
    },
    root: {
      id: "root",
      type: "container",
      rect: { x: 50, y: 50, w: 100, h: 100, unit: "px" },
      anchor: "TopLeft",
      children: []
    }
  }
} as const;

const effects = {
  spec: "personalizer.effects.v1",
  templateId: "demo",
  templateVersion: "1.0.0",
  chains: []
} as const;

describe("renderToCanvas", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null
    );
  });

  it("returns a canvas with scene size", () => {
    const model = compile(design, effects, {}, {});
    const canvas = renderToCanvas(model, "scene-main");

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
  });
});
