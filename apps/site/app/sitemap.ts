import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1 },
    { url: `${SITE_URL}/themes`, priority: 0.6 },
    ...source.getPages().map((page) => ({ url: `${SITE_URL}${page.url}`, priority: page.url.startsWith("/docs/components/") ? 0.7 : 0.8 })),
  ];
}
