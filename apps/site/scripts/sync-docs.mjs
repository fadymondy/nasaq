#!/usr/bin/env node
// Turns packages/web/src/components/*/README.md into content/docs/components/<name>.md for fumadocs.
//  - frontmatter becomes { title, description }; the body is kept as plain markdown (.md, not .mdx, so
//    braces and angle brackets in prose never hit the MDX parser);
//  - an install block and a lab link are added under the title;
//  - sibling links (../x/README.md) become site links.
// Runs before dev/build/typecheck. Output is gitignored.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../../../packages/mcp/src/catalog.mjs";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "..", "..");
const componentsDir = join(root, "packages/web/src/components");
const out = join(site, "content/docs/components");
const REGISTRY = "https://nasaq-ui.fadymondy.com/r";
const LAB = "https://nasaq-ui.fadymondy.com";
const CATEGORIES = ["layout", "navigation", "actions", "forms", "data-display", "feedback", "overlays", "brand", "typography", "utilities"];
const label = (c) => c.replace(/(^|-)(\w)/g, (_, s, ch) => (s ? " " : "") + ch.toUpperCase());
const registryItems = new Set(
  existsSync(join(root, "apps/lab/.registry/r")) ? readdirSync(join(root, "apps/lab/.registry/r")).map((f) => f.replace(/\.json$/, "")) : [],
);
const q = (s) => JSON.stringify(String(s));

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const byCategory = new Map(CATEGORIES.map((c) => [c, []]));
for (const name of readdirSync(componentsDir).sort()) {
  const file = join(componentsDir, name, "README.md");
  if (!existsSync(file)) continue;
  const { data, body } = parseFrontmatter(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  const title = data.title ?? name;
  const category = CATEGORIES.includes(data.category) ? data.category : "utilities";
  byCategory.get(category).push(name);

  const text = body
    .trim()
    .replace(/^#\s+.*\n+/, "") // the page title comes from frontmatter
    .replace(/\]\(\.\.\/([\w-]+)\/README\.md(#[\w-]*)?\)/g, (_, n, hash = "") => `](/docs/components/${n}${hash})`)
    .replace(/\]\((?:\.\.\/)+docs\/foundations\/[\w-]+\.md\)/g, `](${LAB}/)`);

  const install = registryItems.has(name)
    ? ["## Install", "", "```bash", `npx shadcn@latest add ${REGISTRY}/${name}.json`, "```", ""]
    : [];
  const lab = data.story
    ? [`Live examples and controls: [${title} in the lab](${LAB}/?path=/docs/${data.story}--docs).`, ""]
    : [];
  const meta = `*${label(category)} · ${data.status ?? "beta"}*`;
  const md = ["---", `title: ${q(title)}`, `description: ${q(data.summary ?? "")}`, "---", "", meta, "", ...lab, ...install, text, ""].join("\n");
  await writeFile(join(out, `${name}.md`), md);
}

const pages = ["index"];
for (const [category, names] of byCategory) {
  if (!names.length) continue;
  pages.push(`---${label(category)}---`, ...names);
}
await writeFile(join(out, "meta.json"), JSON.stringify({ title: "Components", pages }, null, 2));
const total = [...byCategory.values()].reduce((n, l) => n + l.length, 0);
await writeFile(
  join(out, "index.md"),
  ["---", 'title: "Components"', `description: ${q(`${total} components, each with a manual, an install command and a live story.`)}`, "---", "",
    ...[...byCategory].filter(([, n]) => n.length).flatMap(([c, names]) => [`## ${label(c)}`, "", names.map((n) => `[${n}](/docs/components/${n})`).join(" · "), ""])].join("\n"),
);
console.log(`site docs: ${total} component pages → content/docs/components`);
