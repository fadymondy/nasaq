"use client";

import { Activity, CircleDot, Clock, Code2, FileText, MessageSquare, RefreshCw, UserPlus, X } from "lucide-react";
import { type ReactNode, useId, useMemo, useState } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { formatDate, formatNumber, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Timeline, TimelineItem } from "../timeline";
import { dayKey, filterFeed, groupByDay } from "./project-logic";
import type { ProjectActivityItem } from "./project-overview";
import type { ExtraText } from "./project-strings";

export const FEED_KINDS = ["issue", "comment", "status", "member", "file", "code", "time", "other"] as const;

const KIND_ICON: Record<(typeof FEED_KINDS)[number], ReactNode> = {
  issue: <CircleDot />,
  comment: <MessageSquare />,
  status: <RefreshCw />,
  member: <UserPlus />,
  file: <FileText />,
  code: <Code2 />,
  time: <Clock />,
  other: <Activity />,
};

export interface ProjectFeedProps {
  items: readonly ProjectActivityItem[];
  /** "Today" as a civil date, so the day headings read Today and Yesterday. */
  today: string;
  t: ExtraText;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span id={id} className="shrink-0 text-body-sm text-muted-foreground">
        {label}
      </span>
      <Select items={options} value={value} onValueChange={(v) => v != null && onChange(String(v))}>
        <SelectTrigger aria-labelledby={id} className="min-w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The whole project activity: filter by type and person, grouped by day, newest first. */
export function ProjectFeed({ items, today, t }: ProjectFeedProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [kind, setKind] = useState("all");
  const [actor, setActor] = useState("all");

  const people = useMemo(() => [...new Set(items.map((i) => i.actor?.name).filter((n): n is string => Boolean(n)))].sort((a, b) => a.localeCompare(b)), [items]);
  const kinds = useMemo(() => FEED_KINDS.filter((k) => items.some((i) => (i.kind ?? "other") === k)), [items]);
  const shown = useMemo(() => filterFeed(items, { kind, actor }), [items, kind, actor]);
  const groups = useMemo(() => groupByDay(shown), [shown]);
  const filtered = kind !== "all" || actor !== "all";

  const yesterday = useMemo(() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - 1);
    return dayKey(d);
  }, [today]);
  const heading = (day: string) => (day === today ? t.feedToday : day === yesterday ? t.feedYesterday : formatDate(new Date(`${day}T00:00:00`), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

  return (
    <div data-slot="project-feed" className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 text-h3">{t.feedTitle}</h2>
          <p role="status" className="m-0 text-body-sm text-muted-foreground">
            {t.feedCount(formatNumber(shown.length, locale))}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Filter label={t.feedKind} value={kind} onChange={setKind} options={[{ value: "all", label: t.feedAll }, ...kinds.map((k) => ({ value: k, label: t.feedKinds[k] }))]} />
          <Filter label={t.feedPerson} value={actor} onChange={setActor} options={[{ value: "all", label: t.feedAllPeople }, ...people.map((p) => ({ value: p, label: p }))]} />
          {filtered ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setKind("all");
                setActor("all");
              }}
            >
              <X aria-hidden />
              {t.feedClear}
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Activity} title={t.feedEmpty} description={t.feedEmptyHint} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Activity} title={t.feedNoMatch} description={t.feedNoMatchHint} />
      ) : (
        <div className="flex min-w-0 flex-col gap-5">
          {groups.map((g) => (
            <section key={g.day} aria-label={heading(g.day)} className="flex min-w-0 flex-col gap-2">
              <h3 className="m-0 flex items-center gap-2 text-label text-muted-foreground">
                {heading(g.day)}
                <span className="font-normal">
                  <Num value={g.items.length} />
                </span>
              </h3>
              <Timeline aria-label={heading(g.day)}>
                {g.items.map((a) => (
                  <TimelineItem key={a.id} icon={a.actor ? undefined : KIND_ICON[a.kind ?? "other"]} actor={a.actor} title={a.title} description={a.description} time={a.at} />
                ))}
              </Timeline>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
