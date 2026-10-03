import type { Folder, Node, Root } from "fumadocs-core/page-tree";
import { BookOpen, GitPullRequest, Rocket } from "lucide-react";
import { GROUPS, groupIcon } from "./groups";
import { source } from "./source";

const GUIDE_ICONS: Record<string, typeof Rocket> = { "Get started": Rocket, Guides: BookOpen, Project: GitPullRequest };
const byLabel = new Map(GROUPS.map((g) => [g.label, g]));

/** Turns each `---Heading---` separator and the pages under it into a folder (components/sidebar-folder.tsx). */
function fold(nodes: Node[], make: (name: string) => Folder | null): Node[] {
  const out: Node[] = [];
  let folder: Folder | null = null;
  for (const node of nodes) {
    if (node.type === "separator" && typeof node.name === "string") {
      folder = make(node.name);
      if (folder) {
        out.push(folder);
        continue;
      }
    }
    if (folder) folder.children.push(node);
    else out.push(node);
  }
  return out.map(promoteIndex);
}

/** A folder never lists a page with its own name: that page becomes the folder's index (its name links to it). */
function promoteIndex(node: Node): Node {
  if (node.type !== "folder" || node.index) return node;
  const same = node.children.find((n) => n.type === "page" && n.name === node.name);
  if (!same || same.type !== "page") return node;
  return { ...node, index: same, children: node.children.filter((n) => n !== same) };
}

/**
 * The sidebar: every guide section and every component group is a collapsible folder with its icon, closed
 * until opened, one open at a time. URLs stay flat (/guides/<slug>, /components/<name>); only the tree is regrouped.
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
    if (!(node.index?.url === "/components" || node.children.some(isIndex))) {
      children.push(
        ...fold(node.children, (name) => {
          const Icon = GUIDE_ICONS[name] ?? BookOpen;
          return { type: "folder", $id: `guides:${name}`, name, icon: <Icon />, children: [] };
        }),
      );
      continue;
    }
    // No "Components" heading: the top "Components" link already opens /components.
    children.push(
      ...fold(
        node.children.filter((n) => !isIndex(n)),
        (name) => {
          const group = byLabel.get(name);
          if (!group) return null;
          const Icon = groupIcon(group.key);
          const page = source.getPage(["components", "groups", group.key]);
          return {
            type: "folder",
            $id: `group:${group.key}`,
            name,
            icon: <Icon />,
            // The folder name opens the group's index page (/components/groups/<key>).
            index: page ? { type: "page", name, url: page.url, $id: `group-index:${group.key}` } : undefined,
            children: [],
          };
        },
      ),
    );
  }
  return { ...tree, children };
}
