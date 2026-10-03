// Same classes as the React Input and Textarea (packages/web/src/components/field/field.tsx).
export const controlClass = [
  "w-full min-w-0 rounded-control border border-input bg-card px-3 text-body text-foreground",
  "min-h-[var(--nq-touch-min,0px)] transition-colors duration-150 ease-nq outline-none",
  "placeholder:text-muted-foreground",
  "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus",
  "data-invalid:border-nq-danger aria-invalid:border-nq-danger",
  "disabled:cursor-not-allowed disabled:opacity-50",
  // 16px on coarse pointers so iOS does not zoom on focus.
  "pointer-coarse:text-[16px]",
];
