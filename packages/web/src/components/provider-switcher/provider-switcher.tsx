"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Status } from "../status";

const STRINGS = {
  en: {
    capability: "Capability",
    backend: "Backend",
    isDefault: "Default",
    overridden: "Overridden",
    empty: "No swappable capabilities.",
    choose: (capability: string) => `Backend for ${capability}`,
  },
  ar: {
    capability: "القدرة",
    backend: "المزوّد",
    isDefault: "افتراضي",
    overridden: "مُعدَّل",
    empty: "لا توجد قدرات قابلة للتبديل.",
    choose: (capability: string) => `مزوّد ${capability}`,
  },
};

export type ProviderSwitcherLabels = (typeof STRINGS)["en"];

export interface ProviderOption {
  /** The backend id sent to `onSelect`: "postgres", "redis", "s3". */
  id: string;
  /** Shown in the menu. Default the id. */
  label?: ReactNode;
  /** One line under the label in the menu. */
  description?: ReactNode;
  disabled?: boolean;
}

export interface ProviderCapability {
  /** The capability key: "data", "queue", "cache", "storage", "realtime". */
  capability: string;
  /** Human name. Default the key. */
  label?: ReactNode;
  /** What the capability does, under the name. */
  description?: ReactNode;
  /** The backend in use. */
  active: string;
  options: readonly (string | ProviderOption)[];
  /** True while `active` is the app's configured default, false once someone switched it. */
  isDefault?: boolean;
  /** Lock the row: the backend is pinned by config. */
  locked?: boolean;
}

export interface ProviderSwitcherProps extends Omit<ComponentProps<"div">, "onSelect"> {
  capabilities: readonly ProviderCapability[];
  /** Switch a capability to another backend. Return a promise to show the row as busy until it settles. */
  onSelect?: (capability: string, backend: string) => void | Promise<void>;
  labels?: Partial<ProviderSwitcherLabels>;
}

const toOption = (o: string | ProviderOption): ProviderOption => (typeof o === "string" ? { id: o } : o);

/**
 * Lists an app's swappable capabilities (data, queue, cache, storage…) with the backend each one runs on,
 * and lets an operator switch backends at runtime. Rows that run on their configured default say so;
 * switched rows are marked as overridden.
 */
export function ProviderSwitcher({ capabilities, onSelect, labels, className, ...props }: ProviderSwitcherProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [busy, setBusy] = useState<string | null>(null);

  const change = async (capability: string, backend: string) => {
    if (!onSelect) return;
    setBusy(capability);
    try {
      await onSelect(capability, backend);
    } finally {
      setBusy(null);
    }
  };

  if (capabilities.length === 0) {
    return (
      <div data-slot="provider-switcher" className={cn("rounded-card border border-border p-6 text-center text-body-sm text-muted-foreground", className)} {...props}>
        {t.empty}
      </div>
    );
  }

  return (
    <div data-slot="provider-switcher" className={cn("overflow-hidden rounded-card border border-border bg-card", className)} {...props}>
      <div
        aria-hidden
        className="hidden grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] gap-4 border-b border-border px-4 py-2 text-caption text-muted-foreground sm:grid"
      >
        <span>{t.capability}</span>
        <span>{t.backend}</span>
      </div>
      <ul className="divide-y divide-border">
        {capabilities.map((row) => {
          const options = row.options.map(toOption);
          const name = typeof row.label === "string" ? row.label : row.capability;
          const items = options.map((o) => ({ value: o.id, label: typeof o.label === "string" ? o.label : o.id }));
          return (
            <li
              key={row.capability}
              data-slot="provider-switcher-row"
              data-capability={row.capability}
              aria-busy={busy === row.capability || undefined}
              className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label text-foreground">{row.label ?? row.capability}</span>
                  {row.isDefault !== undefined &&
                    (row.isDefault ? <Status tone="neutral">{t.isDefault}</Status> : <Status tone="info">{t.overridden}</Status>)}
                </div>
                {row.description && <p className="text-caption text-muted-foreground">{row.description}</p>}
              </div>
              <Select
                items={items}
                value={row.active}
                disabled={!onSelect || row.locked || busy === row.capability}
                onValueChange={(v) => v && String(v) !== row.active && void change(row.capability, String(v))}
              >
                <SelectTrigger data-slot="provider-switcher-select" aria-label={t.choose(name)} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id} disabled={o.disabled}>
                      <span className="flex flex-col">
                        <span>{o.label ?? o.id}</span>
                        {o.description && <span className="text-caption text-muted-foreground">{o.description}</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
