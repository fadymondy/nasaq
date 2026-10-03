import { GROUPS } from "./groups";
import { SITE_URL } from "./site";

export const SITE_NAME = "Nasaq";
export const SITE_DESCRIPTION =
  "Nasaq (نسق) is a bilingual English/Arabic design system: --nq-* tokens, brand themes and components for React, shadcn, Vue 3, Laravel Blade and HTML + Alpine.js, in light, dark, LTR and RTL.";

const groupOf = new Map(GROUPS.flatMap((g) => g.names.map((n) => [n, g] as const)));

/** The Open Graph image for a page: /og/<path>.png (app/og/[...slug]/route.tsx). */
export const ogImage = (url: string) => `/og${url === "/" ? "/index" : url}.png`;

/** The markdown copy of a page that scripts/sync-docs.mjs writes to public/<path>.md. */
export const markdownUrl = (url: string) => `${url}.md`;

/** Home > Section > (component group) > page, for the breadcrumb JSON-LD. */
export function breadcrumbs(url: string, title: string) {
  const [section, name] = url.split("/").filter(Boolean);
  const items: { name: string; url: string }[] = [{ name: SITE_NAME, url: SITE_URL }];
  if (section === "components") {
    items.push({ name: "Components", url: `${SITE_URL}/components` });
    const group = name ? groupOf.get(name) : undefined;
    if (group) items.push({ name: group.label, url: `${SITE_URL}/components/groups/${group.key}` });
  } else if (section === "guides") items.push({ name: "Guides", url: `${SITE_URL}/guides/get-started` });
  if (name || section !== "components") items.push({ name: title, url: `${SITE_URL}${url}` });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export const publisher = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/brand/app-icon.svg`,
  sameAs: ["https://github.com/fadymondy/nasaq", "https://www.npmjs.com/package/@fadymondy/nasaq", "https://nasaqui.com"],
};

export const website = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: `${SITE_NAME} Documentation`,
  url: SITE_URL,
  inLanguage: "en",
  publisher: { "@id": publisher["@id"] },
};

/** A JSON-LD <script> payload; `<` is escaped so page text can never close the tag. */
export const jsonLd = (graph: object[]) =>
  JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
