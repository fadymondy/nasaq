// Copies the CSS entry points next to the JS output.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
// The no-flash theme script as a static file, for strict CSPs (`<script src>`, no nonce).
const { nasaqThemeScriptFile } = await import(pathToFileURL(join(root, "dist/web/src/provider/theme-script.js")).href);
writeFileSync(join(root, "dist/theme-script.js"), nasaqThemeScriptFile());
console.log("postbuild: copied", files.length, "files");
