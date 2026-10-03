"use client";

import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  useFolder,
} from "fumadocs-ui/components/sidebar/base";
import { useTreePath } from "fumadocs-ui/contexts/tree";
import type * as PageTree from "fumadocs-core/page-tree";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";

// Which top-level folder is open: one at a time, like an accordion.
let openId: string | null = null;
const listeners = new Set<() => void>();
const store = {
  get: () => openId,
  set(id: string | null) {
    openId = id;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// The docs layout's own folder styles (fumadocs-ui layouts/docs/slots/sidebar), which it does not export.
const ITEM =
  "relative flex w-full flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none [&_svg]:size-4 [&_svg]:shrink-0";
const LINK = `${ITEM} data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors`;
const CONTENT = "relative before:absolute before:inset-y-1 before:inset-s-2.5 before:w-px before:bg-fd-border before:content-['']";

/** Keeps a folder's own open state in step with the accordion: opening it closes every other folder. */
function AccordionSync({ id }: { id: string }) {
  const folder = useFolder(); // always set: rendered inside SidebarFolder
  const open = folder?.open ?? false;
  const current = useSyncExternalStore(store.subscribe, store.get, () => null);
  useEffect(() => {
    if (open && current !== id) store.set(id);
  }, [open]); // only react to this folder opening
  useEffect(() => {
    if (open && current !== null && current !== id) folder?.setOpen(false);
  }, [current]); // only react to another folder opening
  return null;
}

/** A sidebar folder that starts closed (unless it holds the current page) and closes the others when opened. */
export function AccordionFolder({ item, children }: { item: PageTree.Folder; children: ReactNode }) {
  const path = useTreePath();
  const pathname = usePathname();
  const active = path.includes(item);
  const label = (
    <>
      {item.icon}
      {item.name}
    </>
  );
  return (
    <SidebarFolder active={active} defaultOpen={false}>
      <AccordionSync id={item.$id ?? String(item.name)} />
      {item.index ? (
        <SidebarFolderLink className={LINK} href={item.index.url} active={pathname === item.index.url}>
          {label}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger className={ITEM}>{label}</SidebarFolderTrigger>
      )}
      <SidebarFolderContent className={CONTENT}>
        <div className="flex flex-col gap-0.5 pt-0.5">{children}</div>
      </SidebarFolderContent>
    </SidebarFolder>
  );
}
