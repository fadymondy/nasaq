import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Search engines and AI crawlers alike may read every page; /llms.txt and /<page>.md are their plain-text copies.
// /preview and /code are iframe and lazy-load payloads, not pages.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/preview/", "/code/"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }, { userAgent: AI_BOTS, allow: "/", disallow }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
