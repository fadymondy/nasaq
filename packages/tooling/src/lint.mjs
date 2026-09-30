#!/usr/bin/env node
// Nasaq lint: components must be direction-agnostic and token-driven.
//  - no physical Tailwind classes (ml-, pr-, left-, text-right, border-l, rounded-r…): use logical ones
//    (ms-, pe-, start-, text-end, border-s, rounded-e…) so RTL works without overrides;
//  - no raw hex colours: use --nq-* tokens.
// Usage: nasaq-lint <dir…>   (scans .ts/.tsx, skips *.stories.tsx and tests)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PHYSICAL = [
  // margin / padding / inset / scroll margin+padding
  /(?<![\w-])-?(?:m|p|scroll-m|scroll-p)[lr]-(?:\[[^\]]+\]|[\w./]+)/g,
  /(?<![\w-])-?(?:left|right)-(?!to-)(?:\[[^\]]+\]|[\w./]+)/g,
  // alignment, float, clear
  /(?<![\w-])(?:text|float|clear)-(?:left|right)(?![\w-])/g,
  // borders and radii
  /(?<![\w-])border-[lr](?:-(?:\[[^\]]+\]|[\w./]+))?(?![\w-])/g,
  /(?<![\w-])rounded-(?:[lr]|[tb][lr])(?:-(?:\[[^\]]+\]|[\w./]+))?(?![\w-])/g,
];
const HEX = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;

function* files(dir) {
  if (!statSync(dir).isDirectory()) return yield dir;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "node_modules" && name !== "generated") yield* files(p);
    } else if (/\.tsx?$/.test(name) && !/\.(stories|test|spec)\.tsx?$/.test(name)) yield p;
  }
}

const problems = [];
for (const dir of process.argv.slice(2)) {
  for (const file of files(dir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/nasaq-lint-ignore/.test(line) || /nasaq-lint-ignore-next-line/.test(lines[i - 1] ?? "")) return;
      const code = line.replace(/\/\/.*$/, "");
      for (const re of PHYSICAL) for (const m of code.matchAll(re)) problems.push([file, i + 1, `physical class "${m[0]}": use the logical one`]);
      for (const m of code.matchAll(HEX)) problems.push([file, i + 1, `raw hex "${m[0]}": use a --nq-* token`]);
    });
  }
}
for (const [f, l, msg] of problems) console.error(`${relative(process.cwd(), f)}:${l}  ${msg}`);
console.log(`nasaq-lint: ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
process.exit(problems.length ? 1 : 0);
