// The look of the handwritten effects (copied from text-effects.tsx of packages/web).

/** Handwriting stack from the system: no font file is bundled. Set `--nq-font-handwriting` to use a font you are licensed to serve. */
export const HANDWRITING = 'var(--nq-font-handwriting, "Bradley Hand", "Segoe Print", "Segoe Script", "Comic Sans MS", "Noto Naskh Arabic", cursive)';

export type HandwrittenTone = "note" | "info" | "success" | "brand" | "neutral";

export const noteTone: Record<HandwrittenTone, string> = {
  note: "bg-nq-warning-soft border-nq-warning/40",
  info: "bg-nq-info-soft border-nq-info/40",
  success: "bg-nq-success-soft border-nq-success/40",
  brand: "bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface))] border-nq-brand/40",
  neutral: "bg-nq-surface-soft border-nq-line-strong",
};

export type HandwrittenMarkKind = "underline" | "circle" | "highlight" | "strike";
export type HandwrittenMarkTone = "brand" | "danger" | "warning" | "success" | "info";

export const markTone: Record<HandwrittenMarkTone, string> = {
  brand: "text-nq-brand",
  danger: "text-nq-danger",
  warning: "text-nq-warning",
  success: "text-nq-success",
  info: "text-nq-info",
};

export const MARKS: Record<HandwrittenMarkKind, { d: string; viewBox: string; box: string; width: string; opacity?: number }> = {
  underline: { d: "M2 12 C 18 6, 34 16, 52 9 S 84 8, 98 11", viewBox: "0 0 100 20", box: "inset-x-[-2%] -bottom-[0.3em] h-[0.5em]", width: "0.09em" },
  circle: { d: "M50 4 C 82 2, 98 12, 96 22 C 94 34, 60 39, 40 38 C 12 36, 2 27, 5 16 C 9 6, 34 3, 62 4", viewBox: "0 0 100 42", box: "-inset-x-[0.5em] -inset-y-[0.35em]", width: "0.07em" },
  highlight: { d: "M2 20 C 30 17, 60 22, 98 17", viewBox: "0 0 100 40", box: "inset-x-[-3%] inset-y-[0.05em]", width: "0.95em", opacity: 0.28 },
  strike: { d: "M2 22 C 30 16, 60 26, 98 18", viewBox: "0 0 100 40", box: "inset-x-[-2%] inset-y-0", width: "0.08em" },
};
