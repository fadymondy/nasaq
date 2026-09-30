"use client";

import { ChevronLeft, ChevronRight, ListTree, Menu, Pencil, Search, X } from "lucide-react";
import { type ComponentProps, Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { extractToc } from "../blog-index/blog-model";
import { PostBody, TableOfContents, useActiveHeading } from "../blog-post";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../breadcrumb";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Icon } from "../icon";
import { DateTime } from "../numeric";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "../sheet";
import { Text } from "../text";
import { type TreeNode, TreeView } from "../tree-view";
import { type DocsNavNode, docsAncestorIds, docsPageMarkdown, docsPages, docsPrevNext, docsSectionIds, docsTrail, filterDocsTree } from "./docs-model";

const STRINGS = {
  en: {
    nav: "Documentation",
    menu: "Open navigation",
    closeMenu: "Close navigation",
    filter: "Filter pages",
    clearFilter: "Clear filter",
    noMatch: "No pages match “{query}”.",
    onThisPage: "On this page",
    copyPage: "Copy page",
    copied: "Copied",
    editPage: "Edit this page",
    updated: "Last updated",
    previous: "Previous",
    next: "Next",
    pager: "Previous and next pages",
    crumbs: "Breadcrumb",
    docs: "Docs",
  },
  ar: {
    nav: "التوثيق",
    menu: "فتح التنقل",
    closeMenu: "إغلاق التنقل",
    filter: "تصفية الصفحات",
    clearFilter: "مسح التصفية",
    noMatch: "لا صفحات تطابق «{query}».",
    onThisPage: "في هذه الصفحة",
    copyPage: "نسخ الصفحة",
    copied: "تم النسخ",
    editPage: "عدّل هذه الصفحة",
    updated: "آخر تحديث",
    previous: "السابق",
    next: "التالي",
    pager: "الصفحتان السابقة والتالية",
    crumbs: "مسار التنقل",
    docs: "التوثيق",
  },
};

export type DocsShellLabels = Partial<(typeof STRINGS)["en"]>;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface DocsPageData {
  /** The page's id in `nav`. */
  id: string;
  title: string;
  description?: string;
  /** Markdown body. `## ` and `### ` headings make the "On this page" rail; `> [!NOTE]` makes callouts. */
  markdown: string;
  /** ISO date of the last change. */
  updated?: string;
  /** Link to edit the page's source. */
  editHref?: string;
}

export interface DocsShellProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** The navigation tree: sections with pages. */
  nav: DocsNavNode[];
  /** The page to show. Its `id` is the active item of the sidebar. */
  page: DocsPageData;
  /** A page was picked in the sidebar or the pager. Navigate, then pass the new `page`. */
  onNavigate: (id: string) => void;
  /** Left side of the top bar: logo and product name. */
  brand?: ReactNode;
  /** End side of the top bar: theme switch, language, GitHub link. */
  actions?: ReactNode;
  /** Filter box above the tree. Default true. */
  searchable?: boolean;
  /** "Copy page" puts the page as Markdown on the clipboard, for pasting to an AI. Default true. */
  copyPage?: boolean;
  /** Replace the body renderer, e.g. with `RichMarkdown` or your own MDX. Default `PostBody`. */
  renderBody?: (page: DocsPageData) => ReactNode;
  /** Section shown above the sidebar tree (a version picker). */
  sidebarHeader?: ReactNode;
  /** Pixels headings keep from the top when scrolled to. Default 96. */
  scrollOffset?: number;
  labels?: DocsShellLabels;
}

/**
 * The documentation layout: a top bar, a tree sidebar (a drawer on phones) with a filter, the page with breadcrumb,
 * title, "Copy page", callouts and an "On this page" rail that follows the reader, and previous/next links.
 * It shows the page you pass and calls `onNavigate`; routing is yours.
 */
export function DocsShell({
  nav,
  page,
  onNavigate,
  brand,
  actions,
  searchable = true,
  copyPage = true,
  renderBody,
  sidebarHeader,
  scrollOffset = 96,
  labels,
  className,
  ...props
}: DocsShellProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [menuOpen, setMenuOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const toc = useMemo(() => extractToc(page.markdown, { minLevel: 2, maxLevel: 3 }), [page.markdown]);
  const active = useActiveHeading(
    toc.map((i) => i.id),
    bodyRef,
    scrollOffset,
  );
  const trail = useMemo(() => docsTrail(nav, page.id), [nav, page.id]);
  const { prev, next } = useMemo(() => docsPrevNext(nav, page.id), [nav, page.id]);
  const navigate = (id: string) => {
    setMenuOpen(false);
    onNavigate(id);
  };
  const sidebar = <DocsSidebar nav={nav} activeId={page.id} onNavigate={navigate} searchable={searchable} header={sidebarHeader} t={t} />;

  return (
    <div data-slot="docs-shell" className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)} {...props}>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-4">
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t.menu} onClick={() => setMenuOpen(true)}>
          <Icon icon={Menu} />
        </Button>
        <div className="flex min-w-0 items-center gap-2 font-semibold">{brand}</div>
        <div className="ms-auto flex items-center gap-1">{actions}</div>
      </header>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1">
        <aside data-slot="docs-sidebar" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-e border-border p-3 lg:block">
          {sidebar}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
          <article className="mx-auto flex max-w-[46rem] flex-col gap-6">
            {trail.length ? (
              <Breadcrumb aria-label={t.crumbs}>
                <BreadcrumbList>
                  <BreadcrumbItem>{t.docs}</BreadcrumbItem>
                  {trail.map((node, i) => (
                    <Fragment key={node.id}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>{i === trail.length - 1 ? <BreadcrumbPage>{node.title}</BreadcrumbPage> : <span>{node.title}</span>}</BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            ) : null}

            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Text as="h1" variant="h1" dir="auto" className="min-w-0 text-start">
                  {page.title}
                </Text>
                {copyPage ? (
                  <CopyButton value={() => docsPageMarkdown(page)} label={t.copyPage} copiedLabel={t.copied} variant="secondary" size="sm" className="shrink-0">
                    {t.copyPage}
                  </CopyButton>
                ) : null}
              </div>
              {page.description ? (
                <p dir="auto" className="text-body-lg text-muted-foreground">
                  {page.description}
                </p>
              ) : null}
            </header>

            {toc.length ? (
              <details className="rounded-card border border-border px-3 py-2 xl:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[2px] text-body-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                  <Icon icon={ListTree} className="size-4 text-muted-foreground" />
                  {t.onThisPage}
                </summary>
                <TableOfContents items={toc} activeId={active} title={<span className="sr-only">{t.onThisPage}</span>} className="mt-2" />
              </details>
            ) : null}

            <div ref={bodyRef} data-slot="docs-body" className="min-w-0">
              {renderBody ? renderBody(page) : <PostBody markdown={page.markdown} scrollOffset={scrollOffset} />}
            </div>

            {page.updated || page.editHref ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-caption text-muted-foreground">
                {page.updated ? (
                  <span>
                    {t.updated} <DateTime value={page.updated} format={{ dateStyle: "medium" }} />
                  </span>
                ) : (
                  <span />
                )}
                {page.editHref ? (
                  <a href={page.editHref} className="inline-flex items-center gap-1.5 rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <Icon icon={Pencil} className="size-3.5" />
                    {t.editPage}
                  </a>
                ) : null}
              </div>
            ) : null}

            {prev || next ? (
              <nav aria-label={t.pager} className="grid gap-3 sm:grid-cols-2">
                {prev ? <PagerLink node={prev} label={t.previous} direction="prev" onNavigate={navigate} /> : <span />}
                {next ? <PagerLink node={next} label={t.next} direction="next" onNavigate={navigate} /> : null}
              </nav>
            ) : null}
          </article>
        </main>

        <aside data-slot="docs-toc" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto p-4 xl:block">
          <TableOfContents items={toc} activeId={active} title={t.onThisPage} />
        </aside>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="start" closeLabel={t.closeMenu} className="p-3">
          <SheetTitle className="sr-only">{t.nav}</SheetTitle>
          <SheetDescription className="sr-only">{t.nav}</SheetDescription>
          <div className="mt-8 min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PagerLink({ node, label, direction, onNavigate }: { node: DocsNavNode; label: string; direction: "prev" | "next"; onNavigate: (id: string) => void }) {
  const prev = direction === "prev";
  return (
    <button
      type="button"
      onClick={() => onNavigate(node.id)}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-card border border-border p-4 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
        !prev && "sm:col-start-2 sm:text-end",
      )}
    >
      <span className={cn("flex items-center gap-1 text-caption text-muted-foreground", !prev && "sm:justify-end")}>
        {prev ? <Icon icon={ChevronLeft} directional className="size-3.5" /> : null}
        {label}
        {prev ? null : <Icon icon={ChevronRight} directional className="size-3.5" />}
      </span>
      <span dir="auto" className="truncate font-medium">
        {node.title}
      </span>
    </button>
  );
}

interface SidebarProps {
  nav: DocsNavNode[];
  activeId: string;
  onNavigate: (id: string) => void;
  searchable: boolean;
  header?: ReactNode;
  t: (typeof STRINGS)["en"];
}

function DocsSidebar({ nav, activeId, onNavigate, searchable, header, t }: SidebarProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(() => docsAncestorIds(nav, activeId));
  const filtering = query.trim() !== "";
  const tree = useMemo(() => filterDocsTree(nav, query), [nav, query]);
  const pageIds = useMemo(() => new Set(docsPages(nav).map((p) => p.id)), [nav]);

  // Keep the current page's sections open when it changes.
  useEffect(() => {
    const need = docsAncestorIds(nav, activeId);
    setExpanded((cur) => (need.every((id) => cur.includes(id)) ? cur : [...new Set([...cur, ...need])]));
  }, [nav, activeId]);

  const items = useMemo(() => {
    const toItem = (n: DocsNavNode): TreeNode => ({
      id: n.id,
      textValue: n.title,
      label: (
        <span className="flex min-w-0 items-center gap-2">
          <span dir="auto" className="truncate">
            {n.title}
          </span>
          {n.badge ? <Badge variant="info">{n.badge}</Badge> : null}
        </span>
      ),
      children: n.children?.length ? n.children.map(toItem) : undefined,
    });
    return tree.map(toItem);
  }, [tree]);

  return (
    <nav aria-label={t.nav} className="flex flex-col gap-3">
      {header}
      {searchable ? (
        <InputGroup className="h-control-sm">
          <InputGroupAddon>
            <Icon icon={Search} />
          </InputGroupAddon>
          <InputGroupInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.filter} aria-label={t.filter} />
          {query ? (
            <InputGroupAddon align="end">
              <button type="button" aria-label={t.clearFilter} onClick={() => setQuery("")} className="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                <Icon icon={X} />
              </button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      ) : null}
      {items.length ? (
        <TreeView
          aria-label={t.nav}
          items={items}
          expanded={filtering ? docsSectionIds(tree) : expanded}
          onExpandedChange={(next) => !filtering && setExpanded(next)}
          selected={[activeId]}
          onSelectedChange={(next) => {
            const id = next[next.length - 1];
            if (!id) return;
            if (pageIds.has(id)) onNavigate(id);
            else if (!filtering) setExpanded((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
          }}
        />
      ) : (
        <p className="px-2 text-body-sm text-muted-foreground">{fill(t.noMatch, { query })}</p>
      )}
    </nav>
  );
}
