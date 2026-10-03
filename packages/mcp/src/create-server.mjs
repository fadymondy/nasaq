// One definition of the Nasaq MCP server, shared by the stdio and the streamable HTTP entry points so the
// tools cannot drift. `catalog` is a function returning the current catalogue.
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATEGORIES, FRAMEWORKS, findComponent, loadCatalog, searchComponents, section, setupTopic, snippetStack } from "./catalog.mjs";

export const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

/** Live mode re-reads the repo at most once per second; snapshot mode loads catalog.json once. */
export function catalogProvider({ snapshot = false } = {}) {
  let cache;
  let cachedAt = 0;
  return () => {
    if (!cache || (cache.mode === "live" && Date.now() - cachedAt > 1000)) {
      cache = loadCatalog({ snapshot });
      cachedAt = Date.now();
    }
    return cache;
  };
}

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

const summaryOf = (c) => ({ name: c.name, title: c.title, category: c.category, status: c.status, summary: c.summary, exports: c.exports });

const frameworkArg = z
  .enum(FRAMEWORKS)
  .optional()
  .describe(
    "Default react (@fadymondy/nasaq/web). shadcn: the same React components copied by the shadcn CLI. inertia / inertia-vue: Laravel + Inertia. " +
      "vue / nuxt / inertia-vue: Vue 3. blade / livewire / filament / laravel / tomatophp: Laravel Blade components. html / alpine: rendered HTML run by Alpine.",
  );

/** Per-stack examples from the catalogue: { [name]: { react, shadcn, vue, blade, html } }. Older snapshots have none. */
const examplesOf = (cat) => cat.frameworks?.examples ?? {};

const STACK_LABEL = { react: "React", shadcn: "shadcn", vue: "Vue", blade: "Blade", html: "HTML + Alpine" };

/** Names that have an example in a stack. */
function portedNames(cat, stack) {
  const ex = examplesOf(cat);
  return Object.keys(ex).filter((n) => ex[n][stack]);
}

const fence = (lang, code) => ["```" + lang, code, "```"].join("\n");

export function createNasaqServer(catalog) {
  function notFound(name) {
    const hints = searchComponents(catalog(), name, 5).map((h) => h.name);
    return fail(`No component "${name}".${hints.length ? ` Did you mean: ${hints.join(", ")}?` : ""} Call list_components to see them all.`);
  }

  const server = new McpServer(
  { name: "nasaq", version: pkg.version },
  {
    instructions: [
      "Nasaq (نسق) is a bilingual (English/Arabic, LTR/RTL) React design system built on Base UI and Tailwind v4.",
      "Before writing UI with Nasaq: call get_setup once, then list_components or search_components to find the right component,",
      "then get_component for its manual (props, examples, accessibility, RTL rules). Use only props the manual documents.",
      "Colours come from tokens (bg-nq-*, text-nq-*); never hard-code hex. Never recolour, mirror or redraw a product logo.",
      "Docs: https://docs.nasaqui.com. Components can also be added with the shadcn CLI: npx shadcn@latest add @nasaq/<name>.",
      "Not on React? Pass `framework` (shadcn, inertia, inertia-vue, vue, nuxt, blade, livewire, filament, laravel, tomatophp, html, alpine) to get_setup,",
      "list_components and get_component: get_setup returns that stack's guide and get_component a component's code for it.",
      "Components are ported to Vue, Blade and HTML + Alpine one by one; an unported one says so, and React or shadcn cover it meanwhile.",
    ].join(" "),
  },
);

server.registerTool(
  "list_components",
  {
    title: "List Nasaq components",
    description:
      "Lists every Nasaq web component with its category, status, one-line summary and exports. Filter by category or a text query. " +
      "With a non-React `framework`, lists only the components that exist in that stack.",
    inputSchema: {
      category: z.enum(CATEGORIES).optional().describe("Only this category"),
      query: z.string().optional().describe("Free-text filter, e.g. 'table' or 'menu'"),
      framework: frameworkArg,
    },
    annotations: { readOnlyHint: true },
  },
  async ({ category, query, framework }) => {
    const cat = catalog();
    let items = cat.components;
    const stack = framework ? snippetStack(framework) : "react";
    if (stack !== "react" && stack !== "shadcn") {
      const ported = new Set(portedNames(cat, stack));
      items = items.filter((c) => ported.has(c.name));
    }
    if (category) items = items.filter((c) => c.category === category);
    if (query) {
      const hits = new Set(searchComponents({ components: items }, query, 100).map((h) => h.name));
      items = items.filter((c) => hits.has(c.name));
    }
    const byCategory = {};
    for (const c of items) (byCategory[c.category] ??= []).push(summaryOf(c));
    const next =
      stack === "react"
        ? "get_component({ name }) returns the full manual."
        : `get_component({ name, framework: "${framework}" }) returns the ${framework} markup. get_setup({ framework: "${framework}" }) covers installation.`;
    return text({ count: items.length, framework: framework ?? "react", categories: byCategory, next });
  },
);

server.registerTool(
  "search_components",
  {
    title: "Search Nasaq components",
    description: "Ranks components for a need described in words, e.g. 'switch between products', 'empty state', 'keyboard shortcut'.",
    inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(30).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ query, limit }) => {
    const hits = searchComponents(catalog(), query, limit ?? 8);
    return hits.length ? text(hits) : fail(`Nothing matches "${query}". Try list_components.`);
  },
);

const PARTS = ["readme", "api", "examples", "source", "story", "all"];

server.registerTool(
  "get_component",
  {
    title: "Get a Nasaq component",
    description:
      "Returns one component's details and manual. `name` may be the folder (app-shell), the title (AppShell) or any export (SidebarItem). " +
      "`include` picks what to return: readme (default, full manual), api (API section only), examples, source (TSX), story (Storybook CSF), all. " +
      "`framework` returns the component in another stack (html, alpine, vue, blade, livewire, filament, inertia, shadcn, …).",
    inputSchema: {
      name: z.string().min(1),
      include: z.array(z.enum(PARTS)).optional().describe("Default: ['readme']"),
      framework: frameworkArg,
    },
    annotations: { readOnlyHint: true },
  },
  async ({ name, include, framework }) => {
    const cat = catalog();
    const c = findComponent(cat, name);
    if (!c) return notFound(name);
    const ex = examplesOf(cat)[c.name] ?? {};
    const stacks = ["vue", "blade", "html"].filter((k) => ex[k]);
    const stack = framework ? snippetStack(framework) : "react";
    if (stack !== "react") {
      const code = ex[stack];
      if (!code) {
        const label = STACK_LABEL[stack] ?? framework;
        const ported = portedNames(cat, stack);
        return fail(
          `${c.title} (${c.name}) is not ported yet to ${label}. Use React (get_component({ name: "${c.name}" })) or shadcn (framework: "shadcn") meanwhile. ` +
            `Components ported to ${label} so far: ${ported.length ? ported.join(", ") : "none"}.`,
        );
      }
      const out = [`# ${c.title} (${c.name}) for ${framework}`, c.summary, `setup: get_setup({ framework: "${framework}" })`];
      if (stack === "shadcn") {
        out.push(
          "",
          `Install: ${c.registry?.command ?? `npx shadcn@latest add @nasaq/${c.name}`}. The files land in components/ui and import from "@/components/ui/<file>"; props and behaviour match the React manual.`,
          "",
          fence("tsx", code),
        );
      } else if (stack === "vue") {
        out.push("", 'Components are `Nq*` from "@fadymondy/nasaq/vue".', "", fence("vue", code));
      } else if (stack === "blade") {
        out.push("", "Blade components `<x-nq::name>` from the Composer package fadymondy/nasaq-php.");
        if (framework === "livewire")
          out.push('For Livewire, `wire:model` works on stateful roots (dialog and tabs are x-modelable), e.g. `<x-nq::dialog wire:model="open">`.');
        out.push("", fence("blade", code));
        if (ex.html) out.push("", "What it renders (HTML, run by Alpine):", "", fence("html", ex.html));
      } else {
        out.push(
          "",
          "The HTML Blade renders for this component. It runs with the Alpine plugin (@fadymondy/nasaq/alpine) or the CDN script dist/cdn/nasaq-alpine.js.",
          "",
          fence("html", code),
        );
      }
      out.push("", `Behaviour, accessibility and content rules are shared with React: get_component({ name: "${c.name}" }).`);
      return text(out.join("\n"));
    }
    const want = new Set(include?.length ? include : ["readme"]);
    const all = want.has("all");
    const out = [
      `# ${c.title} (${c.name})`,
      `category: ${c.category} · status: ${c.status}`,
      `import { ${c.exports.filter((e) => /^[A-Z]|^use/.test(e)).join(", ")} } from "@fadymondy/nasaq/web";`,
      `path: ${c.path}`,
      `install (shadcn registry): ${c.registry?.command ?? `npx shadcn@latest add @nasaq/${c.name}`}  (${c.registry?.url ?? `https://docs.nasaqui.com/r/${c.name}.json`})`,
      c.related.length ? `related: ${c.related.join(", ")}` : null,
      c.story ? `lab: ${c.story.url}` : null,
      stacks.length ? `other stacks: shadcn, ${stacks.map((k) => ({ vue: "vue", blade: "blade", html: "html/alpine" })[k]).join(", ")}; get_component({ name: "${c.name}", framework })` : null,
    ].filter(Boolean);
    if (!c.readme) out.push("", "⚠ This component has no README yet; rely on its source.");
    if (c.readme && (all || want.has("readme"))) out.push("", c.readme);
    else {
      if (want.has("api")) out.push("", section(c.readme, "API") ?? "(no API section)");
      if (want.has("examples")) out.push("", section(c.readme, "Examples") ?? "(no Examples section)");
    }
    if (all || want.has("source") || !c.readme) out.push("", `## Source: ${c.path}/${c.name}.tsx`, "```tsx", c.source.trimEnd(), "```");
    if (all || want.has("story"))
      out.push("", c.story ? `## Story: ${c.story.file}\n\`\`\`tsx\n${c.story.source.trimEnd()}\n\`\`\`` : "## Story\n(no story)");
    return text(out.join("\n"));
  },
);

server.registerTool(
  "get_foundation",
  {
    title: "Get a Nasaq foundations doc",
    description: "Design rules behind the components: colour roles, layout and density, architecture, brand/logo rules, README spec. Omit `topic` to list topics.",
    inputSchema: { topic: z.string().optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ topic }) => {
    const { foundations } = catalog();
    if (!topic) return text(foundations.map(({ id, title }) => ({ id, title })));
    const f = foundations.find((x) => x.id === topic.toLowerCase() || x.title.toLowerCase().includes(topic.toLowerCase()));
    return f ? text(f.content) : fail(`No topic "${topic}". Topics: ${foundations.map((x) => x.id).join(", ")}`);
  },
);

server.registerTool(
  "list_tokens",
  {
    title: "List Nasaq design tokens",
    description:
      "CSS custom properties (--nq-*) with their value in each context (light, dark, brand, density). Filter by prefix, e.g. '--nq-danger' or 'surface'. " +
      "In Tailwind use them as utilities: bg-nq-surface, text-nq-fg-muted, border-nq-border.",
    inputSchema: { prefix: z.string().optional(), limit: z.number().int().min(1).max(500).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ prefix, limit }) => {
    const { tokens } = catalog();
    const p = prefix?.toLowerCase();
    const hits = p ? tokens.filter((t) => (p.startsWith("--") ? t.name.startsWith(p) : t.name.includes(p))) : tokens;
    const max = limit ?? 120;
    return text({ total: hits.length, shown: Math.min(max, hits.length), tokens: hits.slice(0, max) });
  },
);

server.registerTool(
  "get_setup",
  {
    title: "How to install and set up Nasaq",
    description:
      "Install command, CSS imports, provider and the usual app skeleton. Call once before building UI. " +
      "`framework` picks the guide: react (default), shadcn, inertia, html, alpine, vue, or blade/livewire/filament/laravel/tomatophp.",
    inputSchema: { framework: frameworkArg },
    annotations: { readOnlyHint: true },
  },
  async ({ framework } = {}) => {
    const { foundations } = catalog();
    const topic = framework ? setupTopic(framework) : "setup";
    const guide = foundations.find((f) => f.id === topic);
    if (!guide) return fail(`No ${framework} guide in this catalogue. Update @fadymondy/nasaq-mcp.`);
    const others = foundations.filter((f) => f.id.startsWith("setup-") || f.id === "get-started").map((f) => f.id);
    return text(`${guide.content}\n\n---\nOther stacks: get_foundation({ topic }) with ${others.join(", ")}, or get_setup({ framework }).`);
  },
);

server.registerResource(
  "catalog",
  "nasaq://catalog",
  { title: "Nasaq component catalogue", description: "Every component with category, summary and exports", mimeType: "application/json" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(catalog().components.map(summaryOf), null, 2) }] }),
);

server.registerResource(
  "component",
  new ResourceTemplate("nasaq://components/{name}", {
    list: async () => ({
      resources: catalog().components.map((c) => ({ uri: `nasaq://components/${c.name}`, name: c.title, description: c.summary, mimeType: "text/markdown" })),
    }),
  }),
  { title: "Nasaq component manual", description: "A component's README", mimeType: "text/markdown" },
  async (uri, { name }) => {
    const c = findComponent(catalog(), name);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: c?.readme ?? (c ? `No README for ${c.name}.` : `No component "${name}".`) }] };
  },
);

return server;
}
