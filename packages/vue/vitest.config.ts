import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  // examples/*.vue import from the published name, the way an app would.
  resolve: { alias: { "@fadymondy/nasaq/vue": fileURLToPath(new URL("./src/index.ts", import.meta.url)) } },
  test: { environment: "happy-dom", include: ["test/**/*.test.ts", "src/**/*.test.ts"] },
});
