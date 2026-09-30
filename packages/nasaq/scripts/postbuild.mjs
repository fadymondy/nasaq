// Copies the CSS entry points next to the JS output.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgs = join(root, "..");
const files = [
  ["web/src/styles.css", "dist/web/styles.css"],
  ["tokens/dist/tokens.css", "dist/tokens.css"],
  ["tokens/dist/theme.css", "dist/theme.css"],
  ["electron/src/chrome.css", "dist/electron/chrome.css"],
];
for (const [from, to] of files) {
  const src = join(pkgs, from);
  if (!existsSync(src)) throw new Error(`missing ${src} (build @nasaq/tokens first)`);
  const out = join(root, to);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(src, out);
}
console.log("postbuild: copied", files.length, "files");
