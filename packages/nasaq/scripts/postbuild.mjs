// Copies the CSS entry points next to the JS output.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgs = join(root, "..");
const files = [
  ["web/src/styles.css", "dist/web/styles.css"],
  ["tokens/dist/tokens.css", "dist/tokens.css"],
  ["tokens/dist/theme.css", "dist/theme.css"],
  ["electron/src/chrome.css", "dist/electron/chrome.css"],
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

// unlayer: strips @layer wrappers, for hosts on Tailwind v3 (FilamentPHP v3).
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

// nasaq.css: the precompiled stylesheet for stacks without their own Tailwind build (plain HTML, Blade, Livewire).
// Tailwind v4 over the Blade components and the Alpine runtime, so it holds exactly the classes they use, which are
// the React components' classes. nasaq.unlayered.css drops preflight and @layer, for hosts that bring their own
// base styles on Tailwind v3 (FilamentPHP v3), whose unlayered preflight would otherwise beat layered utilities.
const fwd = (p) => p.replaceAll("\\", "/");
const cssEntry = (preflight) =>
  [
    preflight ? '@import "tailwindcss";' : '@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);',
    `@import "${fwd(join(pkgs, "tokens/dist/tokens.css"))}";`,
    `@import "${fwd(join(pkgs, "tokens/dist/theme.css"))}";`,
    preflight ? `@import "${fwd(join(pkgs, "web/src/styles.css"))}";` : "",
    `@source "${fwd(join(pkgs, "php/resources/views"))}";`,
    `@source "${fwd(join(pkgs, "html/src/alpine"))}";`,
  ].join("\n");
const { default: postcss } = await import("postcss");
const { default: tailwind } = await import("@tailwindcss/postcss");
const compile = async (preflight) =>
  (await postcss([tailwind({ optimize: { minify: true } })]).process(cssEntry(preflight), { from: join(root, "nasaq.entry.css") })).css;
writeFileSync(join(root, "dist/nasaq.css"), await compile(true));
writeFileSync(join(root, "dist/nasaq.unlayered.css"), unlayer(await compile(false)));

// nasaq-alpine.js: the script-tag build of the Alpine runtime; registers itself on alpine:init.
const { build } = await import("esbuild");
await build({
  entryPoints: [join(pkgs, "html/src/cdn-alpine.ts")],
  outfile: join(root, "dist/cdn/nasaq-alpine.js"),
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  legalComments: "none",
  logLevel: "warning",
});

// fadymondy/nasaq-php serves the same two assets (php artisan vendor:publish --tag=nasaq-assets, or FilamentAsset).
const phpDist = join(pkgs, "php/resources/dist");
mkdirSync(phpDist, { recursive: true });
for (const f of ["nasaq.css", "nasaq.unlayered.css", "cdn/nasaq-alpine.js"]) copyFileSync(join(root, "dist", f), join(phpDist, f.replace("cdn/", "")));
console.log("postbuild: copied", files.length, "files, wrote nasaq.css, nasaq.unlayered.css and cdn/nasaq-alpine.js");
