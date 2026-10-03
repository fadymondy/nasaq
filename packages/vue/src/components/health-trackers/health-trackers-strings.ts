import type { Component } from "vue";
import type { FoodKind, FoodVerdict, FoodVerdictSource } from "./health-trackers-logic";
// Strings and shared types of the health trackers, ported from health-trackers.tsx.

export const HEALTH_STRINGS = {
  en: {
    cupsLabel: "{filled} of {total} cups logged today",
    cupNext: "Log one cup",
    cupWait: "Wait {time} for the next cup",
    cupsDone: "Every cup logged. That is the day done.",
    cupsLogging: "Logging",
    cupsFailed: "Could not log the cup.",
    pinnedTitle: "Quick log",
    pinnedEmpty: "Pin the things you log every day and they show up here as one-tap buttons.",
    pinnedOpenCatalogue: "Open the catalogue",
    pinnedLogged: "Logged {name}",
    pinnedFlagged: "Logged {name} and flagged it",
    pinnedFailed: "Could not log {name}.",
    logAnyway: "Log anyway",
    unpin: "Unpin",
    pin: "Pin to quick log",
    catalogue: "Food and drink catalogue",
    searchPlaceholder: "Search the catalogue…",
    name: "Name",
    kind: "Type",
    verdict: "Verdict",
    families: "Trigger families",
    note: "Note",
    pinned: "Pinned",
    kindFood: "Food",
    kindDrink: "Drink",
    verdictSafe: "Safe",
    verdictTrigger: "Trigger",
    verdictUnreviewed: "Unreviewed",
    sourceNone: "Not decided",
    sourceYou: "Decided by you",
    sourceCatalogue: "From the catalogue",
    sourceClinician: "From your clinician",
    unreviewedHint: "Nobody has judged this yet. It is not the same as safe.",
    catalogueEmpty: "The catalogue is empty",
    catalogueEmptyHint: "Add the foods and drinks you log so each one carries a verdict.",
    add: "Add item",
    edit: "Edit",
    delete: "Delete",
    deleteTitle: "Delete {name}?",
    deleteBody: "It leaves the catalogue and your quick log. Entries already logged keep their record.",
    cancel: "Cancel",
    deleting: "Deleting",
    actionFailed: "That did not work. Try again.",
    builderNew: "New item",
    builderEdit: "Edit item",
    builderNameAr: "Arabic name",
    builderNameArHint: "Shown when the app is in Arabic.",
    builderNameRequired: "Give the item a name.",
    builderVerdict: "Verdict",
    builderFamilies: "Trigger families",
    builderFamiliesHint: "Pick every family this item belongs to.",
    builderFamiliesRequired: "A trigger needs at least one family.",
    builderNote: "Note",
    builderNoteHint: "Kept as written, for your own doctor. Nothing adds it up.",
    builderSave: "Save item",
    builderSaving: "Saving",
    builderCompleteness: "{done} of {total} steps",
    builderCompletenessLabel: "Entry completeness",
    builderMissingIntro: "Still to add",
    stepName: "a name",
    stepNameAr: "an Arabic name",
    stepVerdict: "a verdict",
    stepFamilies: "a trigger family",
    stepNote: "a note",
    flaggedTitle: "Flagged entries",
    flaggedCount: "{count} flagged",
    flaggedNone: "Nothing flagged today.",
    flaggedIntro: "These were recorded, then flagged against your protocol. They are not errors.",
    flaggedLoading: "Loading flagged entries",
    flaggedFailed: "Could not load the flagged entries.",
    retry: "Try again",
  },
  ar: {
    cupsLabel: "{filled} من {total} أكواب مسجّلة اليوم",
    cupNext: "سجّل كوبًا",
    cupWait: "انتظر {time} للكوب التالي",
    cupsDone: "سُجّلت كل الأكواب. اكتمل اليوم.",
    cupsLogging: "جارٍ التسجيل",
    cupsFailed: "تعذر تسجيل الكوب.",
    pinnedTitle: "تسجيل سريع",
    pinnedEmpty: "ثبّت ما تسجّله كل يوم ليظهر هنا كأزرار بلمسة واحدة.",
    pinnedOpenCatalogue: "افتح الكتالوج",
    pinnedLogged: "سُجّل {name}",
    pinnedFlagged: "سُجّل {name} ووُضعت عليه علامة",
    pinnedFailed: "تعذر تسجيل {name}.",
    logAnyway: "سجّل على أي حال",
    unpin: "إلغاء التثبيت",
    pin: "ثبّت في التسجيل السريع",
    catalogue: "كتالوج الأطعمة والمشروبات",
    searchPlaceholder: "ابحث في الكتالوج…",
    name: "الاسم",
    kind: "النوع",
    verdict: "الحكم",
    families: "عائلات المحفّزات",
    note: "ملاحظة",
    pinned: "مثبّت",
    kindFood: "طعام",
    kindDrink: "مشروب",
    verdictSafe: "آمن",
    verdictTrigger: "محفّز",
    verdictUnreviewed: "لم يُراجَع",
    sourceNone: "لم يُحسم",
    sourceYou: "حسمتَه أنت",
    sourceCatalogue: "من الكتالوج",
    sourceClinician: "من طبيبك",
    unreviewedHint: "لم يحكم عليه أحد بعد. وهذا لا يعني أنه آمن.",
    catalogueEmpty: "الكتالوج فارغ",
    catalogueEmptyHint: "أضف الأطعمة والمشروبات التي تسجّلها ليحمل كل منها حكمًا.",
    add: "إضافة عنصر",
    edit: "تعديل",
    delete: "حذف",
    deleteTitle: "حذف {name}؟",
    deleteBody: "يخرج من الكتالوج ومن التسجيل السريع. تحتفظ الإدخالات المسجّلة بسجلها.",
    cancel: "إلغاء",
    deleting: "جارٍ الحذف",
    actionFailed: "لم تنجح العملية. حاول مرة أخرى.",
    builderNew: "عنصر جديد",
    builderEdit: "تعديل العنصر",
    builderNameAr: "الاسم بالعربية",
    builderNameArHint: "يظهر عندما يكون التطبيق بالعربية.",
    builderNameRequired: "أعطِ العنصر اسمًا.",
    builderVerdict: "الحكم",
    builderFamilies: "عائلات المحفّزات",
    builderFamiliesHint: "اختر كل عائلة ينتمي إليها هذا العنصر.",
    builderFamiliesRequired: "يحتاج المحفّز إلى عائلة واحدة على الأقل.",
    builderNote: "ملاحظة",
    builderNoteHint: "تبقى كما كُتبت، لطبيبك. لا شيء يجمعها.",
    builderSave: "حفظ العنصر",
    builderSaving: "جارٍ الحفظ",
    builderCompleteness: "{done} من {total} خطوات",
    builderCompletenessLabel: "اكتمال الإدخال",
    builderMissingIntro: "ما زال ناقصًا",
    stepName: "اسم",
    stepNameAr: "اسم بالعربية",
    stepVerdict: "حكم",
    stepFamilies: "عائلة محفّز",
    stepNote: "ملاحظة",
    flaggedTitle: "الإدخالات المعلَّمة",
    flaggedCount: "{count} معلَّمة",
    flaggedNone: "لا شيء معلَّم اليوم.",
    flaggedIntro: "سُجّلت هذه ثم عُلّمت بالنسبة لبروتوكولك. ليست أخطاء.",
    flaggedLoading: "جارٍ تحميل الإدخالات المعلَّمة",
    flaggedFailed: "تعذر تحميل الإدخالات المعلَّمة.",
    retry: "حاول مرة أخرى",
  },
};

export type HealthTrackersLabels = Partial<(typeof HEALTH_STRINGS)["en"]>;

/** The strings for a locale, with any label overrides applied. */
export function healthStrings(locale: string, labels?: HealthTrackersLabels) {
  return { ...HEALTH_STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
}

/** Fills `{name}` style placeholders. */
export const healthFill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** What an async action may resolve with. `error` shows the message and leaves the state as it was. */
export type HealthTrackerResult = void | { error?: string };

export interface QuickLogItem {
  id: string;
  /** Shown when the app is in English (or as the only name). */
  name: string;
  /** Shown when the app is in Arabic. */
  nameAr?: string;
  /** A lucide-vue-next icon component. */
  icon?: Component;
}

export type QuickLogResult = void | {
  /** The entry was recorded but flagged against the protocol. A warning, not a failure. */
  flagged?: boolean;
  /** The server's own sentence, shown as it came. */
  message?: string;
  /** Refused. Shown as a failure. */
  error?: string;
  /** With `error`: offer "Log anyway", which calls `onLog` again with `override`. */
  canOverride?: boolean;
};

export interface FoodCatalogueItem {
  id: string;
  kind: FoodKind;
  name: string;
  nameAr?: string;
  verdict: FoodVerdict;
  /** Who decided it. Shown beside any verdict except unreviewed. */
  verdictSource?: FoodVerdictSource;
  /** Ids of the trigger families this item belongs to. */
  triggerFamilies?: readonly string[];
  /** Free text, shown as written. */
  note?: string;
  pinned?: boolean;
  /** Private items belong to one person; public ones come from the shared catalogue. */
  isPublic?: boolean;
}

export interface FoodFamily {
  id: string;
  name: string;
  nameAr?: string;
}

export interface FlaggedEntry {
  id: string;
  /** When it was logged. */
  at: string | number | Date;
  /** What was logged. */
  label: string;
  /** Why it was flagged, in the server's own words. */
  reason: string;
  /** The engine or area it was flagged against, for example "Caffeine". */
  area?: string;
}
