/* Pure logic for the blog: reading time, table of contents, filtering, paging and related posts. No imports, so node --test runs it directly. */

export interface BlogAuthor {
  name: string;
  avatar?: string;
  /** "Founder, Nasaq". */
  role?: string;
  /** One or two sentences, shown at the end of a post. */
  bio?: string;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  /** Cover image URL. Without one a generated cover is drawn from the slug. */
  cover?: string;
  coverAlt?: string;
  category: string;
  tags: string[];
  /** ISO string, timestamp or Date. */
  date: string | number | Date;
  author?: BlogAuthor;
  /** Minutes. Computed from the body by `readingTime` when the post has one and this is missing. */
  readingMinutes?: number;
  featured?: boolean;
}

export interface BlogFilters {
  query: string;
  /** "" means every category. */
  category: string;
  /** "" means every tag. */
  tag: string;
}

export const EMPTY_FILTERS: BlogFilters = { query: "", category: "", tag: "" };

/* ------------------------------------------------------------ text helpers */

const MARKS = /[̀-ًͯ-ٰٟـ]/g;

/** Lower-cases and strips Latin accents and Arabic tashkeel and tatweel, so "Résumé" finds "resume" and "كِتَاب" finds "كتاب". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .trim();
}

/** URL-safe id for a heading. Keeps letters and digits of any script (Arabic included), turns spaces into "-". */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/** Text of a Markdown line without its inline syntax: links, images, emphasis, code ticks, HTML. */
export function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]+/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

const FENCE = /^\s{0,3}(```+|~~~+)/;

/** Splits a Markdown body into prose and fenced code, so each can be counted on its own. */
function splitFences(markdown: string): { prose: string[]; code: string[] } {
  const prose: string[] = [];
  const code: string[] = [];
  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const m = FENCE.exec(line);
    if (fence) {
      const mark = m?.[1];
      if (mark && mark[0] === fence[0] && mark.length >= fence.length) fence = null;
      else code.push(line);
      continue;
    }
    if (m) {
      fence = m[1] as string;
      continue;
    }
    prose.push(line);
  }
  return { prose, code };
}

type Segmenter = { segment(s: string): Iterable<{ isWordLike?: boolean }> };

/** Words in a text, by the Unicode word rules when the runtime has `Intl.Segmenter` (Arabic and CJK included), else by spaces. */
export function countWords(text: string): number {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const s of new Seg(undefined, { granularity: "word" }).segment(text)) if (s.isWordLike) n++;
    return n;
  }
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export interface ReadingTime {
  words: number;
  minutes: number;
}

/**
 * Reading time of a Markdown body. Prose counts in full, fenced code at half (it is skimmed), each image adds
 * 12 seconds. 220 words a minute by default; never less than one minute.
 */
export function readingTime(markdown: string, wordsPerMinute = 220): ReadingTime {
  const { prose, code } = splitFences(markdown);
  const text = prose.join("\n");
  const images = (text.match(/!\[[^\]]*\]\([^)]*\)/g) ?? []).length;
  const words = countWords(stripInline(text));
  const codeWords = countWords(code.join("\n"));
  const minutes = (words + codeWords / 2) / wordsPerMinute + (images * 12) / 60;
  return { words: words + codeWords, minutes: Math.max(1, Math.ceil(minutes)) };
}

/* -------------------------------------------------------------------- toc */

export interface TocItem {
  id: string;
  text: string;
  level: number;
  /** 1-based line of the heading in the source, so the renderer can match a heading node to its id. */
  line: number;
}

/**
 * Headings of a Markdown body for a table of contents. ATX headings only (`## Title`), fenced code is skipped,
 * ids are unique ("setup", "setup-2"). Levels outside `minLevel`..`maxLevel` are left out.
 */
export function extractToc(markdown: string, { minLevel = 2, maxLevel = 3 }: { minLevel?: number; maxLevel?: number } = {}): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const f = FENCE.exec(line);
    if (fence) {
      const mark = f?.[1];
      if (mark && mark[0] === fence[0] && mark.length >= fence.length) fence = null;
      continue;
    }
    if (f) {
      fence = f[1] as string;
      continue;
    }
    const m = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
    if (!m) continue;
    const level = (m[1] as string).length;
    if (level < minLevel || level > maxLevel) continue;
    const text = stripInline(m[2] as string);
    if (!text) continue;
    const base = slugifyHeading(text);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    items.push({ id: n === 1 ? base : `${base}-${n}`, text, level, line: i + 1 });
  }
  return items;
}

/** The heading the reader is in: the last one whose top edge has passed `offset` px from the viewport top. Null above the first. */
export function activeHeadingId(tops: { id: string; top: number }[], offset = 96): string | null {
  let active: string | null = null;
  for (const t of tops) {
    if (t.top <= offset + 1) active = t.id;
    else break;
  }
  return active;
}

/** 0..1 through an article. `top` and `height` are the article's bounding box, `viewport` the window height. */
export function readingProgress(top: number, height: number, viewport: number): number {
  const scrollable = height - viewport;
  if (scrollable <= 0) return top <= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, -top / scrollable));
}

/* ---------------------------------------------------------------- callouts */

export const CALLOUT_KINDS = ["note", "tip", "important", "warning", "caution"] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: { hProperties?: Record<string, unknown> } };

/**
 * remark plugin: a blockquote that starts with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` (GitHub's
 * callout syntax) gets `data-callout="note"` and loses the marker. Pass it in `Markdown`'s `remarkPlugins`.
 */
export function remarkCallouts() {
  const visit = (node: MdNode) => {
    if (node.type === "blockquote") {
      const p = node.children?.[0];
      const t = p?.type === "paragraph" ? p.children?.[0] : undefined;
      const m = t?.type === "text" ? /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n?/i.exec(t.value ?? "") : null;
      if (p && t && m) {
        t.value = (t.value ?? "").slice(m[0].length);
        if (!t.value) p.children?.shift();
        if (!p.children?.length) node.children?.shift();
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, "data-callout": (m[1] as string).toLowerCase() } };
      }
    }
    for (const c of node.children ?? []) visit(c);
  };
  return (tree: MdNode) => visit(tree);
}

/* --------------------------------------------------------------- filtering */

const time = (d: BlogPostSummary["date"]) => new Date(d).getTime();

/** Newest first. Does not mutate. */
export function sortByDate<T extends { date: BlogPostSummary["date"] }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => time(b.date) - time(a.date));
}

/** Posts matching every word of the query (title, excerpt, category, tags, author) and the chosen category and tag. */
export function filterPosts(posts: BlogPostSummary[], { query, category, tag }: Partial<BlogFilters>): BlogPostSummary[] {
  const words = normalizeText(query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return posts.filter((p) => {
    if (category && p.category !== category) return false;
    if (tag && !p.tags.includes(tag)) return false;
    if (!words.length) return true;
    const hay = normalizeText([p.title, p.excerpt, p.category, p.tags.join(" "), p.author?.name ?? ""].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

export interface Count {
  value: string;
  count: number;
}

const byCount = (a: Count, b: Count) => b.count - a.count || a.value.localeCompare(b.value);

export function postCategoryCounts(posts: BlogPostSummary[]): Count[] {
  const m = new Map<string, number>();
  for (const p of posts) m.set(p.category, (m.get(p.category) ?? 0) + 1);
  return [...m].map(([value, count]) => ({ value, count })).sort(byCount);
}

export function tagCounts(posts: BlogPostSummary[]): Count[] {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of new Set(p.tags)) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].map(([value, count]) => ({ value, count })).sort(byCount);
}

export interface Page<T> {
  items: T[];
  /** Clamped to 1..pageCount. */
  page: number;
  pageCount: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return { items: items.slice((current - 1) * size, current * size), page: current, pageCount, total: items.length };
}

/** The post to feature: the newest marked `featured`, else the newest. */
export function pickFeatured(posts: BlogPostSummary[]): BlogPostSummary | undefined {
  const sorted = sortByDate(posts);
  return sorted.find((p) => p.featured) ?? sorted[0];
}

/** Related posts: same category counts 3, each shared tag 2. Highest score first, newer wins ties. Posts scoring 0 are left out. */
export function relatedPosts(post: BlogPostSummary, all: BlogPostSummary[], limit = 3): BlogPostSummary[] {
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: (p.category === post.category ? 3 : 0) + p.tags.filter((t) => post.tags.includes(t)).length * 2 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || time(b.p.date) - time(a.p.date))
    .slice(0, limit)
    .map((x) => x.p);
}

/** The next newer and next older post by date. */
export function adjacentPosts(post: BlogPostSummary, all: BlogPostSummary[]): { newer?: BlogPostSummary; older?: BlogPostSummary } {
  const sorted = sortByDate(all);
  const i = sorted.findIndex((p) => p.slug === post.slug);
  if (i < 0) return {};
  return { newer: sorted[i - 1], older: sorted[i + 1] };
}
