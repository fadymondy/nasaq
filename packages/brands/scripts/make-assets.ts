// Writes the Nasaq mark assets from its MarkSpec: marks for paper and dark grounds, an adaptive favicon
// and the app-icon master. Run: pnpm --filter @nasaq/brands assets. The mark is a proposal (D-6);
// PNG icon sets are rendered from app-icon.svg once it is approved.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { markSvg, NASAQ_MARK } from "../src/index";

// Run from the package directory (the `assets` script does).
const out = join(process.cwd(), "assets");
mkdirSync(out, { recursive: true });
const write = (name: string, svg: string) => writeFileSync(join(out, name), `${svg}\n`);

write("nasaq-mark.svg", markSvg(NASAQ_MARK, { scheme: "light" }));
write("nasaq-mark-on-dark.svg", markSvg(NASAQ_MARK, { scheme: "dark" }));
// Follows the browser's colour scheme; small sizes drop the gold accent (it stops reading under ~20px).
write("favicon.svg", markSvg(NASAQ_MARK, { scheme: "auto", padding: 0.08, withoutAccent: true }));
// The ink ground (primitive ink-900) with the on-dark body, the same square every product icon uses.
const INK = "#0E1A3C";
write("app-icon.svg", markSvg(NASAQ_MARK, { scheme: "dark", ground: INK, padding: 0.22 }));
console.log("brands: wrote nasaq-mark.svg, nasaq-mark-on-dark.svg, favicon.svg, app-icon.svg");
