#!/usr/bin/env node
// Validates the built registry (apps/lab/.registry/r) against the shadcn schema.
//  - every /r/<name>.json parses as a registry item;
//  - the index (registry.json) parses and carries no file `content` (the shadcn directory requires it);
//  - no item imports @nasaq/* or @fadymondy/nasaq; every alias import resolves to a file some item ships;
//  - every registryDependency points at an item in this registry.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registryItemSchema, registrySchema } from "shadcn/schema";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, process.argv[2] ?? "apps/lab/.registry/r");
const problems = [];
const fail = (msg) => problems.push(msg);

const index = JSON.parse(await readFile(join(dir, "registry.json"), "utf8"));
const parsedIndex = registrySchema.safeParse(index);
if (!parsedIndex.success) fail(`registry.json: ${parsedIndex.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
for (const item of index.items) for (const f of item.files ?? []) if ("content" in f) fail(`registry.json: ${item.name} has file content`);

const names = new Set(index.items.map((i) => i.name));
const shipped = new Set();
const items = [];
for (const file of await readdir(dir)) {
  if (!file.endsWith(".json") || file === "registry.json") continue;
  const item = JSON.parse(await readFile(join(dir, file), "utf8"));
  const parsed = registryItemSchema.safeParse(item);
  if (!parsed.success) fail(`${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  if (!names.has(item.name)) fail(`${file}: not in registry.json`);
  for (const f of item.files ?? []) shipped.add(f.target.replace(/\.(tsx?|jsx?)$/, ""));
  items.push(item);
}
if (items.length !== names.size) fail(`registry.json lists ${names.size} items, ${items.length} built`);

for (const item of items) {
  for (const dep of item.registryDependencies ?? []) {
    const name = dep.match(/\/([\w-]+)\.json$/)?.[1];
    if (name && !names.has(name)) fail(`${item.name}: registryDependency ${dep} is not in this registry`);
  }
  for (const f of item.files ?? []) {
    if (!f.content) fail(`${item.name}: ${f.path} has no content`);
    for (const [, spec] of f.content.matchAll(/(?:from|import)\s+"([^"]+)"/g)) {
      if (/^@nasaq\/|^@fadymondy\/nasaq/.test(spec)) fail(`${item.name}: ${f.target} imports ${spec}`);
      if (spec.startsWith("@/") && !shipped.has(spec.slice(2))) fail(`${item.name}: ${f.target} imports ${spec}, which no item ships`);
    }
  }
}

if (problems.length) {
  console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
  console.error(`nasaq registry: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`nasaq registry: ${items.length} items valid, index has no content`);
