#!/usr/bin/env node
// Builds the static lab (the documentation site) and puts the shadcn registry next to it:
//   1. scripts/registry.mjs         registry sources -> shadcn build -> validate  (apps/lab/.registry/r)
//   2. storybook build              -> storybook-static (docs, stories, demo images)
//   3. copy the registry            -> storybook-static/r/*.json and storybook-static/registry.json
// One folder, one host: https://nasaq-ui.fadymondy.com serves the docs and https://nasaq-ui.fadymondy.com/r/{name}.json.
// Set NASAQ_SKIP_REGISTRY=1 to reuse an existing apps/lab/.registry/r (for quick docs-only builds).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const lab = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(lab, "../..");
const out = join(lab, "storybook-static");
const registryOut = join(lab, ".registry/r");

function run(cmd, cwd) {
  console.log(`\n$ ${cmd}`);
  // The feedback widget key in .env.local is for the dev lab only; never bake it into the public bundle.
  const r = spawnSync(cmd, { cwd, shell: true, stdio: "inherit", env: { ...process.env, VITE_MAHAAM_FEEDBACK_KEY: "" } });
  if (r.status !== 0) {
    console.error(`nasaq lab build: "${cmd}" exited ${r.status}`);
    process.exit(r.status ?? 1);
  }
}

const t0 = Date.now();
if (!process.env.NASAQ_SKIP_REGISTRY) run("node scripts/registry.mjs", root);
if (!existsSync(join(registryOut, "registry.json"))) {
  console.error(`nasaq lab build: ${registryOut} has no registry.json; run node scripts/registry.mjs first`);
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
run("pnpm exec storybook build -o storybook-static", lab);

// r/*.json and registry.json (the shadcn CLI reads {base}/{name}.json; the index sits one level up).
cpSync(registryOut, join(out, "r"), { recursive: true });
cpSync(join(registryOut, "registry.json"), join(out, "registry.json"));

// Guards: what must be in the public build, and what must not.
const problems = [];
for (const f of ["index.html", "iframe.html", "index.json", "registry.json", "r/button.json", "r/nasaq.json"]) {
  if (!existsSync(join(out, f))) problems.push(`missing ${f}`);
}
if (!existsSync(join(out, "store"))) problems.push("missing the store demo images (apps/lab/public/store)");
if (existsSync(join(out, "fonts/lusail"))) problems.push("fonts/lusail is in the build; Lusail's licence does not allow redistribution");
const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const files = walk(out);
const fonts = files.filter((f) => /lusail/i.test(f));
if (fonts.length) problems.push(`Lusail files in the build: ${fonts.slice(0, 3).join(", ")}`);
if (problems.length) {
  console.error(`nasaq lab build: ${problems.join("; ")}`);
  process.exit(1);
}

const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`\nnasaq lab build: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
