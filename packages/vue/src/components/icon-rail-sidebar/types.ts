import type { Component } from "vue";

export const ICON_RAIL_STRINGS = {
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

export type IconRailSidebarLabels = Partial<typeof ICON_RAIL_STRINGS.en>;

/** A page inside a section. With `children` it becomes an expandable parent (one level). */
export interface RailLink {
  id: string;
  label: string;
  /** An icon component (a lucide-vue-next icon). */
  icon?: Component;
  href?: string;
  /** A count or status at the inline end. */
  badge?: string | number;
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
  icon: Component;
  href?: string;
  /** A dot or count on the rail button. */
  badge?: string | number;
  /** Heading of the sub-sidebar. Default: the label. */
  title?: string;
  groups?: readonly RailGroup[];
}
