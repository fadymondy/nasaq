"use client";

import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

type FlagSet = Record<string, string>;

// All flags are one lazy chunk (~145 KB gzipped), fetched the first time any flag renders and shared after that.
let flags: FlagSet | null = null;
let loading: Promise<FlagSet> | null = null;
const loadFlags = () =>
  (loading ??= import("country-flag-icons/string/3x2").then((m) => {
    flags = m as unknown as FlagSet;
    return flags;
  }));

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code: "SA", "eg". */
  code: string;
  /** Accessible name, e.g. the country name. Without it the flag is decorative and hidden from screen readers. */
  label?: string;
  className?: string;
}

/**
 * A country's flag as an SVG, 3:2, sized by the font (`1em` tall) so it sits in a line of text.
 * Every platform draws it the same way; flag emoji do not render on Windows. Unknown codes show an empty frame.
 */
export function CountryFlag({ code, label, className }: CountryFlagProps) {
  const [set, setSet] = useState(flags);
  useEffect(() => {
    if (!set) void loadFlags().then(setSet);
  }, [set]);
  const svg = set?.[code.toUpperCase()];
  return (
    <span
      data-slot="country-flag"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        // An inset hairline drawn over the SVG keeps white and pale flags visible on a white surface.
        "relative inline-block aspect-[3/2] h-[1em] shrink-0 overflow-hidden rounded-[2px] bg-muted align-[-0.125em] [&>svg]:block [&>svg]:size-full",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/15 after:ring-inset",
        className,
      )}
      // The SVG markup comes from the country-flag-icons package, not from user input.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
