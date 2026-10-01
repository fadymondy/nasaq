import type { ComputedRef, InjectionKey, Ref } from "vue";
import { normalizeForSearch } from "../commands";

/** Arabic-aware match: folds case, diacritics, tatweel and alef/yeh/teh-marbuta variants (see `normalizeForSearch`). */
export function comboboxFilter<Item>(item: Item, query: string, itemToString?: (item: Item) => string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const text = itemToString ? itemToString(item) : String((item as { label?: unknown } | null)?.label ?? item);
  return normalizeForSearch(text).includes(q);
}

/** What the Combobox parts share. */
export interface ComboboxContext {
  multiple: ComputedRef<boolean>;
  /** The chosen item (single), or the chosen items (multiple). */
  current: ComputedRef<unknown>;
  /** The root `items`, narrowed by the typed text. Empty until `items` is given. */
  items: ComputedRef<readonly unknown[]>;
  /** Narrows any list (a group's items) by the typed text with the root's filter. */
  filterList: (list: readonly unknown[]) => readonly unknown[];
  search: Ref<string>;
  isSelected: (item: unknown) => boolean;
  remove: (item: unknown) => void;
  clear: () => void;
  hasValue: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
  labelOf: (item: unknown) => string;
}

export const COMBOBOX_KEY: InjectionKey<ComboboxContext> = Symbol("nasaq-combobox");
