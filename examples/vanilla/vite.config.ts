import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@personalizer/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@personalizer/renderer-canvas": resolve(
        __dirname,
        "../../packages/renderer-canvas/src/index.ts"
      ),
      "@personalizer/elements": resolve(
        __dirname,
        "../../packages/elements/src/index.ts"
      ),
      "@personalizer/elements/register": resolve(
        __dirname,
        "../../packages/elements/src/register.ts"
      )
    }
  },
  server: {
    port: 5173
  }
});
