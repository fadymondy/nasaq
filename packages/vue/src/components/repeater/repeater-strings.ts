export const STRINGS = {
  en: {
    list: "Items",
    add: "Add item",
    empty: "No items yet.",
    row: (n: string) => `Item ${n}`,
    remove: (title: string) => `Remove ${title}`,
    duplicate: (title: string) => `Duplicate ${title}`,
    reorder: (title: string) => `Reorder ${title}`,
    reorderHint: "Focus the handle, then use the arrow keys to move the row. Home and End jump to the ends.",
    collapse: (title: string) => `Collapse ${title}`,
    expand: (title: string) => `Expand ${title}`,
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    count: (n: string) => `${n} items`,
    countMax: (n: string, max: string) => `${n} of ${max} items`,
    minReached: (min: string) => `At least ${min} required.`,
    maxReached: (max: string) => `Limit of ${max} reached.`,
    moved: (title: string, pos: string, total: string) => `${title} moved to position ${pos} of ${total}`,
    added: (title: string) => `${title} added`,
    removed: (title: string) => `${title} removed`,
    duplicated: (title: string) => `${title} duplicated`,
  },
  ar: {
    list: "العناصر",
    add: "إضافة عنصر",
    empty: "لا توجد عناصر بعد.",
    row: (n: string) => `العنصر ${n}`,
    remove: (title: string) => `حذف ${title}`,
    duplicate: (title: string) => `تكرار ${title}`,
    reorder: (title: string) => `إعادة ترتيب ${title}`,
    reorderHint: "ركّز على المقبض ثم استخدم مفاتيح الأسهم لنقل الصف. Home وEnd للانتقال إلى الطرفين.",
    collapse: (title: string) => `طيّ ${title}`,
    expand: (title: string) => `توسيع ${title}`,
    expandAll: "توسيع الكل",
    collapseAll: "طيّ الكل",
    count: (n: string) => `${n} عناصر`,
    countMax: (n: string, max: string) => `${n} من ${max} عناصر`,
    minReached: (min: string) => `مطلوب ${min} على الأقل.`,
    maxReached: (max: string) => `تم بلوغ الحد الأقصى ${max}.`,
    moved: (title: string, pos: string, total: string) => `نُقل ${title} إلى الموضع ${pos} من ${total}`,
    added: (title: string) => `أُضيف ${title}`,
    removed: (title: string) => `حُذف ${title}`,
    duplicated: (title: string) => `تم تكرار ${title}`,
  },
};

export const repeaterStrings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];
export type RepeaterLabels = Partial<typeof STRINGS.en>;

export interface RepeaterRowContext<T> {
  /** Zero-based position. */
  index: number;
  /** Stable key of the row: survives reorder, so use it for input ids and touched state. */
  id: string;
  count: number;
  disabled: boolean;
  /** Replace this row (or derive the new row from the current one). */
  update: (next: T | ((current: T) => T)) => void;
}

/** Props of NqRepeater. */
export interface RepeaterProps<T> {
  /** A new row for "Add". */
  createItem: () => T;
  /** Copy of a row for "Duplicate". Default: `structuredClone`. */
  cloneItem?: (item: T) => T;
  /** Heading of a row. Default "Item 1", "Item 2"… in the active language. */
  rowTitle?: (item: T, index: number) => string;
  /** Plain-text name of a row for button labels and announcements. Default: `rowTitle`. */
  rowLabel?: (item: T, index: number) => string;
  /** One-line summary shown after the title while the row is collapsed. */
  rowSummary?: (item: T, index: number) => string;
  min?: number;
  max?: number;
  reorderable?: boolean;
  duplicable?: boolean;
  collapsible?: boolean;
  /** Rows present at mount start collapsed. New rows always open. */
  defaultCollapsed?: boolean;
  disabled?: boolean;
  label?: string;
  /** Text shown when there are no rows. */
  empty?: string;
  labels?: RepeaterLabels;
  addLabel?: string;
  class?: string;
}
