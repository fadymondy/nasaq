import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * `virtual:nasaq-catalogue`: the component list for the Docs/Catalogue page, read from each component
 * README's frontmatter at build time, so the docs never list a component that does not exist.
 * Also carries the brand count. Edits to a README reload the module in dev.
 */
const ID = "virtual:nasaq-catalogue";
const RESOLVED = `\0${ID}`;
const COMPONENTS = resolve(import.meta.dirname, "../../../packages/web/src/components");

function frontmatter(md: string): Record<string, string> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  const out: Record<string, string> = {};
  for (const line of (m?.[1] ?? "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0 && !/^\s/.test(line)) out[line.slice(0, i).trim()] = line.slice(i + 1).replace(/\s+#.*$/, "").trim();
  }
  return out;
}

export function catalogue(): Plugin {
  return {
    name: "nasaq:catalogue",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const items = readdirSync(COMPONENTS, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .flatMap((d) => {
          const file = join(COMPONENTS, d.name, "README.md");
          let md: string;
          try {
            md = readFileSync(file, "utf8");
          } catch {
            return [];
          }
          this.addWatchFile(file);
          const f = frontmatter(md);
          return [{ name: d.name, title: f.title ?? d.name, category: f.category ?? "utilities", status: f.status ?? "", summary: f.summary ?? "", story: f.story ?? "" }];
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return `export const components = ${JSON.stringify(items)};`;
    },
  };
}
