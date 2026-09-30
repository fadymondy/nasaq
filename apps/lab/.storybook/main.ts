import { existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin, PluginOption } from "vite";
import { catalogue } from "./catalogue-plugin";

// Served publicly through win-tunnel at nasaq-ui.fadymondy.com.
// An absolute path: packages/native sits outside apps/lab, so the bare name does not resolve from there in a build.
const RN_WEB = resolve(import.meta.dirname, "../node_modules/react-native-web");
const HOSTS = ["nasaq-ui.fadymondy.com", "localhost", "127.0.0.1"];

const BASE_UI = [
  "autocomplete", "avatar", "button", "collapsible", "dialog", "direction-provider", "field", "popover",
  "input", "menu", "select", "separator", "switch", "toggle", "toggle-group", "tooltip",
];
const WEB_DEPS = [
  ...BASE_UI.map((p) => `@base-ui/react/${p}`),
  "class-variance-authority",
  "clsx",
  "@dnd-kit/core",
  "@dnd-kit/sortable",
  "@dnd-kit/utilities",
  "sonner",
  "tailwind-merge",
];

// Lusail is the products' Arabic face. Its licence does not allow redistribution (BRAND-AUDIT B3),
// so nothing is copied into this repo: the dev server serves the product's own files when they exist on
// this machine (override with NASAQ_LUSAIL_DIR) and falls back to Alexandria everywhere else.
// The static build is public, so it never bundles Lusail unless NASAQ_LUSAIL_DIR is set on purpose.
const isBuild = process.argv.includes("build");
const LUSAIL_DIR = process.env.NASAQ_LUSAIL_DIR ?? (isBuild ? "" : resolve(import.meta.dirname, "../../../../booki/web/public/fonts/lusail"));
const hasLusail = LUSAIL_DIR !== "" && existsSync(LUSAIL_DIR);
// Files under apps/lab/public (the store demo images). Vite's own public dir is off in Storybook.
const staticDirs = [
  ...(isBuild ? [{ from: resolve(import.meta.dirname, "../public"), to: "/" }] : []),
  ...(hasLusail ? [{ from: LUSAIL_DIR, to: "/fonts/lusail" }] : []),
];

/** Without the Lusail files, drop its @font-face rules so the browser never asks for (and 404s on) them. */
function lusailFaces(): Plugin {
  return {
    name: "nasaq:lusail-faces",
    enforce: "pre",
    transform(code, id) {
      if (hasLusail || !/[\\/]lab\.css(\?|$)/.test(id)) return;
      return code.replace(/@font-face\s*\{[^}]*font-family:\s*Lusail[^}]*\}/g, "");
    },
  };
}

/**
 * Cloudflare turns Vite's `Cache-Control: no-cache` into `max-age=14400` and caches it at the edge,
 * so browsers kept a stale module graph for hours: old dependency hashes (two React copies,
 * "reading 'useState' of null") and an old story list ("importers[path] is not a function").
 * `private, no-store` is neither cached nor rewritten. Hash-addressed pre-bundled deps stay cacheable.
 */
function noEdgeCache(): Plugin {
  return {
    name: "nasaq:no-edge-cache",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/\/deps\/[^?]+\?v=/.test(req.url ?? "")) return next();
        const setHeader = res.setHeader.bind(res);
        res.setHeader = (name, value) => (/^cache-control$/i.test(name) ? setHeader(name, "private, no-store") : setHeader(name, value));
        setHeader("Cache-Control", "private, no-store");
        setHeader("CDN-Cache-Control", "no-store");
        next();
      });
    },
  };
}

/**
 * react-docgen follows `extends TextProps` into react-native, which ships Flow source, and the parse error
 * turns the module into a 404. @nasaq/native documents its props in its README instead.
 */
async function skipDocgen(plugins: PluginOption[] | undefined, pattern: RegExp): Promise<PluginOption[]> {
  const flat = (await Promise.all((plugins ?? []).map((p) => p))).flat(Number.POSITIVE_INFINITY) as PluginOption[];
  return flat.map((p) => {
    if (!p || typeof p !== "object" || !("name" in p) || p.name !== "storybook:react-docgen-plugin") return p;
    const transform = p.transform as (this: unknown, src: string, id: string) => unknown;
    return { ...p, transform(this: unknown, src: string, id: string) { return pattern.test(id) ? undefined : transform.call(this, src, id); } } as Plugin;
  });
}

const WEB_EXTENSIONS = [".web.tsx", ".web.ts", ".web.mjs", ".web.js", ".tsx", ".ts", ".mjs", ".js", ".jsx", ".json"];
type Alias = { find: string | RegExp; replacement: string };
const toAliasArray = (alias: unknown): Alias[] =>
  Array.isArray(alias) ? alias : alias ? Object.entries(alias as Record<string, string>).map(([find, replacement]) => ({ find, replacement })) : [];

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // The docs come first in the sidebar (preview.tsx storySort). They are stories, so they follow the toolbar's theme, locale and direction.
  stories: ["../docs/**/*.stories.@(ts|tsx)", "../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs,
  core: { disableTelemetry: true, allowedHosts: HOSTS },
  async viteFinal(cfg) {
    cfg.plugins = [...(await skipDocgen(cfg.plugins, /[\/]packages[\/]native[\/]/)), tailwindcss(), lusailFaces(), catalogue(), noEdgeCache()];
    // Keep Storybook's `hmr.server`: HMR must share the Storybook HTTP server. With it, Vite's client
    // connects to the page's own host, port and protocol, so it works on localhost:6106 and through
    // the tunnel (wss on 443) alike. Replacing `hmr` moved the socket to :24678, which nothing
    // forwards: re-optimisation reloads never arrived and open tabs ended up with two React copies.
    cfg.server = { ...cfg.server, allowedHosts: HOSTS };
    // @nasaq/web is linked from source, so Vite discovers its deps lazily and re-bundles
    // mid-session; open tabs then hold two React copies ("reading 'useState' of null").
    // Pre-bundle everything up front and force a single React.
    cfg.resolve = {
      ...cfg.resolve,
      dedupe: ["react", "react-dom"],
      // @nasaq/native stories run on react-native-web; react-native-svg picks its DOM build by .web.js.
      alias: [...toAliasArray(cfg.resolve?.alias), { find: /^react-native$/, replacement: RN_WEB }],
      extensions: WEB_EXTENSIONS,
    };
    cfg.define = { ...cfg.define, __DEV__: JSON.stringify(process.env.NODE_ENV !== "production") };
    cfg.optimizeDeps = {
      ...cfg.optimizeDeps,
      // The pre-bundler resolves on its own; without these it takes react-native-svg's native build.
      rolldownOptions: {
        ...cfg.optimizeDeps?.rolldownOptions,
        resolve: { ...cfg.optimizeDeps?.rolldownOptions?.resolve, extensions: WEB_EXTENSIONS, alias: { "react-native": "react-native-web" } },
      },
      include: [
        ...(cfg.optimizeDeps?.include ?? []),
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "lucide-react",
        ...WEB_DEPS.map((dep) => `@nasaq/web > ${dep}`),
        "@nasaq/feedback > html-to-image",
        "react-native-web",
        "react-native-svg",
      ],
    };
    return cfg;
  },
};

export default config;
