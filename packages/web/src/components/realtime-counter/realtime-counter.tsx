"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { MiniBar } from "../chart";
import { DateTime, Num } from "../numeric";

const STRINGS = {
  en: {
    title: "Right now",
    description: "People active in the last 30 minutes",
    live: "Live",
    paused: "Paused",
    perMinute: "Users per minute, last 30 minutes",
    updated: "Updated",
    empty: "Nobody is active right now",
    users: (n: number) => (n === 1 ? "1 active user" : `${n} active users`),
  },
  ar: {
    title: "الآن",
    description: "الأشخاص النشطون في آخر 30 دقيقة",
    live: "مباشر",
    paused: "متوقف مؤقتًا",
    perMinute: "المستخدمون في الدقيقة، آخر 30 دقيقة",
    updated: "آخر تحديث",
    empty: "لا أحد نشط الآن",
    users: (n: number) => (n === 1 ? "مستخدم نشط واحد" : `${n} مستخدمين نشطين`),
  },
};

export type RealtimeCounterLabels = typeof STRINGS.en;

export interface RealtimeSection {
  id: string;
  /** "Top pages", "Top sources". Localise it. */
  title: string;
  rows: readonly { id: string; label: ReactNode; value: number }[];
  /** Labels are paths or URLs: keep them left-to-right inside RTL. */
  ltr?: boolean;
}

export interface RealtimeCounterProps {
  /** People active right now. */
  value: number;
  /** Active users for each of the last minutes, oldest first (30 values for a 30 minute window). */
  perMinute?: readonly number[];
  /** Lists under the counter, for example top pages and top sources. */
  sections?: readonly RealtimeSection[];
  /** When the figure was last refreshed. Shown as relative time. */
  updatedAt?: number | Date | string;
  /** Feed is running. False shows "Paused" and stops the pulse. Default true. */
  live?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<RealtimeCounterLabels>;
}

/**
 * The "right now" tile of an analytics page: a large live figure with a pulsing indicator, a per-minute bar strip,
 * and short top lists. The indicator is a dot plus the word Live, so it does not depend on colour, and the pulse stops
 * under reduced motion.
 */
export function RealtimeCounter({ value, perMinute, sections, updatedAt, live = true, title, description, className, labels }: RealtimeCounterProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  return (
    <Card data-slot="realtime-counter" data-live={live} className={className}>
      <CardHeader>
        <CardTitle as="h3">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="relative flex size-2.5">
              {live ? <span className="absolute inline-flex size-full rounded-full bg-nq-success opacity-60 motion-safe:animate-ping" /> : null}
              <span className={cn("relative inline-flex size-2.5 rounded-full", live ? "bg-nq-success" : "bg-muted-foreground")} />
            </span>
            {title ?? t.title}
            <span className="text-caption font-normal text-muted-foreground">{live ? t.live : t.paused}</span>
          </span>
        </CardTitle>
        <CardDescription>{description ?? t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div role="status" aria-label={t.users(value)} className="text-display text-foreground tabular-nums" data-slot="realtime-value">
            <Num value={value} />
          </div>
          {perMinute?.length ? <MiniBar data={perMinute} highlight={perMinute.length - 1} label={t.perMinute} className="h-12 w-40" /> : null}
        </div>
        {updatedAt !== undefined ? (
          <p className="text-caption text-muted-foreground">
            {t.updated} <DateTime value={updatedAt} relative />
          </p>
        ) : null}
        {value === 0 && !sections?.some((s) => s.rows.length) ? <p className="text-body-sm text-muted-foreground">{t.empty}</p> : null}
        {sections?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map((s) => (
              <section key={s.id} aria-label={s.title} className="flex flex-col gap-2">
                <h4 className="text-label text-muted-foreground">{s.title}</h4>
                <ul className="flex flex-col gap-1.5">
                  {s.rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-body-sm">
                      {s.ltr ? (
                        <bdi dir="ltr" className="min-w-0 truncate text-foreground">
                          {r.label}
                        </bdi>
                      ) : (
                        <span className="min-w-0 truncate text-foreground" dir="auto">
                          {r.label}
                        </span>
                      )}
                      <Num value={r.value} className="text-muted-foreground" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
