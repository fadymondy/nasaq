"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { SidebarContent, SidebarGroup, SidebarItem, SidebarNest, SidebarSubItem } from "../app-shell";
import { Button } from "../button";
import { Icon } from "../icon";
import { Sheet, SheetBody, SheetContent, SheetTitle } from "../sheet";
import { Tooltip } from "../tooltip";

const STRINGS = {
  en: {
    rail: "Sections",
    sub: "Section navigation",
    hide: "Hide sub-menu",
    show: "Show sub-menu",
    menu: "Open navigation",
    menuTitle: "Navigation",
  },
  ar: {
    rail: "الأقسام",
    sub: "التنقل داخل القسم",
    hide: "إخفاء القائمة الفرعية",
    show: "إظهار القائمة الفرعية",
    menu: "فتح التنقل",
    menuTitle: "التنقل",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type IconRailSidebarLabels = Partial<typeof STRINGS.en>;

/** A page inside a section. With `children` it becomes an expandable parent (one level). */
export interface RailLink {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  /** A count or status at the inline end. */
  badge?: ReactNode;
  children?: readonly RailLink[];
}

export interface RailGroup {
  id: string;
  /** Small heading above the group. */
  label?: string;
  items: readonly RailLink[];
}

/** One button on the rail. With `groups` it owns a sub-sidebar; without, it is a plain link. */
export interface RailSection {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  /** A dot or count on the rail button. */
  badge?: ReactNode;
  /** Heading of the sub-sidebar. Default: the label. */
  title?: string;
  groups?: readonly RailGroup[];
}

export interface IconRailSidebarProps {
  sections: readonly RailSection[];
  /** The active section id. Controlled. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** The active page id inside the section. Controlled. */
  activeItem?: string;
  /** Called when a page (or a section without a sub-sidebar) is chosen. */
  onItemSelect?: (id: string, sectionId: string) => void;
  /** Top of the rail: a logo mark. */
  brand?: ReactNode;
  /** Bottom of the rail: user menu, help. */
  railFooter?: ReactNode;
  /** Top of the sub-sidebar, under its title: a workspace switcher or search. */
  subHeader?: ReactNode;
  /** Bottom of the sub-sidebar. */
  subFooter?: ReactNode;
  /** Whether the sub-sidebar is shown on wide screens. Controlled. */
  subOpen?: boolean;
  defaultSubOpen?: boolean;
  onSubOpenChange?: (open: boolean) => void;
  /** The page. */
  children?: ReactNode;
  labels?: IconRailSidebarLabels;
  className?: string;
}

const railButton = [
  "relative flex size-10 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:text-foreground",
  "data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:-start-1.5 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-nq-accent",
  "[&_svg]:size-5 [&_svg]:shrink-0",
].join(" ");

/**
 * Two-level navigation. A slim rail of icons picks the section; a sub-sidebar beside it lists that
 * section's pages, in groups, with expandable parents. On narrow screens both fold into a sheet behind
 * a menu button. The page (`children`) fills the rest.
 */
export function IconRailSidebar({
  sections,
  value,
  defaultValue,
  onValueChange,
  activeItem,
  onItemSelect,
  brand,
  railFooter,
  subHeader,
  subFooter,
  subOpen,
  defaultSubOpen = true,
  onSubOpenChange,
  children,
  labels,
  className,
}: IconRailSidebarProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [innerValue, setInnerValue] = useState(defaultValue ?? sections[0]?.id ?? "");
  const [innerSub, setInnerSub] = useState(defaultSubOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  // A page chosen from outside (a route change) moves the rail to the section that owns it.
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  useEffect(() => {
    if (value !== undefined || !activeItem) return;
    const owns = (links: readonly RailLink[]): boolean => links.some((l) => l.id === activeItem || (l.children ? owns(l.children) : false));
    const owner = sectionsRef.current.find((s) => s.groups?.some((g) => owns(g.items)));
    if (owner) setInnerValue(owner.id);
  }, [activeItem, value]);
  const sectionId = value ?? innerValue;
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const hasSub = Boolean(section?.groups?.length);
  const showSub = subOpen ?? innerSub;
  const setSub = (next: boolean) => {
    if (subOpen === undefined) setInnerSub(next);
    onSubOpenChange?.(next);
  };
  const subId = useId();

  const pickSection = (next: RailSection, fromSheet: boolean, event: MouseEvent) => {
    if (!next.href) event.preventDefault();
    if (next.id === section?.id && next.groups?.length && !fromSheet) {
      setSub(!showSub);
      return;
    }
    if (value === undefined) setInnerValue(next.id);
    onValueChange?.(next.id);
    if (next.groups?.length) {
      if (!fromSheet) setSub(true);
    } else {
      onItemSelect?.(next.id, next.id);
      if (fromSheet) setMenuOpen(false);
    }
  };

  const pickItem = (link: RailLink, event: MouseEvent, fromSheet: boolean) => {
    if (!link.href) event.preventDefault();
    onItemSelect?.(link.id, section?.id ?? "");
    if (fromSheet) setMenuOpen(false);
  };

  const rail = (fromSheet: boolean) => (
    <RailColumn
      sections={sections}
      activeId={section?.id}
      brand={brand}
      footer={railFooter}
      label={t.rail}
      subId={subId}
      subOpen={showSub && !fromSheet}
      onPick={(s, e) => pickSection(s, fromSheet, e)}
    />
  );

  const sub = (fromSheet: boolean) =>
    section && hasSub ? (
      <SubColumn
        id={fromSheet ? undefined : subId}
        section={section}
        header={subHeader}
        footer={subFooter}
        label={t.sub}
        activeItem={activeItem}
        onPick={(link, e) => pickItem(link, e, fromSheet)}
        action={
          fromSheet ? null : (
            <Tooltip content={t.hide}>
              <Button variant="ghost" size="icon-sm" aria-label={t.hide} onClick={() => setSub(false)} className="text-muted-foreground">
                <Icon icon={PanelLeftClose} directional />
              </Button>
            </Tooltip>
          )
        }
      />
    ) : null;

  return (
    <div data-slot="icon-rail-sidebar" className={cn("flex h-full min-h-0 w-full bg-background text-foreground", className)}>
      <div className="hidden shrink-0 md:flex">
        {rail(false)}
        {showSub ? sub(false) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div data-slot="icon-rail-mobile-bar" className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <Button variant="ghost" size="icon-sm" aria-label={t.menu} onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <span className="min-w-0 flex-1 truncate text-label">{section?.title ?? section?.label}</span>
        </div>
        {hasSub && !showSub ? (
          <div className="hidden px-3 pt-3 md:block">
            <Tooltip content={t.show}>
              <Button variant="ghost" size="icon-sm" aria-label={t.show} aria-controls={subId} aria-expanded={false} onClick={() => setSub(true)} className="text-muted-foreground">
                <Icon icon={PanelLeftOpen} directional />
              </Button>
            </Tooltip>
          </div>
        ) : null}
        <div data-slot="icon-rail-content" className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="start" showClose={false} className="w-[min(20rem,90vw)] p-0">
          <SheetTitle className="sr-only">{t.menuTitle}</SheetTitle>
          <SheetBody className="flex h-full min-h-0 p-0">
            {rail(true)}
            {sub(true)}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ rail */

function RailColumn({
  sections,
  activeId,
  brand,
  footer,
  label,
  subId,
  subOpen,
  onPick,
}: {
  sections: readonly RailSection[];
  activeId?: string;
  brand?: ReactNode;
  footer?: ReactNode;
  label: string;
  subId: string;
  subOpen: boolean;
  onPick: (section: RailSection, event: MouseEvent) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const onKeyDown = (event: KeyboardEvent) => {
    const keys = ["ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-rail-button]") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.min(buttons.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)));
    buttons[next]?.focus();
  };
  return (
    <nav aria-label={label} data-slot="icon-rail" className="flex w-14 shrink-0 flex-col items-center gap-3 border-e border-border bg-card py-3">
      {brand ? (
        <div data-slot="icon-rail-brand" className="flex size-10 shrink-0 items-center justify-center">
          {brand}
        </div>
      ) : null}
      <ul ref={listRef} onKeyDown={onKeyDown} className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-2 [scrollbar-width:none]">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <Tooltip content={s.label} side="inline-end">
                <a
                  data-rail-button
                  data-active={active}
                  href={s.href ?? "#"}
                  aria-label={s.label}
                  aria-current={active ? "page" : undefined}
                  aria-controls={s.groups?.length ? subId : undefined}
                  aria-expanded={s.groups?.length && active ? subOpen : undefined}
                  className={railButton}
                  onClick={(e) => onPick(s, e)}
                >
                  {s.icon}
                  {s.badge ? (
                    <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-nq-accent px-1 text-caption leading-4 font-medium text-foreground">{s.badge}</span>
                  ) : null}
                </a>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      {footer ? (
        <div data-slot="icon-rail-footer" className="flex shrink-0 flex-col items-center gap-2">
          {footer}
        </div>
      ) : null}
    </nav>
  );
}

/* ------------------------------------------------------------------ sub-sidebar */

function SubColumn({
  id,
  section,
  header,
  footer,
  label,
  activeItem,
  action,
  onPick,
}: {
  id?: string;
  section: RailSection;
  header?: ReactNode;
  footer?: ReactNode;
  label: string;
  activeItem?: string;
  action?: ReactNode;
  onPick: (link: RailLink, event: MouseEvent) => void;
}) {
  const link = (l: RailLink) => (
    <SidebarItem key={l.id} href={l.href ?? "#"} active={activeItem === l.id} icon={l.icon} trailing={l.badge} onClick={(e) => onPick(l, e)}>
      {l.label}
    </SidebarItem>
  );
  return (
    <nav id={id} aria-label={`${label}: ${section.title ?? section.label}`} data-slot="icon-rail-sub" className="flex w-60 shrink-0 flex-col gap-2 overflow-hidden border-e border-border bg-background p-shell">
      <div className="flex h-8 shrink-0 items-center gap-1 ps-2">
        <h2 className="min-w-0 flex-1 truncate text-label text-foreground">{section.title ?? section.label}</h2>
        {action}
      </div>
      {header}
      <SidebarContent>
        {section.groups?.map((group) => (
          <SidebarGroup key={group.id} label={group.label}>
            {group.items.map((item) =>
              item.children?.length ? (
                <SidebarNest key={item.id} label={item.label} icon={item.icon} active={item.children.some((c) => c.id === activeItem)}>
                  {item.children.map((child) => (
                    <SidebarSubItem key={child.id} href={child.href ?? "#"} active={activeItem === child.id} onClick={(e) => onPick(child, e)}>
                      {child.label}
                    </SidebarSubItem>
                  ))}
                </SidebarNest>
              ) : (
                link(item)
              ),
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </nav>
  );
}
