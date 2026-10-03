import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

const built = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: built, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/components`, lastModified: built, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/themes`, lastModified: built, changeFrequency: "monthly", priority: 0.6 },
    ...source
      .getPages()
      .filter((page) => page.url !== "/components")
      .map((page) => ({
        url: `${SITE_URL}${page.url}`,
        lastModified: built,
        changeFrequency: "monthly" as const,
        priority: page.url.startsWith("/components/") ? 0.7 : 0.8,
      })),
  ];
}
