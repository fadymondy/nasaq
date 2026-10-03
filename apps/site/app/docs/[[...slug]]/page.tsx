import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { type CodeStack, ComponentCode } from "@/components/component-code";
import { ComponentPreview } from "@/components/component-preview";
import codeStacks from "@/lib/code.generated.json";
import previews from "@/lib/previews.generated.json";
import { source } from "@/lib/source";

const withPreview = new Set<string>(previews);
const stacksOf = codeStacks as unknown as Record<string, [CodeStack, ...CodeStack[]]>; // sync-docs only writes non-empty lists

/** The first stack's source, read at build time from public/code (see scripts/sync-docs.mjs). */
async function firstStack(name: string, stacks: [CodeStack, ...CodeStack[]]) {
  const all = JSON.parse(await readFile(join(process.cwd(), "public/code", `${name}.json`), "utf8")) as Record<string, string>;
  return all[stacks[0].stack] ?? "";
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const Body = page.data.body;
  const name = slug?.[0] === "components" ? slug[1] : undefined;
  const component = name && withPreview.has(name) ? name : null;
  const stacks = name ? stacksOf[name] : undefined;
  const initial = name && stacks ? await firstStack(name, stacks) : "";
  const toc = stacks ? [{ title: "Code", url: "#code", depth: 2 }, ...page.data.toc] : page.data.toc;

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {component ? <ComponentPreview name={component} title={page.data.title} /> : null}
        {name && stacks ? (
          <>
            <h2 id="code">Code</h2>
            <ComponentCode name={name} stacks={stacks} initial={initial} />
          </>
        ) : null}
        <Body components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: { title: page.data.title, description: page.data.description, url: page.url, type: "article" },
  };
}
