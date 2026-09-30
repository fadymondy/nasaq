"use client";

import { ArrowRight, Clock, Search, X } from "lucide-react";
import { type ComponentProps, type CSSProperties, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge, TAG_HUES, type TagHue } from "../badge";
import { Button } from "../button";
import { Chip, ChipGroup } from "../chip-group";
import { Icon } from "../icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { DateTime, formatNumber } from "../numeric";
import { Pagination } from "../pagination";
import { SectionHeader } from "../section-header";
import { EmptyState } from "../states";
import { type BlogFilters, type BlogPostSummary, postCategoryCounts, EMPTY_FILTERS, filterPosts, paginate, pickFeatured, sortByDate, tagCounts } from "./blog-model";

const STRINGS = {
  en: {
    title: "Blog",
    description: "Notes on design systems, product and engineering.",
    search: "Search articles",
    searchPlaceholder: "Search articles…",
    clearSearch: "Clear search",
    categories: "Categories",
    tags: "Tags",
    all: "All",
    allTags: "Any tag",
    featured: "Featured",
    readMore: "Read article",
    minRead: "{n} min read",
    results: "{n} articles",
    resultsOne: "1 article",
    noResults: "No articles match",
    noResultsHint: "Try a different word, or clear the filters.",
    clearFilters: "Clear filters",
    latest: "Latest articles",
    by: "By {name}",
    pagination: "Articles pages",
  },
  ar: {
    title: "المدونة",
    description: "ملاحظات في أنظمة التصميم والمنتج والهندسة.",
    search: "ابحث في المقالات",
    searchPlaceholder: "ابحث في المقالات…",
    clearSearch: "مسح البحث",
    categories: "التصنيفات",
    tags: "الوسوم",
    all: "الكل",
    allTags: "أي وسم",
    featured: "مقال مميز",
    readMore: "اقرأ المقال",
    minRead: "{n} د للقراءة",
    results: "{n} مقالات",
    resultsOne: "مقال واحد",
    noResults: "لا توجد مقالات مطابقة",
    noResultsHint: "جرّب كلمة أخرى، أو امسح عوامل التصفية.",
    clearFilters: "مسح عوامل التصفية",
    latest: "أحدث المقالات",
    by: "بقلم {name}",
    pagination: "صفحات المقالات",
  },
};

export type BlogIndexLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale for the blog components. Falls back to English outside a NasaqProvider. */
export function useBlogStrings(labels?: Partial<BlogIndexLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const lang = locale.startsWith("ar") ? "ar" : "en";
  return { locale, lang, t: { ...STRINGS[lang], ...labels } } as const;
}

function hash(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

/** A stable categorical hue for a string (a category, a slug), so the same category is always the same colour. */
export function hueFor(text: string): TagHue {
  return TAG_HUES[1 + (hash(text) % (TAG_HUES.length - 1))] as TagHue;
}

export interface PostCoverProps extends ComponentProps<"div"> {
  post: Pick<BlogPostSummary, "slug" | "cover" | "coverAlt" | "title">;
  /** Aspect ratio class. Default 16/9. */
  ratio?: string;
}

/** The post's cover image, or when it has none a soft generated cover in the hue of its slug. Decorative art carries no text. */
export function PostCover({ post, ratio = "aspect-video", className, ...props }: PostCoverProps) {
  const h = hash(post.slug);
  const a = TAG_HUES[1 + (h % (TAG_HUES.length - 1))] as TagHue;
  const b = TAG_HUES[1 + ((h >> 3) % (TAG_HUES.length - 1))] as TagHue;
  const art = {
    "--cover-a": `var(--nq-tag-${a})`,
    "--cover-a-soft": `var(--nq-tag-${a}-soft)`,
    "--cover-b-soft": `var(--nq-tag-${b}-soft)`,
    "--cover-x": `${20 + (h % 50)}%`,
    "--cover-y": `${20 + ((h >> 5) % 50)}%`,
  } as CSSProperties;
  return (
    <div data-slot="post-cover" className={cn("relative w-full overflow-hidden rounded-card border border-border bg-secondary", ratio, className)} {...props}>
      {post.cover ? (
        <img src={post.cover} alt={post.coverAlt ?? ""} loading="lazy" className="size-full object-cover" />
      ) : (
        <div
          aria-hidden="true"
          style={art}
          className="size-full bg-[radial-gradient(circle_at_var(--cover-x)_var(--cover-y),var(--cover-a-soft),transparent_55%),linear-gradient(135deg,var(--cover-a-soft),var(--cover-b-soft))]"
        >
          <div className="absolute -bottom-1/4 -end-[8%] size-2/5 rounded-full border-2 border-[var(--cover-a)] opacity-40" />
          <div className="absolute start-[10%] top-[16%] size-6 rounded-full bg-[var(--cover-a)] opacity-30" />
        </div>
      )}
    </div>
  );
}

export interface PostCardProps extends Omit<ComponentProps<"article">, "title"> {
  post: BlogPostSummary;
  /** Link target. Default `#slug`. */
  href?: string;
  /** Called when the card's link is activated (in addition to following `href`). */
  onOpen?: (post: BlogPostSummary) => void;
  /** `default` cover above the text, `featured` cover beside a large title, `compact` no cover, for lists and related posts. */
  variant?: "default" | "featured" | "compact";
  labels?: Partial<BlogIndexLabels>;
}

/** Meta line: date and reading time. */
export function PostMeta({ post, labels, className }: { post: BlogPostSummary; labels?: Partial<BlogIndexLabels>; className?: string }) {
  const { t, locale } = useBlogStrings(labels);
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground", className)}>
      <DateTime value={post.date} format={{ dateStyle: "medium" }} />
      {post.readingMinutes ? (
        <span className="inline-flex items-center gap-1">
          <Icon icon={Clock} className="size-3" />
          {fill(t.minRead, { n: formatNumber(post.readingMinutes, locale) })}
        </span>
      ) : null}
    </p>
  );
}

/** One article in a list: cover, category, title (the whole card is the link), excerpt, date and reading time. */
export function PostCard({ post, href, onOpen, variant = "default", labels, className, ...props }: PostCardProps) {
  const { t } = useBlogStrings(labels);
  const featured = variant === "featured";
  const compact = variant === "compact";
  return (
    <article
      data-slot="post-card"
      data-variant={variant}
      className={cn(
        "group/post relative flex min-w-0 gap-4",
        featured ? "@3xl:grid @3xl:grid-cols-2 @3xl:items-center @3xl:gap-8 flex-col" : "flex-col",
        compact && "gap-2 rounded-card border border-border bg-card p-4 transition-colors duration-150 ease-nq hover:bg-nq-hover",
        className,
      )}
      {...props}
    >
      {!compact && <PostCover post={post} className={cn("transition-[border-color] duration-150 ease-nq group-hover/post:border-nq-line-strong", featured && "@3xl:aspect-[4/3]")} />}
      <div className={cn("flex min-w-0 flex-col items-start gap-2", featured && "gap-3")}>
        <div className="flex flex-wrap items-center gap-2">
          {featured && <Badge variant="accent">{t.featured}</Badge>}
          <Badge variant="tag" hue={hueFor(post.category)}>
            {post.category}
          </Badge>
        </div>
        <h3 className={cn("text-balance text-foreground", featured ? "text-h1" : "text-h3")}>
          <a
            href={href ?? `#${post.slug}`}
            onClick={() => onOpen?.(post)}
            dir="auto"
            className="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus"
          >
            {post.title}
          </a>
        </h3>
        <p dir="auto" className={cn("text-pretty text-muted-foreground", featured ? "text-body" : "line-clamp-3 text-body-sm")}>
          {post.excerpt}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {post.author && (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
              <Avatar name={post.author.name} src={post.author.avatar} size="xs" />
              <bdi>{post.author.name}</bdi>
            </span>
          )}
          <PostMeta post={post} labels={labels} />
        </div>
        {featured && (
          <span className="mt-1 inline-flex items-center gap-1 text-label text-foreground">
            {t.readMore}
            <Icon icon={ArrowRight} className="size-4 transition-transform duration-150 ease-nq group-hover/post:translate-x-0.5 rtl:group-hover/post:-translate-x-0.5" />
          </span>
        )}
      </div>
    </article>
  );
}

export interface BlogIndexProps extends Omit<ComponentProps<"section">, "title"> {
  posts: BlogPostSummary[];
  /** Page heading. Default "Blog". */
  title?: ReactNode;
  description?: ReactNode;
  /** Inline-end slot next to the heading: an RSS or subscribe button. */
  actions?: ReactNode;
  /** Articles per page, not counting the featured one. Default 6. */
  pageSize?: number;
  /** Show the featured article above the list on page 1 when no filter is active. Default true. */
  showFeatured?: boolean;
  /** Link for a post. Default `#slug`. */
  postHref?: (post: BlogPostSummary) => string;
  onOpenPost?: (post: BlogPostSummary) => void;
  /** Controlled filters. */
  filters?: BlogFilters;
  defaultFilters?: Partial<BlogFilters>;
  onFiltersChange?: (filters: BlogFilters) => void;
  /** Controlled page, 1-based. */
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** How many tags to offer. Default 8. */
  maxTags?: number;
  labels?: Partial<BlogIndexLabels>;
}

/**
 * The blog's archive page: a featured article, search, category and tag filters, a grid of post cards with cover,
 * date and reading time, and pagination. Filtering is done on the client from `posts`; pass `filters`/`onFiltersChange`
 * and `page`/`onPageChange` to put them in the URL.
 */
export function BlogIndex({
  posts,
  title,
  description,
  actions,
  pageSize = 6,
  showFeatured = true,
  postHref,
  onOpenPost,
  filters: filtersProp,
  defaultFilters,
  onFiltersChange,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  maxTags = 8,
  labels,
  className,
  ...props
}: BlogIndexProps) {
  const { t, locale } = useBlogStrings(labels);
  const headingId = useId();
  const [innerFilters, setInnerFilters] = useState<BlogFilters>({ ...EMPTY_FILTERS, ...defaultFilters });
  const [innerPage, setInnerPage] = useState(defaultPage);
  const filters = filtersProp ?? innerFilters;
  const requestedPage = pageProp ?? innerPage;

  const setFilters = (next: Partial<BlogFilters>) => {
    const merged = { ...filters, ...next };
    setInnerFilters(merged);
    onFiltersChange?.(merged);
    setInnerPage(1);
    if (requestedPage !== 1) onPageChange?.(1);
  };
  const setPage = (p: number) => {
    setInnerPage(p);
    onPageChange?.(p);
  };

  const categories = useMemo(() => postCategoryCounts(posts), [posts]);
  const tags = useMemo(() => tagCounts(posts).slice(0, maxTags), [posts, maxTags]);
  const filtered = useMemo(() => sortByDate(filterPosts(posts, filters)), [posts, filters]);
  const active = Boolean(filters.query.trim() || filters.category || filters.tag);
  const featuredPost = useMemo(() => (showFeatured && !active ? pickFeatured(posts) : undefined), [showFeatured, active, posts]);
  const list = featuredPost ? filtered.filter((p) => p.slug !== featuredPost.slug) : filtered;
  const paged = paginate(list, requestedPage, pageSize);
  const showFeaturedNow = featuredPost && paged.page === 1;
  const count = filtered.length;

  return (
    <section data-slot="blog-index" aria-labelledby={headingId} className={cn("@container flex flex-col gap-8", className)} {...props}>
      <SectionHeader as="h1" headingId={headingId} title={title ?? t.title} description={description ?? t.description} action={actions} />

      {showFeaturedNow && featuredPost && <PostCard post={featuredPost} variant="featured" href={postHref?.(featuredPost)} onOpen={onOpenPost} labels={labels} />}

      <div className="flex flex-col gap-3" role="search">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <Icon icon={Search} />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={t.search}
            placeholder={t.searchPlaceholder}
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            className="[&::-webkit-search-cancel-button]:appearance-none"
          />
          {filters.query && (
            <InputGroupAddon align="end">
              <Button variant="ghost" size="icon-sm" aria-label={t.clearSearch} onClick={() => setFilters({ query: "" })}>
                <Icon icon={X} />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>
        {categories.length > 1 && (
          <ChipGroup aria-label={t.categories} value={filters.category} onValueChange={(category) => setFilters({ category })}>
            <Chip value="">{t.all}</Chip>
            {categories.map((c) => (
              <Chip key={c.value} value={c.value}>
                {c.value}
                <span className="text-muted-foreground">{formatNumber(c.count, locale)}</span>
              </Chip>
            ))}
          </ChipGroup>
        )}
        {tags.length > 0 && (
          <ChipGroup aria-label={t.tags} value={filters.tag} onValueChange={(tag) => setFilters({ tag })}>
            <Chip value="">{t.allTags}</Chip>
            {tags.map((tag) => (
              <Chip key={tag.value} value={tag.value}>
                <bdi>#{tag.value}</bdi>
              </Chip>
            ))}
          </ChipGroup>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <p role="status" aria-live="polite" className="text-body-sm text-muted-foreground">
          {count === 1 ? t.resultsOne : fill(t.results, { n: formatNumber(count, locale) })}
        </p>
        {paged.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 @2xl:grid-cols-2 @5xl:grid-cols-3">
            {paged.items.map((post) => (
              <PostCard key={post.slug} post={post} href={postHref?.(post)} onOpen={onOpenPost} labels={labels} />
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={Search}
            title={t.noResults}
            description={t.noResultsHint}
            actions={
              <Button variant="secondary" onClick={() => setFilters({ ...EMPTY_FILTERS })}>
                {t.clearFilters}
              </Button>
            }
          />
        ) : null}
        {paged.pageCount > 1 && <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={setPage} label={t.pagination} className="mx-auto" />}
      </div>
    </section>
  );
}
