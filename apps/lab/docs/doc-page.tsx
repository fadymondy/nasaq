import { Badge, buttonVariants, cn, Markdown, ProductMark, Text } from "@nasaq/web";
import type { StoryObj } from "@storybook/react-vite";
import { Children, isValidElement, type ReactNode } from "react";
import { DOCS, docsHref, storyHref, storyId } from "./nav";

/**
 * The docs are stories, so they follow the toolbar (theme, brand, density) like every component and the
 * sidebar can put them first. Each page is a Markdown file in ./content rendered with Nasaq's own Markdown,
 * CodeBlock (copyable snippets) and Table.
 *
 * Links in the Markdown are relative URLs, because react-markdown drops unknown schemes:
 *   ?doc=<component story id>   a component's docs page      (?doc=components-actions-button)
 *   ?page=<story id sans --page>  another docs page          (?page=docs-installation-npm-package)
 *   ?story=<story id>           any story                    (?story=pages-store-journey--default)
 * They open in the top window, not inside the preview iframe. http(s) links open a new tab.
 */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((c) => {
      if (typeof c === "string" || typeof c === "number") return String(c);
      return isValidElement<{ children?: ReactNode }>(c) ? textOf(c.props.children) : "";
    })
    .join("");
}

/** `##` and `###` lines outside code fences, for the "On this page" list. */
function headings(md: string) {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  let fenced = false;
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith("```")) fenced = !fenced;
    if (fenced) continue;
    const m = /^(#{2,3}) (.+?)\s*$/.exec(line);
    if (m) {
      const text = m[2]!.replace(/[`*_]/g, "");
      out.push({ level: m[1]!.length === 2 ? 2 : 3, text, id: slug(text) });
    }
  }
  return out;
}

const heading =
  (tag: "h1" | "h2" | "h3") =>
  ({ children }: { children?: ReactNode }) => {
    const id = slug(textOf(children));
    return (
      <Text
        as={tag}
        variant={tag}
        id={tag === "h1" ? undefined : id}
        className={cn("group scroll-mt-6 text-start first:mt-0", tag === "h2" && "mt-6 border-t border-border pt-6", tag === "h3" && "mt-2")}
      >
        {children}
        {tag !== "h1" ? (
          <a
            href={`#${id}`}
            aria-label="Link to this section"
            className="ms-2 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            #
          </a>
        ) : null}
      </Text>
    );
  };

function resolveHref(href: string | undefined): { href?: string; external: boolean; top: boolean } {
  if (!href) return { external: false, top: false };
  if (/^https?:\/\//i.test(href) || href.startsWith("/")) return { href, external: true, top: false };
  if (href.startsWith("?doc=")) return { href: docsHref(href.slice(5)), external: false, top: true };
  if (href.startsWith("?story=")) return { href: storyHref(href.slice(7)), external: false, top: true };
  if (href.startsWith("?page=")) {
    // ?page=docs-installation-npm-package#fonts → the page's story, then the anchor inside it is dropped (the preview is an iframe).
    const [id = ""] = href.slice(6).split("#");
    return { href: storyHref(`${id}--page`), external: false, top: true };
  }
  return { href, external: false, top: false };
}

export const docComponents = {
  h1: heading("h1"),
  h2: heading("h2"),
  h3: heading("h3"),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => {
    const r = resolveHref(href);
    return (
      <a
        href={r.href}
        {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : r.top ? { target: "_top" } : {})}
        className="rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
      >
        {children}
      </a>
    );
  },
};

/** `{{name}}` in a page becomes a value the lab knows at build time (component count and so on). */
export function fillTokens(md: string, values: Record<string, string | number>) {
  return md.replace(/\{\{(\w+)\}\}/g, (all, k: string) => (k in values ? String(values[k]) : all));
}

function PrevNext({ title }: { title: string }) {
  const i = DOCS.findIndex((d) => d.title === title);
  if (i < 0) return null;
  const link = (d: (typeof DOCS)[number], dir: "prev" | "next") => (
    <a
      key={dir}
      href={storyHref(storyId(d.title))}
      target="_top"
      className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-auto flex-col gap-0.5 whitespace-normal py-3", dir === "next" ? "ms-auto items-end text-end" : "items-start")}
    >
      <span className="text-caption text-muted-foreground">{dir === "prev" ? "Previous" : "Next"}</span>
      <span>{d.label}</span>
    </a>
  );
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <nav aria-label="Pages" className="mt-12 flex flex-wrap gap-3 border-t border-border pt-6">
      {prev ? link(prev, "prev") : null}
      {next ? link(next, "next") : null}
    </nav>
  );
}

export interface DocPageProps {
  /** The Storybook title of this page; used for the section label and previous/next links. */
  title: string;
  /** Markdown source; the first `# H1` is the page title. */
  md: string;
  /** Shown above the Markdown (the introduction's hero). */
  before?: ReactNode;
  /** Shown below the Markdown, above the previous/next links. */
  after?: ReactNode;
}

export function DocPage({ title, md, before, after }: DocPageProps) {
  const toc = headings(md);
  const section = title.split("/")[1] ?? "Docs";
  return (
    // The prose is English and pinned LTR, like the component manuals. The live demos inside still follow the toolbar.
    <div dir="ltr" lang="en" className="mx-auto grid max-w-[1180px] gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_220px] lg:px-10">
      <article className="min-w-0 max-w-[760px]">
        <div className="mb-3 flex items-center gap-2">
          <ProductMark size={20} title="Nasaq" />
          <Text as="span" variant="eyebrow">
            Nasaq · {section === "Introduction" ? "Docs" : section}
          </Text>
          <Badge variant="outline">0.1.0</Badge>
        </div>
        {before}
        <Markdown className="gap-4" components={docComponents}>
          {md}
        </Markdown>
        {after}
        <PrevNext title={title} />
      </article>
      {toc.length > 1 ? (
        <aside aria-label="On this page" className="hidden lg:block">
          <nav className="sticky top-6 flex flex-col gap-1 border-s border-border ps-4 text-body-sm">
            <Text as="span" variant="eyebrow" className="mb-1">
              On this page
            </Text>
            {toc.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={cn("rounded-[2px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus", h.level === 3 && "ps-3")}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}
    </div>
  );
}

export type DocStory = StoryObj;

/** Parameters every docs page shares: full-bleed canvas, no second autodocs entry (see docs stories). */
export const docParameters = { layout: "fullscreen", nasaq: { fullBleed: true } } as const;
