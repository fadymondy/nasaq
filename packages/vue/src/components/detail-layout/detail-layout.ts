import type { TagHue } from "../badge";
import type { DetailTabLike } from "./detail-layout-logic";

export const DETAIL_LAYOUT_STRINGS = {
  en: {
    nav: "Sections",
    lastActive: "Last active",
    never: "No activity yet",
    activity: "{name} activity",
    errorTitle: "This page could not load",
    errorBody: "Check your connection and try again.",
    retry: "Try again",
    loading: "Loading",
  },
  ar: {
    nav: "الأقسام",
    lastActive: "آخر نشاط",
    never: "لا نشاط بعد",
    activity: "نشاط {name}",
    errorTitle: "تعذر تحميل هذه الصفحة",
    errorBody: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل",
  },
};

export type DetailLayoutLabels = (typeof DETAIL_LAYOUT_STRINGS)["en"];

export const detailLayoutFill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export interface DetailTab extends DetailTabLike {
  label: string;
  /** An icon name or an image URL. */
  icon?: string;
  /** A count or a short badge after the label. */
  badge?: string | number;
}

export type DetailStatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface DetailIdentity {
  name: string;
  description?: string;
  version?: string;
  /** What the thing is ("Source", "Customer"), as a badge. */
  kind?: string;
  status?: { label: string; tone?: DetailStatusTone };
  /** An icon name or an image URL. Use the `icon` slot for anything else. */
  icon?: string;
  /** The icon tile and sparkline colour. Default `"gray"`. */
  hue?: TagHue;
  /** An id or slug under the name, monospaced. */
  slug?: string;
}

export interface DetailActivity {
  count?: number;
  countLabel?: string;
  /** Recent activity, oldest first. */
  series?: readonly number[];
  lastActiveAt?: number | string | Date | null;
}
