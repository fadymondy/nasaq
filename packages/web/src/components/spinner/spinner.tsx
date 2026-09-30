import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface SpinnerProps extends ComponentProps<typeof LoaderCircle> {
  /** When set, the spinner is announced (`role="status"`) with this text. Omit for a decorative spinner. */
  label?: string;
}

/** Rotation is the one allowed non-colour motion: it signals work, and stops under reduced motion. */
export function Spinner({ className, label, ...props }: SpinnerProps) {
  const icon = (
    <LoaderCircle
      data-slot="spinner"
      aria-hidden="true"
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      {...props}
    />
  );
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
