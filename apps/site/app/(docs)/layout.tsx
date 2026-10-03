import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { AccordionFolder } from "@/components/sidebar-folder";
import { baseOptions } from "@/lib/layout.shared";
import { sidebarTree } from "@/lib/tree";

const tree = sidebarTree();

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout tree={tree} {...baseOptions} sidebar={{ components: { Folder: AccordionFolder } }}>
      {children}
    </DocsLayout>
  );
}
