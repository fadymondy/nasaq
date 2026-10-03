import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

// The Vue entry carries its own copy of the locale/money helpers (its build cannot bundle @nasaq/html's types).
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
it.each(["locale", "money"])("lib/%s.ts matches packages/html", (name) => {
  expect(read(`src/lib/${name}.ts`).replace(/^\/\/ Copy of.*\r?\n/, "")).toBe(read(`../html/src/core/${name}.ts`));
});
