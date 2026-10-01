import { computed } from "vue";
import type { Component, VNode } from "vue";
import { useNasaq } from "../../provider";

export const STRINGS = {
  en: {
    launchpad: "Launchpad",
    searchApps: "Search apps",
    noApps: "No apps match",
    close: "Close",
    minimise: "Minimise",
    maximise: "Maximise",
    restore: "Restore",
    open: "Open",
    newWindow: "New window",
    closeAll: "Close all windows",
    dock: "Dock",
    desktop: "Desktop",
    menuBar: "Menu bar",
    running: "Running",
  },
  ar: {
    launchpad: "لوحة التطبيقات",
    searchApps: "ابحث في التطبيقات",
    noApps: "لا توجد تطبيقات مطابقة",
    close: "إغلاق",
    minimise: "تصغير",
    maximise: "تكبير",
    restore: "استعادة",
    open: "فتح",
    newWindow: "نافذة جديدة",
    closeAll: "إغلاق كل النوافذ",
    dock: "الشريط السفلي",
    desktop: "سطح المكتب",
    menuBar: "شريط القوائم",
    running: "قيد التشغيل",
  },
};

export type DesktopShellLabels = Partial<(typeof STRINGS)["en"]>;

export function useDesktopStrings(labels?: () => DesktopShellLabels | undefined) {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  const rtl = computed(() => nq.direction.value === "rtl");
  const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...labels?.() }));
  return { t, rtl };
}

/** Anything the shell can render: a component or a vnode. */
export type DesktopRenderable = Component | VNode;

export interface DesktopApp {
  id: string;
  title: string;
  /** The icon tile in the dock and the launchpad. A component or vnode; a lucide glyph in a `NqDesktopAppIcon` looks right. */
  icon: DesktopRenderable;
  /** The window body. */
  content: DesktopRenderable;
  /** Starting size of a new window. */
  size?: { w: number; h: number };
  /** One window at most. Opening it again focuses it. */
  single?: boolean;
  /** Stays in the dock when closed. Default true. */
  pinned?: boolean;
  /** Extra words the launchpad search matches. */
  keywords?: readonly string[];
}

export interface DesktopMenuItem {
  id: string;
  label: string;
  onSelect?: () => void;
  shortcut?: string | readonly string[];
  disabled?: boolean;
  danger?: boolean;
  /** A separator goes before this item. */
  separated?: boolean;
}

export interface DesktopMenu {
  id: string;
  label: string;
  items: readonly DesktopMenuItem[];
}

/** What the shell's default slot receives (as slot props). */
export interface DesktopShellApi {
  /** Opens the app, or brings its latest window to the front. */
  open: (appId: string) => void;
}
