import type { InjectionKey } from "vue";

export type Orientation = "horizontal" | "vertical";

export const RESIZABLE_ORIENTATION: InjectionKey<Orientation> = Symbol("nq-resizable-orientation");

export interface ParsedSize {
  value: number;
  unit: "%" | "px";
}

/** Sizes are numbers (pixels) or strings with a unit ("30%", "20rem", "240px"), as in React. */
export function parseSize(size: number | string | undefined): ParsedSize | undefined {
  if (size === undefined || size === "") return undefined;
  if (typeof size === "number") return { value: size, unit: "px" };
  const m = /^\s*(-?\d*\.?\d+)\s*(%|px|rem|em)?\s*$/.exec(size);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2] ?? "px";
  if (unit === "%") return { value: n, unit: "%" };
  return { value: unit === "px" ? n : n * 16, unit: "px" };
}
