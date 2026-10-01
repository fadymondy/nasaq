import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the Nasaq theme names so `h-control` and `h-8` conflict correctly.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["control", "control-sm", "row", "nav-row", "page", "rail"],
      radius: ["surface", "card", "control", "floating"],
      text: ["display", "h1", "h2", "h3", "body", "body-sm", "label", "caption", "eyebrow", "code"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
