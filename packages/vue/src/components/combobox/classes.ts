export const boxClass = [
  "flex min-h-control min-w-0 w-full items-center gap-1 rounded-control border border-input bg-card text-body text-foreground",
  "transition-colors duration-150 ease-nq",
  "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
  "has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger",
  "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
];

export const inputClass =
  "h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]";

export const iconButtonClass =
  "flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4";
