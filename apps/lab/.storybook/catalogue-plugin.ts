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

/**
 * `virtual:nasaq-exports`: each exported name of @nasaq/web mapped to the file the shadcn registry installs it
 * as (`@/components/ui/<file>`), so a component page can show its Quick start with shadcn import paths.
 */
const EXPORTS_ID = "virtual:nasaq-exports";
const EXPORTS_RESOLVED = `\0${EXPORTS_ID}`;

function exportsMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of readdirSync(COMPONENTS, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    let index: string;
    try {
      index = readFileSync(join(COMPONENTS, d.name, "index.ts"), "utf8");
    } catch {
      continue;
    }
    for (const [, file] of index.matchAll(/export \* from "\.\/([\w-]+)"/g)) {
      let src = "";
      for (const ext of [".tsx", ".ts"]) {
        try {
          src = readFileSync(join(COMPONENTS, d.name, file + ext), "utf8");
          break;
        } catch {}
      }
      const names = [
        ...[...src.matchAll(/export (?:declare )?(?:async )?(?:function|const|let|class|interface|type|enum) (\w+)/g)].map((m) => m[1]!),
        ...[...src.matchAll(/export (?:type )?\{([^}]+)\}/g)].flatMap((m) => m[1]!.split(",").map((n) => n.trim().split(/\s+as\s+/).pop()!.replace(/^type\s+/, ""))),
      ];
      for (const n of names) if (n && !(n in out)) out[n] = `@/components/ui/${file}`;
    }
  }
  return out;
}

export function catalogue(): Plugin {
  return {
    name: "nasaq:catalogue",
    resolveId: (id) => (id === ID ? RESOLVED : id === EXPORTS_ID ? EXPORTS_RESOLVED : undefined),
    load(id) {
      if (id === EXPORTS_RESOLVED) return `export const exportsMap = ${JSON.stringify(exportsMap())};`;
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
