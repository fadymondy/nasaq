import { inject, type InjectionKey, type Ref } from "vue";
import type { RepeaterLabels } from "../repeater";
import type { SchemaMessages } from "./schema";

export const STRINGS = {
  en: {
    select: "Select…",
    issues: (n: string) => (n === "1" ? "1 issue" : `${n} issues`),
    itemsLabel: "Rows",
  },
  ar: {
    select: "اختر…",
    issues: (n: string) => (n === "1" ? "مشكلة واحدة" : `${n} مشكلات`),
    itemsLabel: "الصفوف",
  },
};
export const schemaStrings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export interface SchemaContext {
  messages: Ref<SchemaMessages>;
  locale: Ref<string>;
  showErrors: Ref<boolean>;
  touched: Ref<ReadonlySet<string>>;
  touch: (id: string) => void;
  repeaterProps: Ref<{ reorderable?: boolean; duplicable?: boolean; collapsible?: boolean; disabled?: boolean; labels?: RepeaterLabels }>;
}
export const SCHEMA: InjectionKey<SchemaContext> = Symbol("nq-schema-repeater");
export function useSchema(): SchemaContext {
  const ctx = inject(SCHEMA, null);
  if (!ctx) throw new Error("Schema rows must render inside <NqSchemaRepeater>.");
  return ctx;
}

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateOf = (iso: unknown): Date | null => {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
