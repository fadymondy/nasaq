import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import Link from "next/link";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { LAB_URL, REGISTRY_URL } from "@/lib/site";

const registriesSnippet = `{
  "registries": {
    "@nasaq": "${REGISTRY_URL}/{name}.json"
  }
}`;

function Step({ title, lang, code, children }: { title: string; lang: string; code: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <p className="text-fd-muted-foreground">{children}</p> : null}
      <DynamicCodeBlock lang={lang} code={code} />
    </section>
  );
}

export default function HomePage() {
  return (
    <HomeLayout {...baseOptions}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight">Nasaq (نسق)</h1>
          <p className="text-lg text-fd-muted-foreground">
            One product language, every surface. Nasaq is a design system of <code>--nq-*</code> tokens, seventeen brand
            themes and 390 components, built for light, dark, LTR and RTL. The same markup ships for React, shadcn, Vue 3,
            Laravel Blade (Livewire, Filament) and plain HTML with Alpine.js, and an MCP server teaches it to your AI.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/docs/components" className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground">
              Browse components
            </Link>
            <Link href="/docs/guides/get-started" className="rounded-md border px-4 py-2 text-sm font-medium">
              Get started
            </Link>
            <Link href="/themes" className="rounded-md border px-4 py-2 text-sm font-medium">
              Brand themes
            </Link>
            <a href={LAB_URL} className="rounded-md border px-4 py-2 text-sm font-medium">
              Open the lab
            </a>
          </div>
        </header>

        <Step title="1. Add the preset" lang="bash" code={`npx shadcn@latest add ${REGISTRY_URL}/nasaq.json`}>
          Tokens, brands, the <code>cn</code> util and <code>NasaqProvider</code>. Every component depends on it.
        </Step>
        <Step title="2. Register Nasaq in components.json" lang="json" code={registriesSnippet}>
          Then add any component by short name: <code>npx shadcn@latest add @nasaq/button</code>.
        </Step>
        <Step title="Or install from npm" lang="bash" code="pnpm add @fadymondy/nasaq">
          The same components as a package, if you prefer a dependency to copied files.
        </Step>
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Other stacks</h2>
          <p className="text-fd-muted-foreground">
            <Link href="/docs/guides/get-started-vue" className="underline">Vue 3</Link>,{" "}
            <Link href="/docs/guides/get-started-laravel" className="underline">Laravel, Livewire and Filament</Link>,{" "}
            <Link href="/docs/guides/get-started-inertia" className="underline">Inertia</Link> and{" "}
            <Link href="/docs/guides/get-started-html" className="underline">plain HTML + Alpine.js</Link>. Every component page
            has a live preview and the code for each stack.
          </p>
        </section>
      </main>
    </HomeLayout>
  );
}
