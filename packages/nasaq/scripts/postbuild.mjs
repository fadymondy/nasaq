// Copies the CSS entry points next to the JS output.
import { cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgs = join(root, "..");
const files = [
  ["web/src/styles.css", "dist/web/styles.css"],
  ["tokens/dist/tokens.css", "dist/tokens.css"],
  ["tokens/dist/theme.css", "dist/theme.css"],
  ["electron/src/chrome.css", "dist/electron/chrome.css"],
  ["html/src/components.css", "dist/html/components.css"],
  ["html/src/base.css", "dist/html/base.css"],
];
for (const [from, to] of files) {
  const src = join(pkgs, from);
  if (!existsSync(src)) throw new Error(`missing ${src} (build @nasaq/tokens first)`);
  const out = join(root, to);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(src, out);
}
// The no-flash theme script as a static file, for strict CSPs (`<script src>`, no nonce).
const { nasaqThemeScriptFile } = await import(pathToFileURL(join(root, "dist/web/src/provider/theme-script.js")).href);
writeFileSync(join(root, "dist/theme-script.js"), nasaqThemeScriptFile());

// html.css: tokens + base + components in one file, for plain HTML, Blade, Filament and Vue (no bundler needed).
const read = (p) => readFileSync(join(pkgs, p), "utf8").replace(/^@import[^;]*;\s*/gm, "");
writeFileSync(
  join(root, "dist/html.css"),
  ["/* @fadymondy/nasaq/html.css: tokens, base, components */", read("tokens/dist/tokens.css"), read("html/src/base.css"), read("html/src/components.css")].join("\n"),
);

// html.unlayered.css: tokens + components without @layer and without base, for Tailwind v3 hosts (FilamentPHP v3).
// Tailwind v3's preflight is unlayered, and unlayered rules beat every layer, so `button { background: transparent }`
// would win over a layered .nq-button. Unlayered, the class selectors win again; the host keeps its own preflight.
const unlayer = (source) => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let i = 0;
  const closers = [];
  let depth = 0;
  while (i < css.length) {
    const statement = /^@layer\s+[\w-]+(\s*,\s*[\w-]+)*\s*;/.exec(css.slice(i));
    if (statement) {
      i += statement[0].length;
      continue;
    }
    const block = /^@layer\s+[\w-]+\s*\{/.exec(css.slice(i));
    if (block) {
      closers.push(depth);
      depth++;
      i += block[0].length;
      continue;
    }
    const ch = css[i];
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (closers.length && closers[closers.length - 1] === depth) {
        closers.pop();
        i++;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
};
writeFileSync(
  join(root, "dist/html.unlayered.css"),
  ["/* @fadymondy/nasaq/html.unlayered.css: tokens and components, no layers, no base (Tailwind v3 / Filament v3) */", read("tokens/dist/tokens.css"), unlayer(read("html/src/components.css"))].join("\n"),
);

// Script-tag builds (no bundler): window.Nasaq, and window.NasaqAlpine which registers itself with Alpine.
const { build } = await import("esbuild");
for (const [entry, out] of [["cdn.ts", "nasaq.global.js"], ["cdn-alpine.ts", "nasaq-alpine.global.js"]]) {
  await build({
    entryPoints: [join(pkgs, "html/src", entry)],
    outfile: join(root, "dist/cdn", out),
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2020",
    legalComments: "none",
    logLevel: "warning",
  });
}

// Blade anonymous components for Laravel / Livewire / Filament (copy to resources/views/components/nq).
cpSync(join(pkgs, "html/blade"), join(root, "dist/blade"), { recursive: true });
console.log("postbuild: copied", files.length, "files, wrote html.css, cdn bundles and blade components");
