// One definition of the Nasaq MCP server, shared by the stdio and the streamable HTTP entry points so the
// tools cannot drift. `catalog` is a function returning the current catalogue.
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { CATEGORIES, findComponent, loadCatalog, searchComponents, section } from "./catalog.mjs";

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
      "Docs: https://nasaq-ui.fadymondy.com. Components can also be added with the shadcn CLI: npx shadcn@latest add @nasaq/<name>.",
    ].join(" "),
  },
);

server.registerTool(
  "list_components",
  {
    title: "List Nasaq components",
    description: "Lists every Nasaq web component with its category, status, one-line summary and exports. Filter by category or a text query.",
    inputSchema: {
      category: z.enum(CATEGORIES).optional().describe("Only this category"),
      query: z.string().optional().describe("Free-text filter, e.g. 'table' or 'menu'"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ category, query }) => {
    const cat = catalog();
    let items = cat.components;
    if (category) items = items.filter((c) => c.category === category);
    if (query) {
      const hits = new Set(searchComponents({ components: items }, query, 100).map((h) => h.name));
      items = items.filter((c) => hits.has(c.name));
    }
    const byCategory = {};
    for (const c of items) (byCategory[c.category] ??= []).push(summaryOf(c));
    return text({ count: items.length, categories: byCategory, next: "get_component({ name }) returns the full manual." });
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
      "`include` picks what to return: readme (default, full manual), api (API section only), examples, source (TSX), story (Storybook CSF), all.",
    inputSchema: {
      name: z.string().min(1),
      include: z.array(z.enum(PARTS)).optional().describe("Default: ['readme']"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ name, include }) => {
    const c = findComponent(catalog(), name);
    if (!c) return notFound(name);
    const want = new Set(include?.length ? include : ["readme"]);
    const all = want.has("all");
    const out = [
      `# ${c.title} (${c.name})`,
      `category: ${c.category} · status: ${c.status}`,
      `import { ${c.exports.filter((e) => /^[A-Z]|^use/.test(e)).join(", ")} } from "@fadymondy/nasaq/web";`,
      `path: ${c.path}`,
      `install (shadcn registry): ${c.registry?.command ?? `npx shadcn@latest add @nasaq/${c.name}`}  (${c.registry?.url ?? `https://nasaq-ui.fadymondy.com/r/${c.name}.json`})`,
      c.related.length ? `related: ${c.related.join(", ")}` : null,
      c.story ? `lab: ${c.story.url}` : null,
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
    description: "Install command, CSS imports, NasaqProvider props and the usual app skeleton. Call once before building UI.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => text(catalog().foundations.find((f) => f.id === "setup").content),
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
