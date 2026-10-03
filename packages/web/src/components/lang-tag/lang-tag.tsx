"use client";

import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge, type TagHue } from "../badge";

/** Fixed hues so a language reads the same everywhere. Anything else is gray. */
const LANG_HUES: Record<string, TagHue> = { ar: "amber", en: "blue", fr: "violet", es: "orange", de: "teal", tr: "red", ur: "green", fa: "pink" };

/** The language's name in the reader's language, e.g. "Arabic" / "العربية" for `ar`. Falls back to the code. */
export function languageName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export interface LangTagProps extends Omit<ComponentProps<"span">, "children" | "lang"> {
  /** A language code (`ar`, `en`, `en-GB`). Nothing renders when it is empty. */
  lang?: string | null;
  /** Override the hue from the built-in table. */
  hue?: TagHue;
  /** Show the full region code (`en-GB`) instead of the two-letter base. Default `false`. */
  region?: boolean;
}

/**
 * The language of a piece of content (not of the interface): a small code tag beside a title, a message or a
 * document. The code is a Latin token and stays left to right; its accessible name is the language's full name.
 */
export function LangTag({ lang, hue, region = false, className, ...props }: LangTagProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  if (!lang) return null;
  const base = lang.split(/[-_]/)[0]!.toLowerCase();
  const code = region ? lang.replace("_", "-") : base;
  const ar = locale.startsWith("ar");
  const name = languageName(region ? code : base, locale);
  return (
    <Badge
      data-slot="lang-tag"
      data-lang={base}
      variant="tag"
      hue={hue ?? LANG_HUES[base] ?? "gray"}
      dir="ltr"
      title={name}
      className={cn("font-mono uppercase tracking-wide", className)}
      {...props}
    >
      <span aria-hidden="true">{code}</span>
      <span className="sr-only">{ar ? `لغة المحتوى: ${name}` : `Content language: ${name}`}</span>
    </Badge>
  );
}
