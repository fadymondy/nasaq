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
  docs: "https://docs.nasaqui.com",
  registry: "https://docs.nasaqui.com/r/{name}.json",
  registryIndex: "https://docs.nasaqui.com/registry.json",
  repo: "https://github.com/fadymondy/nasaq",
  landing: "https://nasaqui.com",
  mcp: "https://mcp.nasaqui.com/mcp",
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
  { id: "get-started", title: "Get started: pick your stack (React, shadcn, Inertia, Vue, Laravel, HTML + Alpine)", path: "apps/lab/docs/content/get-started.md" },
  { id: "setup-react", title: "Set up Nasaq with React (Next.js, Vite, Remix)", path: "apps/lab/docs/content/get-started/react.md" },
  { id: "setup-shadcn", title: "Set up Nasaq with the shadcn CLI", path: "apps/lab/docs/content/get-started/shadcn.md" },
  { id: "setup-inertia", title: "Set up Nasaq with Laravel + Inertia (React or Vue)", path: "apps/lab/docs/content/get-started/inertia.md" },
  { id: "setup-vue", title: "Set up Nasaq with Vue 3 and Nuxt", path: "apps/lab/docs/content/get-started/vue.md" },
  { id: "setup-laravel", title: "Set up Nasaq with Laravel Blade, Livewire, FilamentPHP and TomatoPHP", path: "apps/lab/docs/content/get-started/laravel.md" },
  { id: "setup-html", title: "Set up Nasaq with plain HTML and Alpine.js (CDN, no bundler)", path: "apps/lab/docs/content/get-started/html.md" },
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

- \`brand\`: a brand key (nasaq, fadymondy, mahaam, zekra, moharrik, seatfor, health-debug, circlexo, hosbah, orchestra, togo, matjar, sanduq, mizan, qaima, makhzan, mawared).
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

## Not on React?

Components are being ported to Vue 3, Laravel Blade / Livewire / FilamentPHP / TomatoPHP and plain HTML + Alpine.js, with the same
look. Call get_setup({ framework }) for that stack's guide and get_component({ name, framework }) for a ported component's code.
`;

/**
 * Stacks get_setup / get_component accept. React is the main package; shadcn copies the same React source.
 * Laravel-family names read the Blade examples; Inertia reads React (the Vue adapter reads Vue); nuxt reads Vue.
 */
export const FRAMEWORKS = ["react", "shadcn", "inertia", "inertia-vue", "html", "alpine", "vue", "nuxt", "blade", "livewire", "filament", "laravel", "tomatophp"];
const EXAMPLE_STACK = { inertia: "react", "inertia-vue": "vue", nuxt: "vue", livewire: "blade", filament: "blade", laravel: "blade", tomatophp: "blade", alpine: "html" };
/** The example stack a framework reads: react, shadcn, vue, blade or html. */
export const snippetStack = (framework) => EXAMPLE_STACK[framework] ?? framework;
/** The get_foundation id holding a framework's setup guide. */
export const setupTopic = (framework) =>
  ({ react: "setup-react", shadcn: "setup-shadcn", inertia: "setup-inertia", "inertia-vue": "setup-inertia", html: "setup-html", alpine: "setup-html", vue: "setup-vue", nuxt: "setup-vue" })[framework] ??
  "setup-laravel";

/** The first ```tsx block of a README's "Quick start" section, without fences. */
export function quickStart(readme) {
  const sec = section(readme, "Quick start");
  return sec ? (/```tsx\n([\s\S]*?)\n```/.exec(sec)?.[1] ?? null) : null;
}

/** Export name → "@/components/ui/<file>", from each component's index.ts (`export * from "./file"`) and those files' exports. */
export function exportFileMap(componentsDir) {
  const out = {};
  for (const name of readdirSync(componentsDir)) {
    const index = read(join(componentsDir, name, "index.ts"));
    if (index === null) continue;
    for (const [, file] of index.matchAll(/export \* from "\.\/([\w-]+)"/g)) {
      const src = read(join(componentsDir, name, `${file}.tsx`)) ?? read(join(componentsDir, name, `${file}.ts`)) ?? "";
      for (const n of sourceExports(src)) if (!(n in out)) out[n] = `@/components/ui/${file}`;
    }
  }
  return out;
}

/** The shadcn version of a React snippet: the same JSX importing from the copied files. `files` is exportFileMap(); unknown names use `@/components/ui/<name>`. */
export function shadcnCode(name, react, files = {}) {
  if (!react) return null;
  return react.replace(/import\s*(type\s+)?\{([^}]+)\}\s*from\s*"@fadymondy\/nasaq\/web";?/g, (_, typeOnly, names) => {
    const byFile = {};
    for (const n of names.split(",").map((x) => x.trim()).filter(Boolean))
      (byFile[files[n.replace(/^type\s+/, "")] ?? `@/components/ui/${name}`] ??= []).push(n);
    return Object.entries(byFile)
      .map(([file, ns]) => `import ${typeOnly ?? ""}{ ${ns.join(", ")} } from "${file}";`)
      .join("\n");
  });
}

/** Globs the ported examples: { [name]: { react?, shadcn?, vue?, blade?, html? } }. Nothing is hard-coded: new files appear on the next build. */
function buildExamples(root, components, problems) {
  const files = exportFileMap(join(root, "packages", "web", "src", "components"));
  const phpDir = join(root, "packages", "php", "examples");
  const sources = {
    vue: [join(root, "packages", "vue", "examples"), ".vue"],
    blade: [phpDir, ".blade.php"],
    html: [join(phpDir, "rendered"), ".html"],
  };
  const names = new Set();
  for (const [dir, suffix] of Object.values(sources))
    if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith(suffix)) names.add(f.slice(0, -suffix.length));
  for (const c of components) if (quickStart(c.readme)) names.add(c.name);
  for (const c of components) if (quickStart(c.readme)) names.add(c.name);
  const examples = {};
  // Extra Blade demos of a part (code-tabs) or a variant (chat-widget-offline) fold into the web component that owns it.
  const pascal = (n) => n.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase());
  const ownerOf = (name) =>
    components.find((x) => x.exports.includes(pascal(name))) ?? components.find((x) => name.startsWith(x.name + "-"));
  const extras = [];
  for (const name of [...names].sort()) {
    const entry = {};
    for (const [stack, [dir, suffix]] of Object.entries(sources)) {
      const code = read(join(dir, name + suffix));
      if (code !== null) entry[stack] = code.trimEnd();
    }
    const c = components.find((x) => x.name === name);
    if (c) {
      const react = quickStart(c.readme);
      if (react) {
        entry.react = react.trimEnd();
        entry.shadcn = shadcnCode(name, entry.react, files);
      }
    } else {
      const owner = ownerOf(name);
      if (owner) extras.push([owner.name, name, entry]);
      else problems.push({ name, problem: "vue/blade/html example has no matching web component" });
      continue;
    }
    examples[name] = entry;
  }
  for (const [owner, name, entry] of extras) {
    const target = (examples[owner] ??= {});
    for (const [stack, code] of Object.entries(entry)) {
      const note = stack === "vue" ? `<!-- ${name} -->` : `{{-- ${name} --}}`;
      const label = stack === "html" ? `<!-- ${name} -->` : note;
      target[stack] = target[stack] ? `${target[stack]}\n\n${label}\n${code}` : code;
    }
  }
  return examples;
}

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
  const examples = buildExamples(root, components, problems);
  return { generatedAt: new Date().toISOString(), urls: URLS, components, foundations, tokens, frameworks: { examples }, problems };
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
