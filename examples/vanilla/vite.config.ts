import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@personalizer/elements/register",
        replacement: resolve(__dirname, "../../packages/elements/src/register.ts")
      },
      {
        find: "@personalizer/elements",
        replacement: resolve(__dirname, "../../packages/elements/src/index.ts")
      },
      {
        find: "@personalizer/core",
        replacement: resolve(__dirname, "../../packages/core/src/index.ts")
      },
      {
        find: "@personalizer/renderer-canvas",
        replacement: resolve(__dirname, "../../packages/renderer-canvas/src/index.ts")
      }
    ]
  },
  server: {
    port: 5173
  }
});
