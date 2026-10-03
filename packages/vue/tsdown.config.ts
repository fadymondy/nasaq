import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";


/**
 * The Vue entry of @fadymondy/nasaq, built on its own because Vue's type tooling needs the TypeScript 6 API
 * (the rest of the repo is on TypeScript 7). Runs after the main build and writes into packages/nasaq/dist/vue.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "neutral",
  target: "es2022",
  unbundle: true,
  dts: { vue: true },
  clean: true,
  sourcemap: false,
  outDir: "../nasaq/dist/vue",
  plugins: [
    Vue({ isProduction: true }),
    // The brand registry ships as its own entry of the same package; import it from there instead of inlining a copy.
    { name: "nasaq-brands", resolveId: (id: string) => (id === "@nasaq/brands" ? { id: "@fadymondy/nasaq/brands", external: true } : null) },
  ],
});
