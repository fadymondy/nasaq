// Runs before npm packs the package: every file the exports map points at must exist.
// 0.3.0 shipped with only the CSS because a second build cleaned dist between build and publish.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const targets = [];
const walk = (v) => (typeof v === "string" ? targets.push(v) : Object.values(v ?? {}).forEach(walk));
walk(pkg.exports);
const missing = targets.filter((t) => !existsSync(join(root, t)));
if (missing.length) {
  console.error(`check-dist: ${missing.length} of ${targets.length} export targets are missing (run the build again):\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-dist: ${targets.length} export targets present`);
