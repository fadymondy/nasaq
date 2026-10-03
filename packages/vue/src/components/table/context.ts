import type { InjectionKey } from "vue";

export type TableDensity = "compact" | "default" | "comfortable";
export interface TableStyle {
  density: TableDensity;
  hover: boolean;
  striped: boolean;
}

export const TABLE_STYLE: InjectionKey<() => TableStyle> = Symbol("nq-table");

export const PAD: Record<TableDensity, string> = {
  compact: "px-2 py-1",
  default: "px-4 py-3",
  comfortable: "px-5 py-4",
};
