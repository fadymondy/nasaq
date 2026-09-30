#!/usr/bin/env node
// Smoke-installs the registry into a fresh Next.js app with the shadcn CLI, then typechecks it.
//   1. builds the registry against a local base URL and serves it;
//   2. create-next-app (TypeScript, Tailwind, App Router) in a temp dir, writes components.json;
//   3. shadcn add nasaq + a few components that pull in most of the graph;
//   4. tsc --noEmit in the app.
// Usage: node scripts/smoke-registry.mjs [item …]   (keep the temp app with KEEP=1)
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const items = process.argv.slice(2).length ? process.argv.slice(2) : ["nasaq", "theme-mahaam", "app-shell", "data-table", "command-palette", "product-switcher", "dialog", "sheet"];
const PORT = 6199;
const BASE = `http://localhost:${PORT}/r`;
const outDir = join(tmpdir(), "nasaq-registry-smoke-r");
// Async: the registry server below runs in this process, so a blocking execSync would starve it.
const run = (cmd, cwd = root) =>
  new Promise((ok, fail) => {
    console.log(`$ ${cmd}`);
    spawn(cmd, { cwd, shell: true, stdio: "inherit", env: { ...process.env, NASAQ_REGISTRY_URL: BASE, CI: "1" } })
      .on("error", fail)
      .on("exit", (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
  });

await run("node scripts/build-registry.mjs");
await run(`npx shadcn build registry/registry.json -o "${outDir}"`);
await run(`node scripts/validate-registry.mjs "${outDir}"`);

const server = createServer((req, res) => {
  const file = join(outDir, (req.url ?? "").replace(/^\/r\//, "").split("?")[0]);
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": "application/json" });
  createReadStream(file).pipe(res);
}).listen(PORT);

const tmp = await mkdtemp(join(tmpdir(), "nasaq-smoke-"));
try {
  await run("npx --yes create-next-app@16 app --ts --tailwind --app --eslint=false --no-src-dir --import-alias @/* --use-pnpm --turbopack --yes --disable-git", tmp);
  const app = join(tmp, "app");
  await writeFile(
    join(app, "components.json"),
    JSON.stringify({
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: true,
      tsx: true,
      tailwind: { config: "", css: "app/globals.css", baseColor: "neutral", cssVariables: true, prefix: "" },
      aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" },
      iconLibrary: "lucide",
    }, null, 2),
  );
  await run(`npx shadcn add ${items.map((i) => `${BASE}/${i}.json`).join(" ")} --yes --overwrite`, app);
  await run("npx tsc --noEmit -p .", app);
  console.log(`\nnasaq registry smoke: ${items.join(", ")} installed and typechecked`);
} finally {
  server.close();
  if (!process.env.KEEP) await rm(tmp, { recursive: true, force: true }).catch(() => {});
  else console.log(`kept ${tmp}`);
}
