#!/usr/bin/env node
// Builds the shadcn registry sources from packages/web, packages/brands and packages/tokens.
//   registry/registry.json   the flat index shadcn build reads (paths, no content)
//   registry/nasaq/**         sources with imports rewritten to shadcn aliases (@/lib/utils, @/components/ui/*)
// Then: shadcn build registry/registry.json -o apps/lab/.registry/r  (scripts/registry.mjs runs both and validates;
// the lab build copies the result into storybook-static as /r/*.json and /registry.json)
// Registry items never depend on @fadymondy/nasaq; tokens, brands and the provider ship as files.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import { createBarrelSplitter } from "./registry-barrels.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "registry");
const src = join(out, "nasaq");
const BASE = (process.env.NASAQ_REGISTRY_URL ?? "https://nasaq-ui.fadymondy.com/r").replace(/\/$/, "");
const url = (name) => `${BASE}/${name}.json`;

const webPkg = JSON.parse(await readFile(join(root, "packages/web/package.json"), "utf8"));
const versions = webPkg.dependencies;
const readme = async (dir) => (await readFile(join(dir, "README.md"), "utf8").catch(() => ""));
const AUTHOR = "Fady Mondy (https://fadymondy.com)";
// The README frontmatter carries the summary and category; the first prose line is the fallback.
const front = (md) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(md);
  const data = Object.fromEntries(
    (m?.[1] ?? "").split(/\r?\n/).flatMap((l) => (l.indexOf(":") > 0 ? [[l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]] : [])),
  );
  return { data, body: m?.[2] ?? md };
};
const describe = (md) => {
  const { data, body } = front(md);
  return data.summary || (body.split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("```"))?.trim() ?? "");
};

// ---------- import rewriting ----------
const IMPORT = /(from\s+|import\s+|import\(\s*)"([^"]+)"/g;
const splitBarrelImports = createBarrelSplitter(join(root, "packages/web/src/components"));
function rewrite(code, { deps, regDeps, self }) {
  code = splitBarrelImports(code, self);
  return code.replace(IMPORT, (m, kw, spec) => {
    let to = spec;
    if (spec === "../../lib/cn") to = "@/lib/utils";
    else if (spec === "../../lib/hotkey") to = "@/lib/nasaq/hotkey";
    else if (spec === "../../lib/commerce") to = "@/lib/nasaq/commerce";
    else if (spec === "../../lib/click-sound") to = "@/lib/nasaq/click-sound";
    else if (spec === "../../provider/nasaq-provider" || spec === "../provider/nasaq-provider") to = "@/components/nasaq/nasaq-provider";
    else if (spec === "@nasaq/brands") to = "@/lib/nasaq/brands";
    else if (spec === "@nasaq/tokens") to = "@/lib/nasaq/tokens";
    else if (spec.startsWith("../")) {
      // ../button → button.tsx; ../dialog/close-button → close-button.tsx shipped by the dialog item.
      const [name, file = name] = spec.slice(3).split("/");
      if (name !== self) regDeps.add(url(name));
      to = `@/components/ui/${file}`;
    } else if (!spec.startsWith(".") && !spec.startsWith("@/") && spec !== "react" && spec !== "react-dom") {
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!versions[pkg]) throw new Error(`${self}: no version for ${pkg}`);
      deps.add(`${pkg}@${versions[pkg]}`);
    }
    if (/^@\/(lib\/nasaq|components\/nasaq)/.test(to) || to === "@/lib/utils") regDeps.add(url("nasaq"));
    return `${kw}"${to}"`;
  });
}

async function emit(rel, code) {
  const file = join(src, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, code);
  return `registry/nasaq/${rel}`.replaceAll("\\", "/");
}

// ---------- CSS → shadcn cssVars / css ----------
function toObject(nodes, into = {}) {
  for (const node of nodes) {
    if (node.type === "decl") into[node.prop] = node.value;
    else if (node.type === "rule") toObject(node.nodes, (into[node.selector.replace(/\s*\n\s*/g, " ")] ??= {}));
    else if (node.type === "atrule") toObject(node.nodes ?? [], (into[`@${node.name} ${node.params}`] ??= {}));
  }
  return into;
}
const vars = (rule) => Object.fromEntries(rule.nodes.filter((n) => n.type === "decl").map((n) => [n.prop.replace(/^--/, ""), n.value]));

const tokensCss = postcss.parse(await readFile(join(root, "packages/tokens/dist/tokens.css"), "utf8"));
const themeCss = postcss.parse(await readFile(join(root, "packages/tokens/dist/theme.css"), "utf8"));
const webCss = postcss.parse(await readFile(join(root, "packages/web/src/styles.css"), "utf8"));
const cssVars = { theme: {}, light: {}, dark: {} };
const rest = [];
// The semantic blocks go to cssVars (what shadcn writes into :root and .dark) and also stay in css,
// so [data-theme] keeps working next to the .dark class.
const selectors = (node) => node.selector.split(",").map((s) => s.trim());
for (const node of tokensCss.nodes) {
  if (node.type === "rule" && selectors(node).includes('[data-theme="light"]') && !Object.keys(cssVars.light).length) cssVars.light = vars(node);
  if (node.type === "rule" && selectors(node).join() === '.dark,[data-theme="dark"]') cssVars.dark = vars(node);
  rest.push(node);
}
for (const node of themeCss.nodes) {
  if (node.type === "atrule" && node.name === "theme") cssVars.theme = vars(node);
  else if (node.type === "atrule" && node.name === "custom-variant") continue; // shadcn init writes its own .dark variant
  else rest.push(node);
}
rest.push(...webCss.nodes);
const css = toObject(rest);
if (!Object.keys(cssVars.light).length || !Object.keys(cssVars.dark).length) throw new Error("semantic light/dark blocks not found in tokens.css");

// ---------- items ----------
await rm(out, { recursive: true, force: true });
const items = [];

// nasaq: the preset. cn, tokens, brands, hotkey, provider, theme script.
{
  const deps = new Set(["clsx@" + versions.clsx, "tailwind-merge@" + versions["tailwind-merge"]]);
  const reg = new Set();
  const tokIndex = await readFile(join(root, "packages/tokens/src/index.ts"), "utf8");
  const generated = await readFile(join(root, "packages/tokens/src/generated/tokens.ts"), "utf8");
  const brandsConst = generated.match(/export const brands = [\s\S]*?\n\} as const;\n/)?.[0];
  if (!brandsConst) throw new Error("brands not found in generated tokens");
  const colorConst = generated.match(/export const color = [\s\S]*?\n\} as const;\n/)?.[0];
  if (!colorConst) throw new Error("color not found in generated tokens");
  const contrastSrc = await readFile(join(root, "packages/tokens/src/contrast.ts"), "utf8");
  const files = [
    { path: await emit("lib/utils.ts", await readFile(join(root, "packages/web/src/lib/cn.ts"), "utf8")), type: "registry:lib", target: "lib/utils.ts" },
    { path: await emit("lib/nasaq/tokens.ts", `// Nasaq token types and brand colours (from @nasaq/tokens).\n${tokIndex.replace(/^export \*.*\n/gm, "").trim()}\n\n${colorConst}\n${brandsConst}\n${contrastSrc}`), type: "registry:lib", target: "lib/nasaq/tokens.ts" },
    { path: await emit("lib/nasaq/hotkey.ts", await readFile(join(root, "packages/web/src/lib/hotkey.ts"), "utf8")), type: "registry:lib", target: "lib/nasaq/hotkey.ts" },
    { path: await emit("lib/nasaq/commerce.ts", await readFile(join(root, "packages/web/src/lib/commerce.ts"), "utf8")), type: "registry:lib", target: "lib/nasaq/commerce.ts" },
    { path: await emit("lib/nasaq/click-sound.ts", await readFile(join(root, "packages/web/src/lib/click-sound.ts"), "utf8")), type: "registry:lib", target: "lib/nasaq/click-sound.ts" },
  ];
  for (const f of ["marks.ts", "mark-svg.ts", "manifests.ts"]) {
    const code = rewrite(await readFile(join(root, "packages/brands/src", f), "utf8"), { deps, regDeps: reg, self: "nasaq" });
    files.push({ path: await emit(`lib/nasaq/${f}`, code), type: "registry:lib", target: `lib/nasaq/${f}` });
  }
  files.push({ path: await emit("lib/nasaq/brands.ts", 'export * from "./marks";\nexport * from "./mark-svg";\nexport * from "./manifests";\n'), type: "registry:lib", target: "lib/nasaq/brands.ts" });
  for (const f of ["nasaq-provider.tsx", "theme-script.ts"]) {
    const code = rewrite(await readFile(join(root, "packages/web/src/provider", f), "utf8"), { deps, regDeps: reg, self: "nasaq" });
    files.push({ path: await emit(`components/nasaq/${f}`, code), type: "registry:component", target: `components/nasaq/${f}` });
  }
  items.push({
    name: "nasaq",
    type: "registry:style",
    title: "Nasaq",
    description: "The Nasaq preset: tokens for light and dark, brands, densities and expressions as CSS variables, the cn util, NasaqProvider and the theme script.",
    author: AUTHOR,
    categories: ["preset"],
    docs: "Wrap your app in NasaqProvider (components/nasaq/nasaq-provider) and load the fonts you want: Inter, JetBrains Mono and an Arabic face. Guide: https://nasaq-ui.fadymondy.com/?path=/story/docs-installation-shadcn-cli--page",
    dependencies: [...deps],
    files,
    cssVars,
    css,
  });
}

// One registry:theme per brand: swaps the brand and action colours.
const brandBlocks = tokensCss.nodes.filter((n) => n.type === "rule" && /^\[data-brand="[\w-]+"\]$/.test(n.selector));
for (const rule of brandBlocks) {
  const key = rule.selector.match(/"([\w-]+)"/)[1];
  items.push({
    name: `theme-${key}`,
    type: "registry:theme",
    title: `Nasaq theme: ${key}`,
    description: `Sets the ${key} brand and action colours as the default. Needs the nasaq preset.`,
    author: AUTHOR,
    categories: ["theme"],
    registryDependencies: [url("nasaq")],
    css: { ":root": Object.fromEntries(rule.nodes.filter((n) => n.type === "decl").map((n) => [n.prop, n.value])) },
  });
}

// Peer deps a component needs installed but never imports itself.
const PEER_DEPS = { "rich-text-editor": ["@tiptap/pm"] };

// Components.
const compRoot = join(root, "packages/web/src/components");
for (const name of (await readdir(compRoot)).sort()) {
  const dir = join(compRoot, name);
  const md = await readme(dir);
  const { data: meta } = front(md);
  const deps = new Set();
  const regDeps = new Set([url("nasaq")]);
  const files = [];
  for (const file of (await readdir(dir)).sort()) {
    if (!/\.tsx?$/.test(file) || file === "index.ts" || /\.(stories|test|spec|d)\./.test(file)) continue;
    const code = rewrite(await readFile(join(dir, file), "utf8"), { deps, regDeps, self: name });
    files.push({ path: await emit(`ui/${file}`, code), type: "registry:ui", target: `components/ui/${basename(file)}` });
  }
  for (const pkg of PEER_DEPS[name] ?? []) {
    if (!versions[pkg]) throw new Error(`${name}: no version for peer ${pkg}`);
    deps.add(`${pkg}@${versions[pkg]}`);
  }
  items.push({
    name,
    type: "registry:ui",
    title: name.replace(/(^|-)(\w)/g, (_, s, c) => (s ? " " : "") + c.toUpperCase()),
    description: describe(md),
    author: AUTHOR,
    ...(meta.category ? { categories: [meta.category] } : {}),
    ...(deps.size ? { dependencies: [...deps].sort() } : {}),
    registryDependencies: [...regDeps].sort(),
    files,
  });
}

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "nasaq",
  homepage: "https://nasaq-ui.fadymondy.com",
  items,
};
await writeFile(join(out, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
console.log(`nasaq registry: ${items.length} items (${brandBlocks.length} brand themes) → registry/registry.json, base ${BASE}`);
