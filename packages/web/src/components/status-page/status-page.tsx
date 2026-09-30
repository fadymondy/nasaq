"use client";

import { CircleAlert, CircleCheck, CircleX, Wrench } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { DateTime } from "../numeric";
import { Timeline, TimelineItem } from "../timeline";
import {
  type CheckResult,
  type Incident,
  IncidentList,
  type MonitorStatus,
  overallStatus,
  type OverallStatus,
  UptimeBadge,
  UptimeBar,
} from "../uptime-monitors";

const STRINGS = {
  en: {
    overall: { operational: "All systems operational", degraded: "Degraded performance", "partial-outage": "Partial outage", "major-outage": "Major outage", maintenance: "Maintenance in progress" } satisfies Record<OverallStatus, string>,
    updated: "Updated",
    services: "Services",
    status: { up: "Operational", degraded: "Degraded", down: "Outage", paused: "Paused", unknown: "No data" } satisfies Record<MonitorStatus, string>,
    uptime90: (n: number) => `${n}-day uptime`,
    daysAgo: (n: number) => `${n} days ago`,
    today: "Today",
    active: "Active incidents",
    past: "Past incidents",
    noIncidents: "No incidents reported.",
    maintenance: "Scheduled maintenance",
    maintenanceEmpty: "No maintenance is scheduled.",
    from: "From",
    until: "Until",
    group: "Service group",
    footer: "Powered by Nasaq",
    history: (name: string) => `${name}, daily status`,
  },
  ar: {
    overall: { operational: "كل الأنظمة تعمل", degraded: "أداء متدهور", "partial-outage": "انقطاع جزئي", "major-outage": "انقطاع كبير", maintenance: "صيانة جارية" } satisfies Record<OverallStatus, string>,
    updated: "آخر تحديث",
    services: "الخدمات",
    status: { up: "تعمل", degraded: "متدهورة", down: "متوقفة", paused: "موقوفة", unknown: "لا بيانات" } satisfies Record<MonitorStatus, string>,
    uptime90: (n: number) => `وقت التشغيل خلال ${n} يومًا`,
    daysAgo: (n: number) => `قبل ${n} يومًا`,
    today: "اليوم",
    active: "حوادث جارية",
    past: "حوادث سابقة",
    noIncidents: "لا توجد حوادث مُبلَّغ عنها.",
    maintenance: "صيانة مجدولة",
    maintenanceEmpty: "لا توجد صيانة مجدولة.",
    from: "من",
    until: "إلى",
    group: "مجموعة خدمات",
    footer: "بدعم من نسق",
    history: (name: string) => `${name}، الحالة اليومية`,
  },
};
type T = typeof STRINGS.en;
export type StatusPageLabels = Partial<T>;

export interface StatusPageService {
  id: string;
  name: string;
  description?: string;
  status: MonitorStatus;
  /** Daily results, oldest first. Usually 90 days. */
  days?: readonly CheckResult[];
  /** Uptime over the shown days, in percent. */
  uptime?: number | null;
}

export interface StatusPageMaintenance {
  id: string;
  title: string;
  startsAt: Date | number | string;
  endsAt: Date | number | string;
  description?: string;
}

export interface StatusPageProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** Name of the product or company. */
  title: ReactNode;
  /** Logo or mark you supply. Nothing is drawn if left out. */
  logo?: ReactNode;
  services: readonly StatusPageService[];
  incidents?: readonly Incident[];
  maintenance?: readonly StatusPageMaintenance[];
  /** When the data was last refreshed. */
  updatedAt?: Date | number | string;
  /** Shown at the end of the page, for example a subscribe link. */
  footer?: ReactNode;
  labels?: StatusPageLabels;
}

const bannerTone: Record<OverallStatus, { cls: string; Icon: typeof CircleCheck }> = {
  operational: { cls: "border-nq-success/30 bg-nq-success/10 [&_svg]:text-nq-success", Icon: CircleCheck },
  degraded: { cls: "border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning", Icon: CircleAlert },
  "partial-outage": { cls: "border-nq-warning/30 bg-nq-warning/10 [&_svg]:text-nq-warning", Icon: CircleAlert },
  "major-outage": { cls: "border-nq-danger/30 bg-nq-danger/10 [&_svg]:text-nq-danger", Icon: CircleX },
  maintenance: { cls: "border-nq-info/30 bg-nq-info/10 [&_svg]:text-nq-info", Icon: Wrench },
};
const statusVariant: Record<MonitorStatus, "success" | "warning" | "danger" | "neutral"> = { up: "success", degraded: "warning", down: "danger", paused: "neutral", unknown: "neutral" };

/**
 * The public status page: an overall banner, each service with its daily history bar and uptime, active and past
 * incidents with their updates, and scheduled maintenance. It has no admin controls and needs no sign-in.
 * It is a full page section, so place it in your own layout with a max width.
 */
export function StatusPage({ title, logo, services, incidents = [], maintenance = [], updatedAt, footer, labels, className, ...props }: StatusPageProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const now = Date.now();
  const running = maintenance.some((m) => new Date(m.startsAt).getTime() <= now && new Date(m.endsAt).getTime() >= now);
  const overall = overallStatus(services.map((s) => s.status), running);
  const { cls, Icon } = bannerTone[overall];
  const active = incidents.filter((i) => i.status !== "resolved");
  const past = incidents.filter((i) => i.status === "resolved");
  const upcoming = maintenance.filter((m) => new Date(m.endsAt).getTime() >= now);

  return (
    <div data-slot="status-page" data-overall={overall} className={cn("mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:py-12", className)} {...props}>
      <header className="flex items-center gap-3">
        {logo}
        <h1 className="text-h1 text-foreground" dir="auto">
          {title}
        </h1>
      </header>

      <div role="status" className={cn("flex items-center gap-3 rounded-card border p-4", cls)}>
        <Icon aria-hidden className="size-6 shrink-0" />
        <div className="grid min-w-0 gap-0.5">
          <p className="text-h4 text-foreground">{t.overall[overall]}</p>
          {updatedAt ? (
            <p className="text-body-sm text-muted-foreground">
              {t.updated} <DateTime value={updatedAt} relative />
            </p>
          ) : null}
        </div>
      </div>

      {active.length ? (
        <section aria-labelledby="sp-active" className="grid gap-3">
          <h2 id="sp-active" className="text-h3 text-foreground">
            {t.active}
          </h2>
          <IncidentList incidents={active} />
        </section>
      ) : null}

      <section aria-labelledby="sp-services" className="grid gap-3">
        <h2 id="sp-services" className="text-h3 text-foreground">
          {t.services}
        </h2>
        <ul className="divide-y divide-border rounded-card border border-border bg-card">
          {services.map((s) => (
            <li key={s.id} data-slot="status-page-service" className="grid gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid min-w-0">
                  <span className="text-label text-foreground" dir="auto">
                    {s.name}
                  </span>
                  {s.description ? (
                    <span className="text-body-sm text-muted-foreground" dir="auto">
                      {s.description}
                    </span>
                  ) : null}
                </div>
                <Badge variant={statusVariant[s.status]}>{t.status[s.status]}</Badge>
              </div>
              {s.days?.length ? (
                <>
                  <UptimeBar checks={s.days} label={t.history(s.name)} className="h-8" />
                  <div className="flex items-center justify-between text-caption text-muted-foreground">
                    <span>{t.daysAgo(s.days.length)}</span>
                    {s.uptime !== undefined ? <UptimeBadge percent={s.uptime} period={t.uptime90(s.days.length)} /> : null}
                    <span>{t.today}</span>
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sp-maint" className="grid gap-3">
        <h2 id="sp-maint" className="text-h3 text-foreground">
          {t.maintenance}
        </h2>
        {upcoming.length ? (
          <Timeline>
            {upcoming.map((m) => (
              <TimelineItem
                key={m.id}
                icon={<Wrench aria-hidden />}
                title={m.title}
                description={m.description}
                time={m.startsAt}
              >
                <p className="text-caption text-muted-foreground">
                  {t.from} <DateTime value={m.startsAt} format={{ dateStyle: "medium", timeStyle: "short" }} /> {t.until} <DateTime value={m.endsAt} format={{ dateStyle: "medium", timeStyle: "short" }} />
                </p>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.maintenanceEmpty}</p>
        )}
      </section>

      <section aria-labelledby="sp-past" className="grid gap-3">
        <h2 id="sp-past" className="text-h3 text-foreground">
          {t.past}
        </h2>
        {past.length ? <IncidentList incidents={past} /> : <p className="text-body-sm text-muted-foreground">{t.noIncidents}</p>}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-caption text-muted-foreground">
        {footer ?? <span />}
        <span>{t.footer}</span>
      </footer>
    </div>
  );
}
