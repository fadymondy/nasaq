// Builds the Nasaq catalogue from the repo: component READMEs (frontmatter + manual), source,
// stories, foundations docs and design tokens. The server calls this live inside the monorepo,
// and `pnpm build` snapshots it to catalog.json for the published package.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));

/** Public locations. The registry lives on the docs host; the landing page is a separate app. */
export const URLS = {
  docs: "https://nasaq-ui.fadymondy.com",
  registry: "https://nasaq-ui.fadymondy.com/r/{name}.json",
  registryIndex: "https://nasaq-ui.fadymondy.com/registry.json",
  repo: "https://github.com/fadymondy/nasaq",
  landing: "https://nasaq.fadymondy.com",
  mcp: "https://nasaq-mcp.fadymondy.com/mcp",
};

/** How to add one component to a shadcn project, from the public registry. */
export const registryInstall = (name) => ({
  url: URLS.registry.replace("{name}", name),
  command: `npx shadcn@latest add @nasaq/${name}`,
});

export const CATEGORIES = ["account", "actions", "admin", "ai", "ai-agents", "alerts", "analytics", "auth", "billing", "bookings", "brand", "charts", "chat", "collaboration", "crm", "data-display", "delivery", "developer-tools", "editors", "feedback", "feedback-sdk", "files", "form-builders", "forms", "gamification", "healthcare", "integrations", "keyboard", "layout", "marketing", "monitoring", "navigation", "onboarding", "overlays", "pickers", "platforms", "pricing", "productivity", "security", "seo", "server-tools", "store", "store-admin", "typography", "utilities", "website", "wellness", "work", "workflow"];

/** The monorepo root: NASAQ_ROOT, else the nearest ancestor with packages/web/src/components. */
export function findRoot(start = here) {
  if (process.env.NASAQ_ROOT) return resolve(process.env.NASAQ_ROOT);
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "packages", "web", "src", "components"))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : null);

/** Splits `---\nyaml\n---\nbody`. Returns { data, body, error }. */
export function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { data: {}, body: text, error: "missing frontmatter" };
  try {
    return { data: parseYaml(m[1]) ?? {}, body: text.slice(m[0].length) };
  } catch (e) {
    return { data: {}, body: text.slice(m[0].length), error: `invalid YAML: ${e.message}` };
  }
}

/** Public exports declared in a source file (functions, consts, classes, types, interfaces). */
export function sourceExports(source) {
  const names = new Set();
  for (const m of source.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of source.matchAll(/^export\s*\{([^}]+)\}/gm))
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, "");
      if (name) names.add(name);
    }
  return [...names];
}

/** Storybook id from a CSF title: "Components/Command Palette" → "components-command-palette". */
export const storyIdFromTitle = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9/ -]/g, "")
    .replace(/[/ ]+/g, "-")
    .replace(/-+/g, "-");

function loadStories(root) {
  const dir = join(root, "apps", "lab", "stories");
  if (!existsSync(dir)) return new Map();
  const map = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".stories.tsx"))) {
    const source = read(join(dir, file));
    const title = /title:\s*"([^"]+)"/.exec(source)?.[1];
    if (!title) continue;
    const names = [...source.matchAll(/^export const (\w+)\s*:/gm)].map((m) => m[1]);
    map.set(storyIdFromTitle(title), { file: `apps/lab/stories/${file}`, title, stories: names, source });
  }
  return map;
}

/** CSS custom properties with their value per selector context (light, dark, brand, density…). */
export function parseTokens(css) {
  const tokens = new Map();
  const stack = [];
  let buf = "";
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      stack.push(buf.trim().replace(/\s+/g, " "));
      buf = "";
    } else if (ch === "}") {
      stack.pop();
      buf = "";
    } else if (ch === ";") {
      const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(buf);
      if (m) {
        const context = stack.join(" > ") || ":root";
        if (!tokens.has(m[1])) tokens.set(m[1], {});
        tokens.get(m[1])[context] = m[2].trim();
      }
      buf = "";
    } else buf += ch;
  }
  return [...tokens].map(([name, values]) => ({ name, values }));
}

const FOUNDATIONS = [
  { id: "setup", title: "Install and set up Nasaq (web)", inline: true },
  { id: "component-readme-spec", title: "Component README spec", path: "docs/COMPONENT-README.md" },
  { id: "color", title: "Colour: surfaces, interaction, roles, status collisions", path: "docs/foundations/COLOR.md" },
  { id: "layout", title: "Layout: whitespace vs cards, borders, density, no filler", path: "docs/foundations/LAYOUT.md" },
  { id: "architecture", title: "Architecture: packages, tokens pipeline, brands, platforms", path: "docs/ARCHITECTURE.md" },
  // docs/audits/** is deliberately NOT published: it is an internal audit of the owner's other products
  // (private repo paths, open decisions). The logo rules are summarised in the server instructions.
];

export const SETUP = `# Set up Nasaq (web)

\`\`\`bash
pnpm add @fadymondy/nasaq react react-dom
\`\`\`

Tailwind v4 entry (e.g. \`app.css\`):

\`\`\`css
@import "tailwindcss";
@import "@fadymondy/nasaq/tokens.css";
@import "@fadymondy/nasaq/theme.css";
@import "@fadymondy/nasaq/web/styles.css";
@source "../node_modules/@fadymondy/nasaq/dist/web";
\`\`\`

Wrap the app once:

\`\`\`tsx
import { NasaqProvider, Toaster } from "@fadymondy/nasaq/web";

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <NasaqProvider brand="mahaam" defaultTheme="system" defaultLocale="en" density="compact">
      {children}
      <Toaster />
    </NasaqProvider>
  );
}
\`\`\`

- \`brand\`: a brand key (nasaq, fadymondy, mahaam, zekra, moharrik, seatfor, health-debug, circlexo, hosbah, orchestra, togo).
- \`locale\`: "en" | "ar" (sets dir="rtl" for Arabic). \`density\`: "comfortable" | "compact" | "dense".
- An app with a sidebar starts from \`AppShell\` (see get_component("app-shell")); add a \`CommandPalette\` and register
  commands with \`useRegisterCommands\` (see get_component("commands")).
- Inside the Nasaq monorepo the package is \`@nasaq/web\` instead of \`@fadymondy/nasaq/web\`.

## Or copy components with the shadcn CLI

Nasaq is also a shadcn registry (namespace \`@nasaq\`). Add the namespace to \`components.json\`:

\`\`\`json
{ "registries": { "@nasaq": "${URLS.registry}" } }
\`\`\`

Install the preset once (\`npx shadcn@latest add @nasaq/nasaq\`), then any component by name
(\`npx shadcn@latest add @nasaq/button\`). Each item is also a plain URL, e.g. ${URLS.registry.replace("{name}", "button")}.
Registry index: ${URLS.registryIndex}. Docs and live examples: ${URLS.docs}.
`;

/** Reads everything. `problems` lists components that break the README spec. */
export function buildCatalog(root = findRoot()) {
  if (!root) throw new Error("Nasaq repo not found. Set NASAQ_ROOT or use the bundled catalog.json.");
  const componentsDir = join(root, "packages", "web", "src", "components");
  const stories = loadStories(root);
  const problems = [];
  const components = [];

  for (const name of readdirSync(componentsDir).sort()) {
    const dir = join(componentsDir, name);
    const source = read(join(dir, `${name}.tsx`)) ?? read(join(dir, `${name}.ts`));
    if (source === null) continue;
    const readme = read(join(dir, "README.md"));
    const actual = sourceExports(source);
    const entry = { name, path: `packages/web/src/components/${name}`, exportsInSource: actual, source, registry: registryInstall(name) };
    if (readme === null) {
      problems.push({ name, problem: "no README.md" });
      components.push({ ...entry, title: name, category: "uncategorised", status: "undocumented", summary: "", exports: actual, related: [], keywords: [], readme: null, story: null });
      continue;
    }
    const { data, body, error } = parseFrontmatter(readme);
    if (error) problems.push({ name, problem: error });
    for (const key of ["name", "title", "category", "status", "summary", "exports", "story"])
      if (data[key] === undefined) problems.push({ name, problem: `frontmatter missing "${key}"` });
    if (data.name && data.name !== name) problems.push({ name, problem: `frontmatter name "${data.name}" ≠ folder` });
    if (data.category && !CATEGORIES.includes(data.category)) problems.push({ name, problem: `unknown category "${data.category}"` });
    const documented = data.exports ?? [];
    for (const e of actual) if (!documented.includes(e)) problems.push({ name, problem: `export "${e}" not documented` });
    for (const e of documented) if (!actual.includes(e)) problems.push({ name, problem: `documented export "${e}" does not exist` });
    const story = data.story ? stories.get(data.story) : undefined;
    if (data.story && !story) problems.push({ name, problem: `story "${data.story}" not found` });
    components.push({
      ...entry,
      title: data.title ?? name,
      category: data.category ?? "uncategorised",
      status: data.status ?? "beta",
      summary: data.summary ?? "",
      exports: documented.length ? documented : actual,
      related: data.related ?? [],
      keywords: data.keywords ?? [],
      baseUi: data["base-ui"] ?? [],
      storyMissing: Boolean(data["story-missing"]),
      readme: body.trim(),
      story: story ? { id: data.story, file: story.file, title: story.title, stories: story.stories, source: story.source, url: `${URLS.docs}/?path=/docs/${data.story}--docs` } : null,
    });
  }

  const foundations = FOUNDATIONS.map((f) => ({ id: f.id, title: f.title, content: f.inline ? SETUP : read(join(root, f.path)) })).filter((f) => f.content);
  const tokensCss = read(join(root, "packages", "tokens", "dist", "tokens.css"));
  const tokens = tokensCss ? parseTokens(tokensCss) : [];
  return { generatedAt: new Date().toISOString(), urls: URLS, components, foundations, tokens, problems };
}

/** Live catalogue inside the repo, else the snapshot shipped with the package. `snapshot: true` reads only catalog.json. */
export function loadCatalog({ snapshot: forceSnapshot = false } = {}) {
  const root = forceSnapshot ? null : findRoot();
  if (root) return { ...buildCatalog(root), mode: "live", root };
  const snapshot = join(here, "..", "catalog.json");
  if (!existsSync(snapshot)) throw new Error("No Nasaq repo and no catalog.json. Run `pnpm --filter @fadymondy/nasaq-mcp build`.");
  return { ...JSON.parse(readFileSync(snapshot, "utf8")), mode: "snapshot" };
}

/** Finds a component by folder name, title, or any export ("SidebarItem" → app-shell). */
export function findComponent(catalog, query) {
  const q = String(query).trim().toLowerCase().replace(/[\s_]+/g, "-");
  const flat = q.replace(/-/g, "");
  return (
    catalog.components.find((c) => c.name === q) ??
    catalog.components.find((c) => c.title.toLowerCase() === flat || c.title.toLowerCase().replace(/[^a-z]/g, "") === flat) ??
    catalog.components.find((c) => c.exports.some((e) => e.toLowerCase() === flat)) ??
    null
  );
}

/** Ranks components for a free-text query. Title/export hits beat keywords beat body text. */
export function searchComponents(catalog, query, limit = 8) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const scored = catalog.components.map((c) => {
    let score = 0;
    const title = c.title.toLowerCase();
    const exportsText = c.exports.join(" ").toLowerCase();
    const keywords = c.keywords.join(" ").toLowerCase();
    const summary = c.summary.toLowerCase();
    const body = (c.readme ?? "").toLowerCase();
    for (const t of terms) {
      if (c.name.includes(t) || title.includes(t)) score += 10;
      if (exportsText.includes(t)) score += 6;
      if (keywords.includes(t)) score += 5;
      if (summary.includes(t)) score += 4;
      if (c.category.includes(t)) score += 3;
      if (body.includes(t)) score += 1 + Math.min(3, body.split(t).length - 2);
    }
    return { c, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ c, score }) => ({ name: c.name, title: c.title, category: c.category, summary: c.summary, score }));
}

/** A README section by heading, e.g. section(readme, "API"). */
export function section(markdown, heading) {
  const lines = (markdown ?? "").split("\n");
  const start = lines.findIndex((l) => /^##\s/.test(l) && l.replace(/^##\s+/, "").toLowerCase().startsWith(heading.toLowerCase()));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n").trim();
}
