// A component folder's index.ts re-exports several files, but the registry ships flat files (ui/<file>.tsx),
// so `import { A, B } from "../name"` is split into one import per file that defines the symbol.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKIP = /\.(stories|test|spec|d)\./;
const DECL = /^export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+(\w+)/gm;
const LIST = /^export\s+(?:type\s+)?\{([^}]*)\}/gm;
const BARREL = /\b(import|export)(\s+type)?\s*\{([^}]*)\}\s*from\s*"\.\.\/([\w-]+)";/g;

export function createBarrelSplitter(componentsDir) {
  const maps = new Map();
  function exportMap(name) {
    if (maps.has(name)) return maps.get(name);
    const map = new Map();
    for (const file of readdirSync(join(componentsDir, name))) {
      if (!/\.tsx?$/.test(file) || file === "index.ts" || SKIP.test(file)) continue;
      const text = readFileSync(join(componentsDir, name, file), "utf8");
      const base = file.replace(/\.tsx?$/, "");
      for (const m of text.matchAll(DECL)) map.set(m[1], base);
      for (const m of text.matchAll(LIST))
        for (const part of m[1].split(",")) {
          const sym = part.trim().split(/\s+as\s+/).pop().replace(/^type\s+/, "");
          if (sym) map.set(sym, base);
        }
    }
    maps.set(name, map);
    return map;
  }

  return function split(code, self) {
    return code.replace(BARREL, (all, kw, ty = "", list, name) => {
      if (name === self) return all;
      let map;
      try {
        map = exportMap(name);
      } catch {
        return all; // not a component folder (lib, provider, ...)
      }
      const byFile = new Map();
      for (const raw of list.split(",")) {
        const item = raw.trim();
        if (!item) continue;
        const sym = item.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        const file = map.get(sym);
        if (!file) throw new Error(`${self}: ${sym} is not exported by a file in components/${name}`);
        byFile.set(file, [...(byFile.get(file) ?? []), item]);
      }
      return [...byFile].map(([file, items]) => `${kw}${ty} { ${items.join(", ")} } from "../${name}/${file}";`).join("\n");
    });
  };
}
