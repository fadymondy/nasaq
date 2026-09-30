// Fails when a component breaks docs/COMPONENT-README.md: no README, bad frontmatter, exports that
// drift from the source, or no story. Same rules the MCP catalogue reports as `problems`.
import { buildCatalog } from "../packages/mcp/src/catalog.mjs";

const { components, problems } = buildCatalog(new URL("..", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const missingStory = components.filter((c) => c.readme && !c.story && !c.storyMissing).map((c) => ({ name: c.name, problem: "no story" }));
const all = [...problems, ...missingStory];

for (const { name, problem } of all) console.error(`✗ ${name}: ${problem}`);
const flagged = components.filter((c) => c.storyMissing).map((c) => c.name);
if (flagged.length) console.warn(`! story-missing (TODO): ${flagged.join(", ")}`);
console.log(`${components.length} components, ${all.length} problems`);
process.exit(all.length ? 1 : 0);
