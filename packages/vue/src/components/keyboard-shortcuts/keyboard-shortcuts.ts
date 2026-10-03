import { computed, onBeforeUnmount, onMounted, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

export const STRINGS = {
  en: {
    title: "Keyboard shortcuts",
    description: "Press these keys anywhere in the app.",
    search: "Search shortcuts",
    empty: "No shortcut matches",
    emptyHint: "Try another word, or clear the search.",
    platform: "Show keys for",
    auto: "This device",
    mac: "Mac",
    windows: "Windows",
    then: "then",
    or: "or",
    close: "Close",
    results: (n: string) => `${n} shortcuts`,
    resultsOne: "1 shortcut",
  },
  ar: {
    title: "اختصارات لوحة المفاتيح",
    description: "اضغط هذه المفاتيح من أي مكان في التطبيق.",
    search: "ابحث في الاختصارات",
    empty: "لا يوجد اختصار مطابق",
    emptyHint: "جرّب كلمة أخرى أو امسح البحث.",
    platform: "عرض المفاتيح لـ",
    auto: "هذا الجهاز",
    mac: "ماك",
    windows: "ويندوز",
    then: "ثم",
    or: "أو",
    close: "إغلاق",
    results: (n: string) => `${n} اختصارًا`,
    resultsOne: "اختصار واحد",
  },
};
export type KeyboardShortcutsLabels = Partial<Omit<(typeof STRINGS)["en"], "results" | "resultsOne">> & {
  results?: (count: string) => string;
  resultsOne?: string;
};

/** Which keyboard to draw: the device's own, or a Mac or Windows one. */
export type ShortcutPlatform = "auto" | "mac" | "windows";

export interface ShortcutItem {
  id: string;
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  /** "Mod+K", "G I". Several strings are alternatives ("Mod+K" or "/"). `Mod` is Cmd on a Mac and Ctrl elsewhere. */
  keys: string | readonly string[];
  /** Different keys on a Mac, when they are not just Cmd for Ctrl. */
  apple?: string | readonly string[];
}

export interface ShortcutGroup {
  id: string;
  title: string;
  titleAr?: string;
  items: readonly ShortcutItem[];
}

export const SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌃": "Control",
  "⌥": "Option",
  "⇧": "Shift",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
  "↵": "Return",
  "⌫": "Delete",
  "⌦": "Forward delete",
  "⇥": "Tab",
  "/": "slash",
  "?": "question mark",
  ",": "comma",
  ".": "period",
  "+": "plus",
  "-": "minus",
  "=": "equals",
  "\\": "backslash",
  "[": "left bracket",
  "]": "right bracket",
};

const APPLE_PLATFORMS = new Set(["darwin", "macos", "ios"]);
const BROWSER_PLATFORMS = new Set(["web", "extension"]);

/** True on a Mac, iPhone or iPad, or when `<html data-platform>` says so. */
export function isApplePlatform(): boolean {
  if (typeof document !== "undefined") {
    const platform = document.documentElement.dataset.platform;
    if (platform && !BROWSER_PLATFORMS.has(platform)) return APPLE_PLATFORMS.has(platform);
  }
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** True when keys are drawn for a Mac, iPhone or iPad. Follows `<html data-platform>`; "Ctrl" on the server until mounted. */
export function useShortcutApple(platform: MaybeRefOrGetter<ShortcutPlatform> = "auto"): ComputedRef<boolean> {
  const auto = ref(false);
  let observer: MutationObserver | undefined;
  onMounted(() => {
    auto.value = isApplePlatform();
    observer = new MutationObserver(() => (auto.value = isApplePlatform()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-platform"] });
  });
  onBeforeUnmount(() => observer?.disconnect());
  return computed(() => {
    const p = toValue(platform);
    return p === "mac" ? true : p === "windows" ? false : auto.value;
  });
}

const asList = (keys: string | readonly string[] | undefined): readonly string[] => (keys === undefined ? [] : typeof keys === "string" ? [keys] : keys);

/** The shortcuts of an item on this platform. */
export function shortcutItemKeys(item: Pick<ShortcutItem, "keys" | "apple">, apple: boolean): readonly string[] {
  return apple && item.apple !== undefined ? asList(item.apple) : asList(item.keys);
}

/** Picks the Arabic or English text for a locale, falling back to the other. */
export const pick = (en: string | undefined, ar: string | undefined, ambient: string) => (ambient.startsWith("ar") ? ar || en : en || ar) ?? "";
