// Helpers of nqDocsShell: the sidebar filter of docs-model.ts (packages/web), trimmed to what the browser needs.

export interface DocsShellNode {
  id: string;
  title: string;
  children?: DocsShellNode[];
}

/** Lower-case, accents folded, so "Café" finds "cafe". */
export function docsShellNormalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const isPage = (n: DocsShellNode) => !n.children?.length;

/** The tree with only what matches: a page with every word in its title, or a section with such pages. A matching section keeps all its pages. */
export function filterDocsShellTree(nodes: readonly DocsShellNode[], query: string): DocsShellNode[] {
  const words = docsShellNormalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...nodes];
  const hit = (n: DocsShellNode) => {
    const hay = docsShellNormalize(n.title);
    return words.every((w) => hay.includes(w));
  };
  const walk = (list: readonly DocsShellNode[]): DocsShellNode[] =>
    list.flatMap((n) => {
      if (isPage(n)) return hit(n) ? [n] : [];
      if (hit(n)) return [n];
      const kept = walk(n.children as DocsShellNode[]);
      return kept.length ? [{ ...n, children: kept }] : [];
    });
  return walk(nodes);
}

/** Every id in the tree, in order. */
export function docsShellIds(nodes: readonly DocsShellNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...docsShellIds(n.children ?? [])]);
}

/** Every section id, to expand all while filtering. */
export function docsShellSectionIds(nodes: readonly DocsShellNode[]): string[] {
  return nodes.flatMap((n) => (isPage(n) ? [] : [n.id, ...docsShellSectionIds(n.children as DocsShellNode[])]));
}
