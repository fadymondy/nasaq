"use client";

import { ArrowLeft, ArrowRight, ChevronDown, Clock, Info, Lightbulb, Link2, OctagonAlert, type LucideIcon, Star, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { type BlogIndexLabels, hueFor, PostCard, PostCover, useBlogStrings } from "../blog-index/blog-index";
import {
  activeHeadingId,
  adjacentPosts,
  type BlogAuthor,
  type BlogPostSummary,
  type CalloutKind,
  extractToc,
  readingProgress,
  readingTime,
  relatedPosts,
  remarkCallouts,
  type TocItem,
} from "../blog-index/blog-model";
import { Button } from "../button";
import { Card } from "../card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Icon } from "../icon";
import { Markdown } from "../markdown";
import { DateTime, formatNumber } from "../numeric";
import { SectionHeader } from "../section-header";
import { ShareButton, type ShareActionLabels } from "../share-action";
import { Text } from "../text";

const STRINGS = {
  en: {
    back: "All articles",
    onThisPage: "On this page",
    progress: "Reading progress",
    share: "Share",
    shareTitle: "Share this article",
    tags: "Tags",
    aboutAuthor: "About the author",
    related: "Keep reading",
    relatedHint: "More on the same topics.",
    previous: "Older article",
    next: "Newer article",
    comments: "Comments",
    permalink: "Link to this section",
    updated: "Updated",
    callout: { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" },
  },
  ar: {
    back: "كل المقالات",
    onThisPage: "في هذه الصفحة",
    progress: "تقدّم القراءة",
    share: "مشاركة",
    shareTitle: "شارك هذا المقال",
    tags: "الوسوم",
    aboutAuthor: "عن الكاتب",
    related: "واصل القراءة",
    relatedHint: "المزيد في المواضيع نفسها.",
    previous: "مقال أقدم",
    next: "مقال أحدث",
    comments: "التعليقات",
    permalink: "رابط هذا القسم",
    updated: "حُدّث",
    callout: { note: "ملاحظة", tip: "نصيحة", important: "مهم", warning: "تنبيه", caution: "تحذير" },
  },
};

export type BlogPostLabels = Omit<(typeof STRINGS)["en"], "callout"> & { callout: Record<CalloutKind, string> };

function usePostStrings(labels?: Partial<BlogPostLabels>) {
  const { lang, locale } = useBlogStrings();
  const base = STRINGS[lang];
  return { lang, locale, t: { ...base, ...labels, callout: { ...base.callout, ...labels?.callout } } as BlogPostLabels } as const;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------ reading progress */

export interface ReadingProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** The article element whose scroll extent is measured. */
  target: RefObject<HTMLElement | null>;
  /** Accessible name. Default "Reading progress". */
  label?: string;
}

/**
 * A thin bar that fills as the reader scrolls through `target`. It sticks to the top of its scroll container, fills from the
 * inline start (so from the right in Arabic) and reports its value as `role="progressbar"`.
 */
export function ReadingProgress({ target, label, className, ...props }: ReadingProgressProps) {
  const { t } = usePostStrings();
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = target.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setValue(readingProgress(r.top, r.height, window.innerHeight));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);
  return (
    <div
      data-slot="reading-progress"
      role="progressbar"
      aria-label={label ?? t.progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className={cn("sticky top-0 z-30 h-0.5 w-full", className)}
      {...props}
    >
      <div className="h-full bg-primary" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------ scroll spy */

/**
 * The id of the heading the reader is in. Listens to scroll (of the page or any scroll container) and measures the
 * headings inside `root`. At the very bottom of the page the last heading wins, so short final sections can still be reached.
 */
export function useActiveHeading(ids: string[], root: RefObject<HTMLElement | null>, offset = 96): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join("\u0000");
  useEffect(() => {
    const list = key ? key.split("\u0000") : [];
    if (!list.length) return setActive(null);
    let raf = 0;
    const update = () => {
      raf = 0;
      const scope = root.current ?? document;
      const tops = list.flatMap((id) => {
        const el = scope.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
        return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
      });
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && window.scrollY > 0;
      setActive(atBottom && tops.length ? (tops[tops.length - 1] as { id: string }).id : activeHeadingId(tops, offset));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [key, root, offset]);
  return active;
}

/* ------------------------------------------------------------ table of contents */

export interface TableOfContentsProps extends Omit<ComponentProps<"nav">, "children" | "title" | "onSelect"> {
  items: TocItem[];
  /** The heading in view. Highlighted with `aria-current="location"`. */
  activeId?: string | null;
  /** Heading above the list. Default "On this page". */
  title?: ReactNode;
  /** Called after the page scrolled to a heading. */
  onSelect?: (id: string) => void;
}

/** "On this page": a rail of heading links, the current one highlighted. Level-3 headings are indented. Clicking scrolls smoothly (not with reduced motion) and updates the URL hash. */
export function TableOfContents({ items, activeId, title, onSelect, className, ...props }: TableOfContentsProps) {
  const { t } = usePostStrings();
  if (!items.length) return null;
  const go = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    try {
      history.replaceState(null, "", `#${encodeURIComponent(id)}`);
    } catch {
      /* Sandboxed frames may forbid it. */
    }
    onSelect?.(id);
  };
  return (
    <nav data-slot="table-of-contents" aria-label={typeof title === "string" ? title : t.onThisPage} className={cn("flex flex-col gap-2", className)} {...props}>
      <p className="eyebrow">{title ?? t.onThisPage}</p>
      <ol className="flex flex-col border-s border-border">
        {items.map((item) => {
          const current = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={go(item.id)}
                aria-current={current ? "location" : undefined}
                dir="auto"
                className={cn(
                  "-ms-px block border-s-2 py-1 text-body-sm outline-none transition-colors duration-150 ease-nq",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus",
                  item.level >= 3 ? "ps-6" : "ps-3",
                  current ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------ callout */

const CALLOUT_STYLE: Record<CalloutKind, { icon: LucideIcon; box: string; icon_: string }> = {
  note: { icon: Info, box: "border-nq-info/40 bg-nq-info-soft", icon_: "text-nq-info-text" },
  tip: { icon: Lightbulb, box: "border-nq-success/40 bg-nq-success-soft", icon_: "text-nq-success-text" },
  important: { icon: Star, box: "border-nq-accent/40 bg-nq-accent/10", icon_: "text-nq-accent-text" },
  warning: { icon: TriangleAlert, box: "border-nq-warning/40 bg-nq-warning-soft", icon_: "text-nq-warning-text" },
  caution: { icon: OctagonAlert, box: "border-nq-danger/40 bg-nq-danger-soft", icon_: "text-nq-danger-text" },
};

export interface CalloutProps extends Omit<ComponentProps<"aside">, "title"> {
  kind?: CalloutKind;
  /** Heading of the callout. Default the kind's name ("Warning" / "تنبيه"). */
  title?: ReactNode;
}

/** A highlighted aside inside an article. In Markdown write `> [!WARNING]` on the first line of a blockquote. */
export function Callout({ kind = "note", title, className, children, ...props }: CalloutProps) {
  const { t } = usePostStrings();
  const style = CALLOUT_STYLE[kind];
  return (
    <aside data-slot="callout" data-kind={kind} className={cn("flex gap-3 rounded-card border p-4 text-start", style.box, className)} {...props}>
      <Icon icon={style.icon} className={cn("mt-0.5 size-4 shrink-0", style.icon_)} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label text-foreground">{title ?? t.callout[kind]}</p>
        <div dir="auto" className="flex flex-col gap-2 text-body-sm text-nq-fg-body [&_p]:m-0">
          {children}
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------ body */

export interface PostBodyProps extends Omit<ComponentProps<"div">, "children"> {
  /** The Markdown source. */
  markdown: string;
  /** Distance in px that headings keep from the top when scrolled to. Default 96. */
  scrollOffset?: number;
}

/**
 * The article text: Markdown in Nasaq typography with anchored h2/h3 headings (ids match `extractToc`), code blocks with
 * highlighting and copy, tables, and `> [!NOTE]` callouts.
 */
export function PostBody({ markdown, scrollOffset = 96, className, ...props }: PostBodyProps) {
  const { t } = usePostStrings();
  const components = useMemo(() => {
    const byLine = new Map(extractToc(markdown, { minLevel: 1, maxLevel: 6 }).map((i) => [i.line, i.id]));
    const heading =
      (tag: "h2" | "h3" | "h4", variant: "h2" | "h3") =>
      ({ node, children, className: c, ...rest }: ComponentProps<"h2"> & { node?: { position?: { start: { line: number } } } }) => {
        const id = node?.position ? byLine.get(node.position.start.line) : undefined;
        return (
          <Text as={tag} variant={variant} id={id} dir="auto" style={{ scrollMarginTop: scrollOffset }} className={cn("group/heading mt-4 text-start first:mt-0", c)} {...(rest as object)}>
            {children}
            {id && (
              <a
                href={`#${id}`}
                aria-label={t.permalink}
                className="ms-2 inline-flex align-middle text-muted-foreground opacity-0 outline-none transition-opacity duration-150 group-hover/heading:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <Icon icon={Link2} className="size-4" />
              </a>
            )}
          </Text>
        );
      };
    return {
      h2: heading("h2", "h2"),
      h3: heading("h3", "h3"),
      h4: heading("h4", "h3"),
      blockquote: ({ node: _n, className: c, children, ...rest }: ComponentProps<"blockquote"> & { node?: unknown; "data-callout"?: CalloutKind }) => {
        const kind = rest["data-callout"];
        if (kind && kind in CALLOUT_STYLE) return <Callout kind={kind}>{children}</Callout>;
        return (
          <blockquote dir="auto" className={cn("border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground", c)}>
            {children}
          </blockquote>
        );
      },
    };
  }, [markdown, scrollOffset, t.permalink]);
  return (
    <Markdown data-slot="post-body" components={components} remarkPlugins={[remarkCallouts]} className={cn("gap-5 text-[1.0625rem] leading-relaxed", className)} {...props}>
      {markdown}
    </Markdown>
  );
}

/* ------------------------------------------------------------ post */

export interface BlogPostData extends BlogPostSummary {
  /** The article in Markdown. */
  body: string;
  /** When it was last edited. */
  updated?: string | number | Date;
}

export interface BlogPostProps extends Omit<ComponentProps<"div">, "title"> {
  post: BlogPostData;
  /** Every post, to derive related and previous/next posts. Ignored for the ones passed explicitly. */
  posts?: BlogPostSummary[];
  related?: BlogPostSummary[];
  /** The next older post. */
  previous?: BlogPostSummary;
  /** The next newer post. */
  next?: BlogPostSummary;
  /** Absolute URL of the article, for sharing. Default the current page. */
  url?: string;
  /** Link for another post. Default `#slug`. */
  postHref?: (post: BlogPostSummary) => string;
  /** Link for a tag's archive. Without it tags are plain badges. */
  tagHref?: (tag: string) => string;
  /** Link back to the archive. */
  backHref?: string;
  /** Show the sticky table of contents (from 64rem of width; collapsible above it). Default true. */
  toc?: boolean;
  /** Show the reading progress bar. Default true. */
  progress?: boolean;
  /** Distance in px headings keep from the top when scrolled to and when picking the current one. Default 96. */
  scrollOffset?: number;
  /** The comment thread, rendered under the article. */
  comments?: ReactNode;
  /** Extra header actions next to Share. */
  actions?: ReactNode;
  labels?: Partial<BlogPostLabels>;
  /** Labels of the share dialog. */
  shareLabels?: Partial<ShareActionLabels>;
  /** Labels shared with the blog index (read time, minutes). */
  indexLabels?: Partial<BlogIndexLabels>;
}

function AuthorByline({ author, indexLabels }: { author: BlogAuthor; indexLabels?: Partial<BlogIndexLabels> }) {
  void indexLabels;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={author.name} src={author.avatar} size="md" />
      <span className="flex flex-col leading-tight">
        <bdi className="text-label text-foreground">{author.name}</bdi>
        {author.role && <span className="text-caption text-muted-foreground">{author.role}</span>}
      </span>
    </span>
  );
}

/**
 * An article page: cover, category, title, author byline with date and reading time, a reading progress bar, a sticky table
 * of contents with scroll-spy, the Markdown body with code and callouts, tags, share, author card, previous/next, related posts
 * and a slot for comments.
 */
export function BlogPost({
  post,
  posts,
  related: relatedProp,
  previous: previousProp,
  next: nextProp,
  url,
  postHref,
  tagHref,
  backHref,
  toc = true,
  progress = true,
  scrollOffset = 96,
  comments,
  actions,
  labels,
  shareLabels,
  indexLabels,
  className,
  ...props
}: BlogPostProps) {
  const { t, locale } = usePostStrings(labels);
  const { t: it } = useBlogStrings(indexLabels);
  const articleRef = useRef<HTMLElement>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [href, setHref] = useState(url ?? "");
  useEffect(() => {
    if (!url) setHref(window.location.href.split("#")[0] as string);
  }, [url]);

  const items = useMemo(() => extractToc(post.body), [post.body]);
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const active = useActiveHeading(ids, articleRef, scrollOffset);
  const minutes = post.readingMinutes ?? readingTime(post.body).minutes;
  const related = relatedProp ?? (posts ? relatedPosts(post, posts) : []);
  const adjacent = posts ? adjacentPosts(post, posts) : {};
  const older = previousProp ?? adjacent.older;
  const newer = nextProp ?? adjacent.newer;
  const link = (p: BlogPostSummary) => postHref?.(p) ?? `#${p.slug}`;
  const showToc = toc && items.length > 1;

  return (
    <div data-slot="blog-post" className={cn("@container flex flex-col gap-8", className)} {...props}>
      {progress && <ReadingProgress target={articleRef} label={t.progress} className="-mb-8" />}

      <header className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4">
        {backHref && (
          <a href={backHref} className="inline-flex items-center gap-1 rounded-[2px] text-body-sm text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
            <Icon icon={ArrowLeft} className="size-4" />
            {t.back}
          </a>
        )}
        <Badge variant="tag" hue={hueFor(post.category)}>
          {post.category}
        </Badge>
        <h1 dir="auto" className="text-balance text-display text-foreground">
          {post.title}
        </h1>
        <p dir="auto" className="text-pretty text-body text-muted-foreground">
          {post.excerpt}
        </p>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 border-y border-border py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {post.author && <AuthorByline author={post.author} indexLabels={indexLabels} />}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
              <DateTime value={post.date} format={{ dateStyle: "long" }} />
              <span className="inline-flex items-center gap-1">
                <Icon icon={Clock} className="size-3" />
                {it.minRead.replace("{n}", formatNumber(minutes, locale))}
              </span>
              {post.updated && (
                <span>
                  {t.updated} <DateTime value={post.updated} format={{ dateStyle: "medium" }} />
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ShareButton url={href} title={post.title} text={post.excerpt} linkAccess={false} labels={{ title: t.shareTitle, share: t.share, ...shareLabels }} />
          </div>
        </div>
      </header>

      <PostCover post={post} ratio="aspect-[21/9]" className="mx-auto max-w-5xl" />

      <div className={cn("mx-auto grid w-full max-w-5xl grid-cols-1 gap-x-12 gap-y-6", showToc && "@4xl:grid-cols-[minmax(0,1fr)_14rem]")}>
        <div className="flex min-w-0 flex-col gap-8">
          {showToc && (
            <Collapsible open={mobileTocOpen} onOpenChange={setMobileTocOpen} className="@4xl:hidden">
              <CollapsibleTrigger render={<Button variant="secondary" className="w-full justify-between" />}>
                {t.onThisPage}
                <Icon icon={ChevronDown} className={cn("transition-transform duration-200 ease-nq", mobileTocOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <TableOfContents items={items} activeId={active} onSelect={() => setMobileTocOpen(false)} className="pt-3" />
              </CollapsiblePanel>
            </Collapsible>
          )}

          <article ref={articleRef} className="flex min-w-0 max-w-[44rem] flex-col gap-10">
            <PostBody markdown={post.body} scrollOffset={scrollOffset} />

            <div className="flex flex-col gap-4 border-t border-border pt-6">
              {post.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label text-muted-foreground">{t.tags}</span>
                  {post.tags.map((tag) =>
                    tagHref ? (
                      <a key={tag} href={tagHref(tag)} className="rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                        <Badge variant="outline" className="hover:bg-nq-hover">
                          <bdi>#{tag}</bdi>
                        </Badge>
                      </a>
                    ) : (
                      <Badge key={tag} variant="outline">
                        <bdi>#{tag}</bdi>
                      </Badge>
                    ),
                  )}
                </div>
              )}
              {post.author?.bio && (
                <Card className="flex-row items-start gap-3 p-4">
                  <Avatar name={post.author.name} src={post.author.avatar} size="lg" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="eyebrow">{t.aboutAuthor}</p>
                    <p className="text-label text-foreground">
                      <bdi>{post.author.name}</bdi>
                    </p>
                    <p dir="auto" className="text-body-sm text-muted-foreground">
                      {post.author.bio}
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </article>
        </div>

        {showToc && (
          <aside className="hidden @4xl:block">
            <div className="sticky flex max-h-[calc(100dvh-8rem)] flex-col overflow-y-auto" style={{ top: scrollOffset }}>
              <TableOfContents items={items} activeId={active} />
            </div>
          </aside>
        )}
      </div>

      {(older || newer) && (
        <nav aria-label={`${t.previous} / ${t.next}`} className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 @2xl:grid-cols-2">
          {older ? <AdjacentLink post={older} label={t.previous} href={link(older)} /> : <span />}
          {newer ? <AdjacentLink post={newer} label={t.next} href={link(newer)} end /> : <span />}
        </nav>
      )}

      {related.length > 0 && (
        <section className="mx-auto flex w-full max-w-5xl flex-col gap-4" aria-labelledby={`${post.slug}-related`}>
          <SectionHeader headingId={`${post.slug}-related`} title={t.related} description={t.relatedHint} />
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 @2xl:grid-cols-2 @4xl:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} href={link(p)} labels={indexLabels} />
            ))}
          </div>
        </section>
      )}

      {comments && (
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-labelledby={`${post.slug}-comments`}>
          <SectionHeader headingId={`${post.slug}-comments`} title={t.comments} />
          {comments}
        </section>
      )}
    </div>
  );
}

function AdjacentLink({ post, label, href, end = false }: { post: BlogPostSummary; label: string; href: string; end?: boolean }) {
  return (
    <a
      href={href}
      data-slot="post-adjacent"
      className={cn(
        "group/adj flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4 outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        end && "@2xl:text-end @2xl:items-end",
      )}
    >
      <span className="inline-flex items-center gap-1 text-caption text-muted-foreground">
        {!end && <Icon icon={ArrowLeft} className="size-3" />}
        {label}
        {end && <Icon icon={ArrowRight} className="size-3" />}
      </span>
      <span dir="auto" className="text-balance text-label text-foreground">
        {post.title}
      </span>
    </a>
  );
}
