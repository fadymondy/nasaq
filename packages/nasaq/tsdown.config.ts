import { fileURLToPath } from "node:url";
import { defineConfig } from "tsdown";
import { useClientForHooks } from "./scripts/use-client-plugin.mjs";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * One build, five entry groups. Internal workspace packages are inlined (they are private); every
 * third-party import stays external and is declared in package.json (dependencies or peers).
 * `unbundle` keeps one output file per source module, so a "use client" directive stays on the
 * module that owns it and pure helpers stay usable from React Server Components.
 */
export default defineConfig({
  entry: {
    "web/index": "../web/src/index.ts",
    "tokens/index": "../tokens/src/index.ts",
    "brands/index": "../brands/src/index.ts",
    "native/index": "../native/src/index.ts",
    "native/haptics.web": "../native/src/haptics.web.ts",
    "electron/index": "../electron/src/index.tsx",
    "electron/main": "../electron/src/main.ts",
    "electron/preload": "../electron/src/preload.ts",
  },
  alias: {
    "@nasaq/tokens": at("../tokens/src/index.ts"),
    "@nasaq/brands": at("../brands/src/index.ts"),
  },
  format: "esm",
  platform: "neutral",
  target: "es2022",
  unbundle: true,
  dts: true,
  clean: true,
  sourcemap: false,
  treeshake: true,
  outDir: "dist",
  // rootDir for declaration output must contain every packages/* source, so the config lives in packages/
  tsconfig: "../tsconfig.nasaq.json",
  plugins: [useClientForHooks()],
});
