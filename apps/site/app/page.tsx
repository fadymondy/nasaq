import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import {
  Accessibility, ArrowUpRight, Atom, BookOpen, Bot, Code, Coins, Languages, LayoutGrid, type LucideIcon, Moon, Palette, Rocket, Server, SwatchBook,
} from "lucide-react";
import Link from "next/link";
import { TemplateCards } from "@/components/template-cards";
import { GROUPS, groupIcon } from "@/lib/groups";
import { baseOptions } from "@/lib/layout.shared";
import { jsonLd, publisher, SITE_DESCRIPTION, website } from "@/lib/seo";
import { REGISTRY_URL, SITE_URL } from "@/lib/site";
import { storeUrl, templates } from "@/lib/templates";

export const revalidate = 3600;

const QUICK_LINKS: { title: string; text: string; href: string; icon: LucideIcon }[] = [
  { title: "Getting started", text: "Add the preset and your first component, then learn how the pieces fit together.", href: "/guides/get-started", icon: Rocket },
  { title: "React", text: "Base UI components with Nasaq tokens, from the npm package.", href: "/guides/get-started-react", icon: Atom },
  { title: "shadcn", text: "Copy any component into your project with the shadcn CLI and own the code.", href: "/guides/get-started-shadcn", icon: Code },
  { title: "Vue 3", text: "The same components as Vue single-file components.", href: "/guides/get-started-vue", icon: SwatchBook },
  { title: "Laravel & Filament", text: "Blade components for Laravel, Livewire and FilamentPHP panels.", href: "/guides/get-started-laravel", icon: Server },
  { title: "HTML + Alpine.js", text: "Plain markup on nasaq.css with Alpine.js for behaviour. No build step.", href: "/guides/get-started-html", icon: BookOpen },
  { title: "Theming", text: "Brand and action colours, the ready-made brand themes and your own.", href: "/guides/theming", icon: Palette },
  { title: "Tokens", text: "The --nq-* variables behind every colour, space, radius and type size.", href: "/guides/tokens", icon: Coins },
  { title: "Dark mode", text: "Light and dark from the same tokens, with no extra classes.", href: "/guides/dark-mode", icon: Moon },
  { title: "RTL & Arabic", text: "Every component mirrors for right-to-left and ships Arabic type.", href: "/guides/rtl-and-arabic", icon: Languages },
  { title: "Accessibility", text: "Keyboard, focus and screen-reader rules each component follows.", href: "/guides/accessibility", icon: Accessibility },
  { title: "MCP server", text: "Teach your AI assistant Nasaq: setup, components and their manuals.", href: "/guides/mcp-server", icon: Bot },
];

const total = GROUPS.reduce((n, g) => n + g.names.length, 0);

const structured = jsonLd([
  publisher,
  website,
  {
    "@type": "SoftwareApplication",
    name: "Nasaq",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    license: "https://opensource.org/licenses/MIT",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": publisher["@id"] },
  },
]);

export default async function HomePage() {
  const list = await templates();
  return (
    <HomeLayout {...baseOptions}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-16">
        <header className="flex flex-col items-center gap-4 text-center">
          <img src="/brand/nasaq-mark.svg" alt="" width={56} height={56} className="size-14 dark:hidden" />
          <img src="/brand/nasaq-mark-on-dark.svg" alt="" width={56} height={56} className="hidden size-14 dark:block" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Nasaq Documentation</h1>
          <p className="max-w-2xl text-lg text-fd-muted-foreground">
            One product language, every surface. {total} components for React, shadcn, Vue 3, Laravel Blade and HTML + Alpine.js,
            in light and dark, English and Arabic.
          </p>
          <div className="w-full max-w-2xl text-start">
            <DynamicCodeBlock lang="bash" code={`npx shadcn@latest add ${REGISTRY_URL}/nasaq.json`} />
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Quick links</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map(({ title, text, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="flex h-full flex-col gap-3 rounded-xl border bg-fd-card p-5 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40">
                  <Icon className="size-5 text-fd-primary" aria-hidden />
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm text-fd-muted-foreground">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-semibold">Components by group</h2>
            <Link href="/components" className="flex items-center gap-1.5 text-sm font-medium text-fd-primary">
              <LayoutGrid className="size-4" aria-hidden /> All {total} components
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GROUPS.map((g) => {
              const Icon = groupIcon(g.key);
              return (
                <li key={g.key}>
                  <Link href={`/components/groups/${g.key}`} className="flex items-center gap-3 rounded-lg border bg-fd-card px-4 py-3 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40">
                    <Icon className="size-4 shrink-0 text-fd-primary" aria-hidden />
                    <span className="flex-1 truncate text-sm font-medium">{g.label}</span>
                    <span className="text-xs text-fd-muted-foreground tabular-nums">{g.names.length}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {list.length ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Website templates</h2>
                <p className="text-sm text-fd-muted-foreground">Complete bilingual sites built with Nasaq in Nasaq Studio, ready in the CircleXO template store.</p>
              </div>
              <Link href="/templates" className="flex items-center gap-1.5 text-sm font-medium text-fd-primary">
                All {list.length} templates <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
            <TemplateCards list={list.slice(0, 6)} placement="home" />
            <a href={storeUrl(null, "home")} target="_blank" rel="noopener" className="self-center text-sm font-medium text-fd-primary">
              Browse the CircleXO template store
            </a>
          </section>
        ) : null}
      </main>
    </HomeLayout>
  );
}
