// Snapshots the live catalogue to catalog.json so the published package works outside the repo.
import { writeFileSync } from "node:fs";
import { buildCatalog, findRoot } from "../src/catalog.mjs";

const root = findRoot();
if (!root) throw new Error("Run inside the Nasaq repo (or set NASAQ_ROOT).");
const catalog = buildCatalog(root);
writeFileSync(new URL("../catalog.json", import.meta.url), JSON.stringify(catalog));
console.log(`catalog.json: ${catalog.components.length} components, ${catalog.foundations.length} docs, ${catalog.tokens.length} tokens`);
if (catalog.problems.length) console.warn(`${catalog.problems.length} README problems; run pnpm check:components`);
