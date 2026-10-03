/** Nasaq Studio's public theme catalogue: website templates built on Nasaq and sold in the CircleXO template store. */
export const STUDIO_URL = "https://studio.nasaqui.com";
export const STORE_URL = "https://app.circlexo.com/templates";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  free: boolean;
  thumbnail: string;
  darkThumbnail?: string;
  demoUrl?: string;
}

interface CatalogueItem {
  id: string;
  name: { en: string };
  description: { en: string };
  category?: string;
  tags?: string[];
  free?: boolean;
  previews?: { thumbnail?: string; screens?: string[] };
  liveDemo?: boolean;
  demoViewerUrl?: string;
}

/** A store link tagged so CircleXO can see the traffic the docs send it. */
export function storeUrl(id: string | null, placement: string) {
  const utm = `utm_source=docs.nasaqui.com&utm_medium=referral&utm_campaign=nasaq-templates&utm_content=${placement}`;
  return `${id ? `${STORE_URL}/${id}` : STORE_URL}?${utm}`;
}

/** The live catalogue, refreshed hourly. An empty list if Studio is down, so the docs still build and render. */
export async function templates(): Promise<Template[]> {
  try {
    const res = await fetch(`${STUDIO_URL}/api/themes`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const { items } = (await res.json()) as { items: CatalogueItem[] };
    return items
      .filter((t) => t.previews?.thumbnail)
      .map((t) => ({
        id: t.id,
        name: t.name.en,
        description: t.description.en,
        category: t.category ?? "",
        tags: t.tags ?? [],
        free: t.free ?? false,
        thumbnail: t.previews!.thumbnail!,
        darkThumbnail: t.previews?.screens?.find((s) => s.endsWith("-dark.png")),
        demoUrl: t.liveDemo ? t.demoViewerUrl : undefined,
      }));
  } catch {
    return [];
  }
}
