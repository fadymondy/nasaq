import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { TemplateCards } from "@/components/template-cards";
import { baseOptions } from "@/lib/layout.shared";
import { jsonLd, ogImage, publisher, website } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { storeUrl, templates } from "@/lib/templates";

export const revalidate = 3600;

const title = "Website templates";
const description =
  "Ready-made website templates built on Nasaq: agency, business, clinic, portfolio, restaurant, store and more. Bilingual English and Arabic, light and dark, from the CircleXO template store.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/templates" },
  openGraph: { title, description, url: "/templates", type: "website", images: ogImage("/") },
  twitter: { card: "summary_large_image", title, description, images: ogImage("/") },
};

export default async function TemplatesPage() {
  const list = await templates();
  const url = `${SITE_URL}/templates`;
  const structured = jsonLd([
    publisher,
    website,
    {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      name: title,
      description,
      url,
      inLanguage: "en",
      isPartOf: { "@id": website["@id"] },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: list.length,
        itemListElement: list.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            name: `${t.name} website template`,
            description: t.description,
            image: t.thumbnail,
            url: storeUrl(t.id, "jsonld"),
            keywords: t.tags.join(", "),
            inLanguage: ["en", "ar"],
            ...(t.free ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } } : {}),
          },
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Nasaq", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: title, item: url },
      ],
    },
  ]);

  return (
    <HomeLayout {...baseOptions}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-3xl text-lg text-fd-muted-foreground">
            Complete sites made with Nasaq components and tokens in Nasaq Studio. Every template is bilingual (English and
            Arabic, LTR and RTL), ships light and dark, and installs from the CircleXO template store.
          </p>
          <a href={storeUrl(null, "templates-header")} target="_blank" rel="noopener" className="flex w-fit items-center gap-1.5 font-medium text-fd-primary">
            Browse all templates on CircleXO <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </header>
        {list.length ? (
          <TemplateCards list={list} placement="templates-page" />
        ) : (
          <p className="text-fd-muted-foreground">The catalogue is loading. Browse it on CircleXO meanwhile.</p>
        )}
      </main>
    </HomeLayout>
  );
}
