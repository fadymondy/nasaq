/* Pure logic of the docs shell: the navigation tree, breadcrumbs, previous/next and the sidebar filter. */

// Same folding as blog-index, kept local so this file has no imports and runs under plain node tests.
const MARKS = /[̀-ًͯ-ٰٟـ]/g;
function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(/[أإآ]/g, "ا")
    .toLowerCase()
    .trim();
}


export interface DocsNavNode {
  /** Unique id. For a page it is what `onNavigate` receives. */
  id: string;
  title: string;
  /** Sections have children and no page of their own. */
  children?: DocsNavNode[];
  /** Small tag next to the title ("New", "Beta"). */
  badge?: string;
}

const isPage = (node: DocsNavNode) => !node.children?.length;

/** Pages (leaves) in reading order. */
export function docsPages(nodes: readonly DocsNavNode[]): DocsNavNode[] {
  return nodes.flatMap((n) => (isPage(n) ? [n] : docsPages(n.children as DocsNavNode[])));
}

/** The path from a root to the node, or `[]` when the id is not in the tree. */
export function docsTrail(nodes: readonly DocsNavNode[], id: string): DocsNavNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const rest = node.children ? docsTrail(node.children, id) : [];
    if (rest.length) return [node, ...rest];
  }
  return [];
}

/** Section ids above a page: these stay expanded so the current page is visible. */
export function docsAncestorIds(nodes: readonly DocsNavNode[], id: string): string[] {
  return docsTrail(nodes, id).slice(0, -1).map((n) => n.id);
}

/** The pages before and after in reading order. */
export function docsPrevNext(nodes: readonly DocsNavNode[], id: string): { prev?: DocsNavNode; next?: DocsNavNode } {
  const pages = docsPages(nodes);
  const i = pages.findIndex((p) => p.id === id);
  if (i < 0) return {};
  return { prev: pages[i - 1], next: pages[i + 1] };
}

/**
 * The tree with only what matches: a page whose title contains every word, or a section with such pages (kept with its
 * matching pages). A section whose own title matches keeps all of its pages. Empty query returns the tree untouched.
 */
export function filterDocsTree(nodes: readonly DocsNavNode[], query: string): DocsNavNode[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...nodes];
  const hit = (n: DocsNavNode) => {
    const hay = normalizeText(n.title);
    return words.every((w) => hay.includes(w));
  };
  const walk = (list: readonly DocsNavNode[]): DocsNavNode[] =>
    list.flatMap((n) => {
      if (isPage(n)) return hit(n) ? [n] : [];
      if (hit(n)) return [n];
      const kept = walk(n.children as DocsNavNode[]);
      return kept.length ? [{ ...n, children: kept }] : [];
    });
  return walk(nodes);
}

/** Every section id of a tree, to expand all while filtering. */
export function docsSectionIds(nodes: readonly DocsNavNode[]): string[] {
  return nodes.flatMap((n) => (isPage(n) ? [] : [n.id, ...docsSectionIds(n.children as DocsNavNode[])]));
}

/** What "Copy page" puts on the clipboard: the title as a heading, the summary, then the body. */
export function docsPageMarkdown(page: { title: string; description?: string; markdown: string }): string {
  const body = page.markdown.replace(/^\s*#\s+.*\r?\n+/, "");
  return [`# ${page.title}`, page.description ? `\n${page.description}` : "", `\n${body.trim()}\n`].join("\n").replace(/\n{3,}/g, "\n\n");
}
