"use client";

import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { type ComponentProps, useMemo } from "react";
import { cn } from "../../lib/cn";
import { type DayVerdict, type HistoryDay, groupByMonth, parseCivilDate } from "../engine-card/health-engines";
import { useHealthDate, useHealthLabels } from "../engine-card/health-format";

const STRINGS = {
  en: {
    dayLabel: (date: string, verdict: string, entries: string) => `${date}: ${verdict}, ${entries}`,
    entries: (n: number) => (n === 1 ? "1 entry" : `${n} entries`),
    stripLabel: "Day by day, oldest first",
    legend: "Legend",
  },
  ar: {
    dayLabel: (date: string, verdict: string, entries: string) => `${date}: ${verdict}، ${entries}`,
    entries: (n: number) => (n === 0 ? "لا إدخالات" : n === 1 ? "إدخال واحد" : n === 2 ? "إدخالان" : n <= 10 ? `${n} إدخالات` : `${n} إدخالًا`),
    stripLabel: "يومًا بيوم، من الأقدم",
    legend: "دليل الرموز",
  },
};

export type HistoryStripLabels = typeof STRINGS.en;

/**
 * Each verdict has its own shape and fill as well as its own hue: a solid square for on protocol, a striped
 * square for off protocol and a hollow dashed circle for a day the engine declined to judge.
 */
const CELL: Record<DayVerdict, string> = {
  on_protocol: "rounded-[3px] border border-nq-success bg-nq-success",
  off_protocol: "rounded-[3px] border border-nq-danger bg-[repeating-linear-gradient(45deg,var(--nq-danger)_0_2px,transparent_2px_5px)]",
  unevaluated: "rounded-full border border-dashed border-muted-foreground bg-transparent",
};

const GLYPH = { on_protocol: CircleCheck, off_protocol: CircleX, unevaluated: CircleDashed } as const;
const GLYPH_TONE = { on_protocol: "text-nq-success-text", off_protocol: "text-nq-danger-text", unevaluated: "text-muted-foreground" } as const;

export interface EngineHistoryStripProps extends Omit<ComponentProps<"div">, "children"> {
  /** One element per calendar day, oldest first. A window that skips quiet days would splice streaks together. */
  days: readonly HistoryDay[];
  labels?: Partial<HistoryStripLabels>;
}

/** The day strip: one cell per day, grouped by month. Every cell carries a full sentence for pointer and screen reader. */
export function EngineHistoryStrip({ days, labels, className, ...props }: EngineHistoryStripProps) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  const d = useHealthDate();
  const groups = useMemo(() => groupByMonth(days), [days]);
  return (
    <div data-slot="engine-history-strip" className={cn("flex flex-col gap-3", className)} {...props}>
      {groups.map((g) => (
        <section key={g.month} aria-label={d.date(parseCivilDate(`${g.month}-01`), { month: "long", year: "numeric" })} className="flex flex-col gap-1.5">
          <h4 className="text-caption text-muted-foreground">{d.date(parseCivilDate(`${g.month}-01`), { month: "long", year: "numeric" })}</h4>
          <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
            {g.days.map((day) => {
              const sentence = t.dayLabel(d.date(parseCivilDate(day.date), { dateStyle: "medium" }), t.verdicts[day.verdict] ?? day.verdict, t.entries(day.entries));
              return (
                <li key={day.date} data-date={day.date} data-verdict={day.verdict} title={sentence} className={cn("size-4 shrink-0", CELL[day.verdict])}>
                  <span className="sr-only">{sentence}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** The three verdicts with their shape and words. Put it under a strip or chart. */
export function EngineHistoryLegend({ className, labels, ...props }: Omit<ComponentProps<"ul">, "children"> & { labels?: Partial<HistoryStripLabels> }) {
  const t = useHealthLabels({ en: STRINGS.en, ar: STRINGS.ar }, labels);
  return (
    <ul data-slot="engine-history-legend" aria-label={t.legend} className={cn("m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground", className)} {...props}>
      {(["on_protocol", "off_protocol", "unevaluated"] as const).map((v) => {
        const Glyph = GLYPH[v];
        return (
          <li key={v} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-3", CELL[v])} />
            <Glyph aria-hidden className={cn("size-3.5", GLYPH_TONE[v])} />
            {t.verdicts[v]}
          </li>
        );
      })}
    </ul>
  );
}
