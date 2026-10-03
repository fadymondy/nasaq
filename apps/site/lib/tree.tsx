import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import { BookOpen, GitPullRequest, LayoutGrid, Rocket } from "lucide-react";
import { GROUPS, groupIcon } from "./groups";
import { source } from "./source";

const GUIDE_ICONS: Record<string, typeof Rocket> = { "Get started": Rocket, Guides: BookOpen, Project: GitPullRequest };
const byLabel = new Map(GROUPS.map((g) => [g.label, g]));

/**
 * The sidebar: the guides flat under their headings, then every component group as a collapsible folder with its icon.
 * URLs stay flat (/components/<name>); only the tree is regrouped.
 */
export function sidebarTree(): Root {
  const tree = source.getPageTree();
  const children: Node[] = [];
  for (const node of tree.children) {
    if (node.type !== "folder") {
      children.push(node);
      continue;
    }
    const isIndex = (n: Node) => n.type === "page" && n.url === "/components";
    const isComponents = node.index?.url === "/components" || node.children.some(isIndex);
    if (!isComponents) {
      for (const child of node.children) {
        if (child.type === "separator" && typeof child.name === "string" && GUIDE_ICONS[child.name]) {
          const Icon = GUIDE_ICONS[child.name]!;
          children.push({ ...child, icon: <Icon /> });
        } else children.push(child);
      }
      continue;
    }
    children.push({ type: "separator", name: "Components", icon: <LayoutGrid /> });
    const index = node.index ?? node.children.find(isIndex);
    if (index) children.push({ ...index, name: "All components" });
    let folder: Folder | null = null;
    for (const child of node.children) {
      if (isIndex(child)) continue;
      if (child.type === "separator") {
        const group = typeof child.name === "string" ? byLabel.get(child.name) : undefined;
        const Icon = groupIcon(group?.key ?? "");
        folder = { type: "folder", $id: `group:${group?.key ?? String(child.name)}`, name: child.name, icon: <Icon />, children: [] };
        children.push(folder);
      } else if (folder) folder.children.push(child);
      else children.push(child);
    }
  }
  return { ...tree, children };
}
