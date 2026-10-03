import type { Component, VNodeChild } from "vue";
import type { BadgeVariants } from "../badge";

export const INFOLIST_STRINGS = {
  en: { empty: "Not set", yes: "Yes", no: "No", copy: "Copy" },
  ar: { empty: "غير محدد", yes: "نعم", no: "لا", copy: "نسخ" },
};
export type InfolistLabels = Partial<(typeof INFOLIST_STRINGS)["en"]>;

/** One choice of an enum value: how it reads and which badge colour it gets. */
export interface InfolistEnumOption {
  label: string;
  labelAr?: string;
  variant?: NonNullable<BadgeVariants["variant"]>;
  icon?: Component;
}

export type InfolistItemType = "text" | "number" | "date" | "datetime" | "boolean" | "enum" | "email" | "url" | "tel" | "code" | "list";

export interface InfolistItem {
  id: string;
  label: string;
  labelAr?: string;
  /** The value. Its shape follows `type`: booleans are `boolean`, dates are ISO strings or `Date`, lists are arrays. */
  value?: unknown;
  /** Default `text`. */
  type?: InfolistItemType;
  /** For `enum`: choices keyed by the stored value. */
  options?: Record<string, InfolistEnumOption>;
  /** Adds a copy button. Codes, emails and ids are usually copyable. */
  copyable?: boolean;
  /** Unit shown after a number ("kg", "SAR"). */
  unit?: string;
  /** Spans the whole row: for long text. */
  wide?: boolean;
  /** Replaces the rendering of the value. */
  render?: (value: unknown) => VNodeChild;
  hint?: string;
  hintAr?: string;
}

export interface InfolistSection {
  id: string;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  items: readonly InfolistItem[];
}

export const isBlank = (value: unknown) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

export function copyText(item: InfolistItem): string | null {
  if (!item.copyable || isBlank(item.value)) return null;
  return Array.isArray(item.value) ? item.value.join(", ") : String(item.value);
}
