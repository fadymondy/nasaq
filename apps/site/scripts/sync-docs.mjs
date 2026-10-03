#!/usr/bin/env node
// Turns packages/web/src/components/*/README.md into content/docs/components/<name>.md for fumadocs.
//  - frontmatter becomes { title, description }; the body is kept as plain markdown (.md, not .mdx, so
//    braces and angle brackets in prose never hit the MDX parser);
//  - an install block, a lab link and code tabs for every ported stack (React, shadcn, Vue, Blade, HTML + Alpine)
//    are added under the title;
//  - sibling links (../x/README.md) become site links.
// Also writes the guides (apps/lab/docs/content), a live preview page per component (public/preview/<name>.html,
// the rendered Blade/Alpine markup on nasaq.css), the preview assets (public/nasaq) and the shadcn registry (public/r).
// Runs before dev/build/typecheck. Output is gitignored.
import { cpSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog, CATEGORIES, parseFrontmatter } from "../../../packages/mcp/src/catalog.mjs";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(site, "..", "..");
const componentsDir = join(root, "packages/web/src/components");
const out = join(site, "content/docs/components");
const REGISTRY = "https://docs.nasaqui.com/r";
const LAB = "https://lab.nasaqui.com";
const LABELS = {
  account: "Account",
  actions: "Actions",
  admin: "Admin",
  ai: "AI Assistant",
  "ai-agents": "AI Agents",
  alerts: "Alerts & Notifications",
  analytics: "Analytics",
  auth: "Auth",
  billing: "Billing",
  bookings: "Bookings",
  brand: "Brand",
  charts: "Charts & Maps",
  chat: "Chat",
  collaboration: "Collaboration",
  crm: "CRM",
  delivery: "Delivery",
  "data-display": "Data Display",
  "developer-tools": "Developer Tools",
  editors: "Editors",
  feedback: "Loading & States",
  "feedback-sdk": "Feedback SDK",
  files: "Files",
  "form-builders": "Form Builders",
  forms: "Forms",
  gamification: "Gamification",
  healthcare: "Healthcare",
  integrations: "Integrations",
  keyboard: "Keyboard & Commands",
  layout: "Layout",
  marketing: "Marketing",
  monitoring: "Monitoring",
  navigation: "Navigation",
  onboarding: "Onboarding",
  overlays: "Overlays",
  pickers: "Pickers",
  platforms: "Apps & Platforms",
  pricing: "Pricing",
  productivity: "Productivity",
  security: "Security",
  seo: "SEO",
  "server-tools": "Server Tools",
  store: "Storefront",
  "store-admin": "Store Admin",
  typography: "Typography",
  utilities: "Utilities",
  website: "Website",
  wellness: "Wellness",
  work: "Projects & Work",
  workflow: "Workflow",
};
const label = (c) => LABELS[c] ?? c.replace(/(^|-)(\w)/g, (_, s, ch) => (s ? " " : "") + ch.toUpperCase());
const registryItems = new Set(
  existsSync(join(root, "apps/lab/.registry/r")) ? readdirSync(join(root, "apps/lab/.registry/r")).map((f) => f.replace(/\.json$/, "")) : [],
);
const q = (s) => JSON.stringify(String(s));

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const { examples } = buildCatalog(root).frameworks;
const STACKS = [
  ["react", "tsx", "React"],
  ["shadcn", "tsx", "shadcn"],
  ["vue", "vue", "Vue"],
  ["blade", "blade", "Blade"],
  ["html", "html", "HTML + Alpine"],
];
// Per-stack source goes to public/code/<name>.json, not into the pages: inlined, ~23 MB of highlighted
// examples made the Next build need more than 14 GiB. The page renders it with ComponentCode.
const codeDir = join(site, "public/code");
await rm(codeDir, { recursive: true, force: true });
await mkdir(codeDir, { recursive: true });
const code = {};
const writeCode = async (name) => {
  const entry = examples[name];
  const stacks = entry ? STACKS.filter(([stack]) => entry[stack]) : [];
  if (!stacks.length) return;
  code[name] = stacks.map(([stack, lang, label]) => ({ stack, lang, label }));
  await writeFile(join(codeDir, `${name}.json`), JSON.stringify(Object.fromEntries(stacks.map(([stack]) => [stack, entry[stack]]))));
};

// Live previews: the rendered HTML of each component on the precompiled stylesheet and the Alpine runtime.
// Assets come from the local build of @fadymondy/nasaq when there is one, otherwise from the CDN.
const pub = join(site, "public");
const dist = join(root, "packages/nasaq/dist");
const local = existsSync(join(dist, "nasaq.css")) && existsSync(join(dist, "cdn/nasaq-alpine.js"));
let alpineFile = null;
try {
  alpineFile = join(dirname(createRequire(join(root, "packages/html/package.json")).resolve("alpinejs/package.json")), "dist/cdn.min.js");
} catch {}
await rm(join(pub, "nasaq"), { recursive: true, force: true });
await rm(join(pub, "preview"), { recursive: true, force: true });
await mkdir(join(pub, "preview"), { recursive: true });
const assets = {
  css: "https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/nasaq.css",
  runtime: "https://cdn.jsdelivr.net/npm/@fadymondy/nasaq/dist/cdn/nasaq-alpine.js",
  alpine: "https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js",
};
if (local) {
  await mkdir(join(pub, "nasaq"), { recursive: true });
  cpSync(join(dist, "nasaq.css"), join(pub, "nasaq/nasaq.css"));
  cpSync(join(dist, "cdn/nasaq-alpine.js"), join(pub, "nasaq/nasaq-alpine.js"));
  Object.assign(assets, { css: "/nasaq/nasaq.css", runtime: "/nasaq/nasaq-alpine.js" });
  if (alpineFile && existsSync(alpineFile)) {
    cpSync(alpineFile, join(pub, "nasaq/alpine.min.js"));
    assets.alpine = "/nasaq/alpine.min.js";
  }
}
// ?theme=dark, ?dir=rtl and ?brand=<id> are applied before the stylesheet paints.
const previewHead = (title) => `<!doctype html>
<html lang="en" dir="ltr" data-brand="nasaq" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} preview</title>
<script>(function(){var p=new URLSearchParams(location.search),h=document.documentElement,t=p.get("theme"),d=p.get("dir"),b=p.get("brand");if(t==="dark"){h.setAttribute("data-theme","dark");h.classList.add("dark")}if(d==="rtl"){h.dir="rtl";h.lang="ar"}if(b&&/^[a-z-]+$/.test(b))h.setAttribute("data-brand",b)})()</script>
<link rel="stylesheet" href="${assets.css}">
<script defer src="${assets.runtime}"></script>
<script defer src="${assets.alpine}"></script>
<style>body{margin:0}#nq-preview{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1rem;padding:2rem 1.5rem;box-sizing:border-box}#nq-preview>*{max-width:100%}</style>
</head>
<body class="bg-background text-foreground font-sans">
<div id="nq-preview">
`;
const previews = [];
const llm = []; // every page as markdown for /llms.txt, /llms-full.txt and /<page>.md (written at the end)

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
    .replace(/\]\(\.\.\/([\w-]+)\/README\.md(#[\w-]*)?\)/g, (_, n, hash = "") => `](/components/${n}${hash})`)
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
  await writeCode(name);
  llm.push({ url: `/components/${name}`, title, description: data.summary ?? "", group: label(category), body: [...install, text].join("\n"), code: name });
  const html = examples[name]?.html;
  if (html) {
    await writeFile(join(pub, "preview", `${name}.html`), `${previewHead(title)}${html}\n</div>\n</body>\n</html>\n`);
    previews.push(name);
  }
}
await writeFile(join(site, "lib/previews.generated.json"), JSON.stringify(previews));
await writeFile(join(site, "lib/code.generated.json"), JSON.stringify(code));

const pages = ["index"];
const groups = [];
// Sidebar groups run alphabetically by their label, like the Lab. app/(docs)/layout.tsx folds each group into a
// collapsible folder with its icon (lib/groups.tsx), keyed by lib/groups.generated.json.
for (const [category, names] of [...byCategory].sort(([a], [b]) => label(a).localeCompare(label(b)))) {
  if (!names.length) continue;
  pages.push(`---${label(category)}---`, ...names);
  groups.push({ key: category, label: label(category), names });
}
await writeFile(join(out, "meta.json"), JSON.stringify({ title: "Components", pages }, null, 2));
await writeFile(join(site, "lib/groups.generated.json"), JSON.stringify(groups));
const total = [...byCategory.values()].reduce((n, l) => n + l.length, 0);
await writeFile(
  join(out, "index.md"),
  ["---", 'title: "Components"', `description: ${q(`${total} components in ${groups.length} groups, each with a live preview, the code for every stack and an install command.`)}`, "---", "",
    ...groups.flatMap(({ key, label: l, names }) => [`## ${l} [#${key}]`, "", names.map((n) => `[${n}](/components/${n})`).join(" · "), ""])].join("\n"),
);

// The official Nasaq mark and favicon, served unchanged for the site header.
cpSync(join(root, "packages/brands/assets"), join(pub, "brand"), { recursive: true });

// Guides: the lab's long-form pages, with its ?page= links turned into site links.
const guidesSrc = join(root, "apps/lab/docs/content");
const guidesOut = join(site, "content/docs/guides");
const GUIDES = [
  ["Get started", ["introduction", "get-started", "get-started/react", "get-started/shadcn", "get-started/vue", "get-started/inertia", "get-started/laravel", "get-started/html", "project-setup", "shadcn-cli", "npm-package"]],
  ["Guides", ["theming", "tokens", "dark-mode", "rtl-and-arabic", "accessibility", "mcp-server", "page-templates"]],
  ["Project", ["contributing", "changelog-and-versioning"]],
];
const slugOf = (id) => id.replace("/", "-");
const guideIds = GUIDES.flatMap(([, ids]) => ids);
const pageLink = (id) => {
  if (id === "docs-catalogue-components") return "/components";
  if (id === "docs-guides-theming-and-brands") return "/guides/theming";
  const hit = guideIds.find((g) => id.endsWith("-" + slugOf(g)));
  return hit ? `/guides/${slugOf(hit)}` : `${LAB}/?path=/docs/${id}--docs`;
};
await rm(guidesOut, { recursive: true, force: true });
await mkdir(guidesOut, { recursive: true });
const guidePages = [];
for (const [group, ids] of GUIDES) {
  guidePages.push(`---${group}---`);
  for (const id of ids) {
    const file = join(guidesSrc, `${id}.md`);
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const title = (raw.match(/^#{1,3}\s+(.+)$/m)?.[1] ?? id).trim();
    const body = raw
      .replace(/^#{1,3}\s+.+\n+/, "")
      .replaceAll("{{components}}", String(total))
      .replace(/Use the \*\*\w+\*\* item in this Storybook's toolbar[^.]*\.\s*/g, "")
      .replace(/\]\(\?page=([\w-]+)(#[\w-]+)?\)/g, (_, p, hash = "") => `](${pageLink(p)}${hash})`)
      .replace(/\]\(\?(?:doc|story)=([\w-]+)\)/g, (_, s) => `](${LAB}/?path=/docs/${s.replace(/--.*$/, "")}--docs)`)
      .replace(/\]\(\/r\//g, "](https://docs.nasaqui.com/r/");
    const lead = body.split("\n\n").find((para) => para && !/^[#|>`<-]/.test(para)) ?? "";
    const description = lead.replace(/\]\([^)]*\)/g, "]").replace(/[*`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    await writeFile(join(guidesOut, `${slugOf(id)}.md`), ["---", `title: ${q(title)}`, `description: ${q(description)}`, "---", "", body.trim(), ""].join("\n"));
    guidePages.push(slugOf(id));
    llm.push({ url: `/guides/${slugOf(id)}`, title, description, group, body });
  }
}
await writeFile(join(guidesOut, "meta.json"), JSON.stringify({ title: "Guides", pages: guidePages }, null, 2));

// For search engines, answer engines and LLMs: every page as plain markdown at /<page>.md (component pages carry
// the code for every stack), an index at /llms.txt (llmstxt.org) and the whole text at /llms-full.txt.
const SITE = "https://docs.nasaqui.com";
const abs = (md) => md.replace(/\]\(\//g, `](${SITE}/`);
const fence = (lang, src) => {
  const ticks = "`".repeat(Math.max(3, ...[...src.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return [ticks + lang, src.trim(), ticks];
};
await rm(join(pub, "components"), { recursive: true, force: true });
await rm(join(pub, "guides"), { recursive: true, force: true });
await mkdir(join(pub, "components"), { recursive: true });
await mkdir(join(pub, "guides"), { recursive: true });
const pageMd = (p, withCode) => {
  const stacks = withCode && p.code ? STACKS.filter(([stack]) => examples[p.code]?.[stack]) : [];
  const codeMd = stacks.length
    ? ["## Code", "", ...stacks.flatMap(([stack, lang, l]) => [`### ${l}`, "", ...fence(lang, examples[p.code][stack]), ""])]
    : [];
  return [`# ${p.title}`, "", ...(p.description ? [`> ${p.description}`, ""] : []), `Source: ${SITE}${p.url}`, "", abs(p.body).trim(), "", ...codeMd].join("\n");
};
for (const p of llm) await writeFile(join(pub, `${p.url.slice(1)}.md`), pageMd(p, true));
await writeFile(
  join(pub, "components.md"),
  [`# Nasaq components`, "", `> ${total} components in ${groups.length} groups.`, "",
    ...groups.flatMap(({ label: l, names }) => [`## ${l}`, "", ...names.map((n) => `- [${n}](${SITE}/components/${n}.md)`), ""])].join("\n"),
);
const intro = [
  "# Nasaq",
  "",
  `> Nasaq (نسق) is a bilingual (English/Arabic, LTR/RTL) design system: --nq-* CSS tokens, brand themes and ${total} components, shipped for React (Base UI), the shadcn CLI, Vue 3, Laravel Blade (Livewire, FilamentPHP) and plain HTML with Alpine.js.`,
  "",
  `Install: \`npx shadcn@latest add ${REGISTRY}/nasaq.json\`, then \`npx shadcn@latest add ${REGISTRY}/<component>.json\`, or \`npm install @fadymondy/nasaq\`. Prices in examples are USD (SAR in Arabic). An MCP server (https://mcp.nasaqui.com) serves the same manuals to AI assistants. Each link below is the page as markdown; component pages include the code for every stack.`,
  "",
];
// Guides first, then the component groups in sidebar order.
const sections = new Map([...GUIDES.map(([g]) => g), ...groups.map((g) => `Components: ${g.label}`)].map((k) => [k, []]));
for (const p of llm) {
  const key = p.code ? `Components: ${p.group}` : p.group;
  sections.get(key)?.push(`- [${p.title}](${SITE}${p.url}.md)${p.description ? `: ${p.description}` : ""}`);
}
await writeFile(
  join(pub, "llms.txt"),
  [...intro, ...[...sections].filter(([, lines]) => lines.length).flatMap(([k, lines]) => [`## ${k}`, "", ...lines, ""]), "## Optional", "", `- [Full text](${SITE}/llms-full.txt): every guide and component manual in one file`, `- [shadcn registry](${REGISTRY}/registry.json)`, ""].join("\n"),
);
await writeFile(join(pub, "llms-full.txt"), [...intro, ...[...sections.keys()].flatMap((k) => llm.filter((p) => (p.code ? `Components: ${p.group}` : p.group) === k)).map((p) => pageMd(p, false))].join("\n\n"));

// The shadcn registry, once it has been built (pnpm --filter @nasaq/site registry).
const registryDir = join(root, "apps/lab/.registry/r");
await rm(join(pub, "r"), { recursive: true, force: true });
if (existsSync(registryDir)) cpSync(registryDir, join(pub, "r"), { recursive: true });

const guideCount = guidePages.filter((p) => !p.startsWith("---")).length;
console.log(
  `site docs: ${total} component pages, ${previews.length} live previews (${local ? "local" : "CDN"} assets), ${guideCount} guides${existsSync(registryDir) ? ", registry" : ""}`,
);
