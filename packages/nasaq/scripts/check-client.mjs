// Verifies the built web output is safe to import from a React Server Component tree:
//  - every dist/web module that calls a hook or creates a context starts with "use client";
//  - no directive-less module imports a client-only third-party library.
// Exit code 1 lists the offenders.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "web");
const HOOK_CALL = /\buse[A-Z][A-Za-z0-9]*\s*\(|\bcreateContext\s*\(|\bforwardRef\s*\(/;
const REACT_STATE_IMPORT = /import\s*\{[^}]*\b(use[A-Z]\w*|createContext|forwardRef|Component|PureComponent)\b[^}]*\}\s*from\s*["']react["']/;
const CLIENT_ONLY = /from\s*["'](recharts|sonner|embla-carousel-react|react-resizable-panels|@tiptap\/[^"']+|@xyflow\/react[^"']*|@dnd-kit\/[^"']+|frimousse|react-markdown|@base-ui\/react\/(?:use-render|direction-provider))["']/;
const DIRECTIVE = /^\s*["']use client["']/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".js")) yield p;
  }
}

const bad = [];
let total = 0;
let client = 0;
for (const file of walk(root)) {
  total++;
  const code = readFileSync(file, "utf8");
  if (DIRECTIVE.test(code)) {
    client++;
    continue;
  }
  const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  if (HOOK_CALL.test(stripped) || REACT_STATE_IMPORT.test(stripped)) bad.push([file, "uses a React hook or context without \"use client\""]);
  else if (CLIENT_ONLY.test(stripped)) bad.push([file, "imports a client-only library without \"use client\""]);
}
if (bad.length) {
  for (const [f, why] of bad) console.error(`  ${relative(process.cwd(), f)}: ${why}`);
  console.error(`check-client: ${bad.length} module(s) would fail in a Server Component`);
  process.exit(1);
}
console.log(`check-client: ok (${client} client modules, ${total - client} server-safe modules, ${total} total)`);
