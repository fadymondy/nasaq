"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ThemePreference } from "@nasaq/tokens";
import { Languages, Monitor, Moon, Sun } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Tooltip } from "../tooltip";

export interface ThemeLabels {
  light: string;
  dark: string;
  system: string;
  group: string;
}
const EN_THEME: ThemeLabels = { light: "Light", dark: "Dark", system: "System", group: "Theme" };
const AR_THEME: ThemeLabels = { light: "فاتح", dark: "داكن", system: "النظام", group: "المظهر" };

export const THEME_OPTIONS = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
] as const satisfies readonly { value: ThemePreference; icon: unknown }[];

/** Built-in labels follow the provider locale; pass `labels` to override. */
export function useThemeLabels(labels?: Partial<ThemeLabels>): ThemeLabels {
  const { locale } = useNasaq();
  return { ...(locale.startsWith("ar") ? AR_THEME : EN_THEME), ...labels };
}

export interface ThemeSwitcherProps extends Omit<ComponentProps<typeof ToggleGroup>, "value" | "onValueChange"> {
  labels?: Partial<ThemeLabels>;
}

/** Segmented Light / Dark / System control (Linear, Raycast). Arrow keys move between options. */
export function ThemeSwitcher({ labels, className, ...props }: ThemeSwitcherProps) {
  const { theme, setTheme } = useNasaq();
  const t = useThemeLabels(labels);
  return (
    <ToggleGroup
      data-slot="theme-switcher"
      aria-label={t.group}
      value={[theme]}
      onValueChange={(next) => {
        const value = next[0] as ThemePreference | undefined;
        if (value) setTheme(value);
      }}
      className={cn("inline-flex h-control-sm items-center gap-px rounded-control border border-border bg-card p-0.5", className as string)}
      {...props}
    >
      {THEME_OPTIONS.map(({ value, icon: Glyph }) => (
        <Tooltip key={value} content={t[value]}>
          <Toggle
            value={value}
            aria-label={t[value]}
            className={cn(
              "inline-flex h-full aspect-square items-center justify-center rounded-[4px] text-muted-foreground outline-none",
              "transition-colors duration-150 ease-nq hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-nq-focus data-pressed:bg-nq-selected data-pressed:text-foreground",
              "[&_svg]:size-3.5",
            )}
          >
            <Glyph />
          </Toggle>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}

/** Theme radio items for use inside a DropdownMenu (e.g. the user menu). */
export function ThemeMenuItems({ labels }: { labels?: Partial<ThemeLabels> }) {
  const { theme, setTheme } = useNasaq();
  const t = useThemeLabels(labels);
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
      {THEME_OPTIONS.map(({ value, icon: Glyph }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Glyph />
          {t[value]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

/** Locale radio items for use inside a DropdownMenu. Each language is shown in its own script. */
export function LocaleMenuItems() {
  const { locale, setLocale, locales } = useNasaq();
  return (
    <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(String(v))}>
      {locales.map((option) => (
        <DropdownMenuRadioItem key={option.value} value={option.value}>
          <span lang={option.value} dir={option.dir}>
            {option.label}
          </span>
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

export interface LocaleSwitcherProps {
  /** Show the current language name beside the icon. */
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/** Language dropdown. Switching to Arabic flips the whole shell to RTL through NasaqProvider. */
export function LocaleSwitcher({ showLabel = false, label, className }: LocaleSwitcherProps) {
  const { locale, locales, setLocale } = useNasaq();
  const current = locales.find((l) => l.value === locale);
  const title = label ?? (locale.startsWith("ar") ? "اللغة" : "Language");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size={showLabel ? "sm" : "icon-sm"}
            aria-label={showLabel ? undefined : `${title}: ${current?.label ?? locale}`}
            className={cn("text-muted-foreground", className)}
          />
        }
      >
        <Languages />
        {showLabel ? <span lang={current?.value}>{current?.label ?? locale}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{title}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => setLocale(String(v))}>
          {locales.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <span lang={option.value} dir={option.dir}>
                {option.label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
