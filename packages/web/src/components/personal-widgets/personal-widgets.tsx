"use client";

import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Globe, Mail, Snowflake, Sun, Wind } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Icon } from "../icon";
import { formatDate, formatNumber, Num } from "../numeric";
import { GitHubLogo } from "../oauth-buttons";
import { isWorkingNow, offsetHours, type ProfileAvailability, type ProfileWorkingHours, groupSkills, isKnownTimeZone } from "./personal-model";

const STRINGS = {
  en: {
    availability: { open: "Available for work", limited: "Limited availability", closed: "Not taking new work" },
    localTime: "Local time",
    inTimezone: "in {city}",
    working: "Working hours",
    offHours: "Outside working hours",
    sameTime: "Same time as you",
    ahead: "{n}h ahead of you",
    behind: "{n}h behind you",
    now: "Now",
    updated: "Updated {date}",
    stats: "By the numbers",
    skills: "Skills",
    level: "Level {n} of 5",
    weather: "Weather",
    highLow: "High {high}, low {low}",
    condition: { clear: "Clear", "partly-cloudy": "Partly cloudy", cloudy: "Cloudy", rain: "Rain", storm: "Thunderstorm", snow: "Snow", fog: "Fog", wind: "Windy" },
    social: "Find me elsewhere",
    email: "Email",
    website: "Website",
  },
  ar: {
    availability: { open: "متاح للعمل", limited: "توفّر محدود", closed: "لا أستقبل أعمالًا جديدة" },
    localTime: "الوقت المحلي",
    inTimezone: "في {city}",
    working: "ضمن ساعات العمل",
    offHours: "خارج ساعات العمل",
    sameTime: "نفس توقيتك",
    ahead: "يسبقك بـ {n} س",
    behind: "يتأخر عنك بـ {n} س",
    now: "الآن",
    updated: "حُدّث {date}",
    stats: "بالأرقام",
    skills: "المهارات",
    level: "المستوى {n} من 5",
    weather: "الطقس",
    highLow: "العظمى {high}، الصغرى {low}",
    condition: { clear: "صافٍ", "partly-cloudy": "غائم جزئيًا", cloudy: "غائم", rain: "مطر", storm: "عاصفة رعدية", snow: "ثلج", fog: "ضباب", wind: "رياح" },
    social: "تجدني أيضًا في",
    email: "البريد الإلكتروني",
    website: "الموقع",
  },
};

export type PersonalWidgetLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Strings and locale for the personal widgets. */
export function usePersonalStrings(labels?: Partial<PersonalWidgetLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const lang = locale.startsWith("ar") ? "ar" : "en";
  const base = STRINGS[lang];
  return { locale, lang, t: { ...base, ...labels, availability: { ...base.availability, ...labels?.availability }, condition: { ...base.condition, ...labels?.condition } } as PersonalWidgetLabels } as const;
}

/* ------------------------------------------------------------ availability */

const AVAILABILITY_VARIANT = { open: "success", limited: "warning", closed: "neutral" } as const;

export interface AvailabilityBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  status: ProfileAvailability;
  /** Extra text after the status: "from November". */
  note?: ReactNode;
  labels?: Partial<PersonalWidgetLabels>;
}

/** "Available for work" with a status dot. The text carries the meaning; the dot is decoration. */
export function AvailabilityBadge({ status, note, labels, className, ...props }: AvailabilityBadgeProps) {
  const { t } = usePersonalStrings(labels);
  return (
    <Badge data-slot="availability-badge" data-status={status} variant={AVAILABILITY_VARIANT[status]} className={cn("h-6 gap-1.5 px-2 text-body-sm", className)} {...props}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", status === "open" && "motion-safe:animate-pulse")} />
      {t.availability[status]}
      {note && <span className="font-normal opacity-80">{note}</span>}
    </Badge>
  );
}

/* ------------------------------------------------------------ local clock */

export interface LocalClockProps extends Omit<ComponentProps<typeof Card>, "title"> {
  /** IANA zone of the owner: "Asia/Riyadh". */
  timeZone: string;
  /** Place name shown under the time. */
  city?: ReactNode;
  /** The visitor's zone, to show the difference. Default the browser's. */
  viewerTimeZone?: string;
  workingHours?: ProfileWorkingHours;
  /** Freeze the clock at this instant (stories, tests). Default the real time, updated every 15 seconds. */
  now?: Date | number;
  labels?: Partial<PersonalWidgetLabels>;
}

/** The owner's local time, whether it is working time there, and the offset from the visitor's clock. */
export function LocalClock({ timeZone, city, viewerTimeZone, workingHours, now: nowProp, labels, className, ...props }: LocalClockProps) {
  const { t, locale } = usePersonalStrings(labels);
  const [now, setNow] = useState<number>(() => (nowProp ? new Date(nowProp).getTime() : Date.now()));
  const [viewer, setViewer] = useState(viewerTimeZone ?? "UTC");
  useEffect(() => {
    if (!viewerTimeZone) setViewer(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [viewerTimeZone]);
  useEffect(() => {
    if (nowProp) return setNow(new Date(nowProp).getTime());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [nowProp]);
  const zone = isKnownTimeZone(timeZone) ? timeZone : "UTC";
  const working = isWorkingNow(now, zone, workingHours);
  const diff = isKnownTimeZone(viewer) ? offsetHours(now, zone, viewer) : 0;
  const n = formatNumber(Math.abs(diff), locale);
  return (
    <Card data-slot="local-clock" className={cn("gap-2", className)} {...props}>
      <CardHeader>
        <CardTitle>{t.localTime}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="flex items-baseline gap-2">
          <time dateTime={new Date(now).toISOString()} suppressHydrationWarning className="text-h1 tabular-nums text-foreground" dir="ltr">
            {formatDate(now, locale, { timeZone: zone, hour: "numeric", minute: "2-digit" })}
          </time>
          {city && <span className="text-body-sm text-muted-foreground">{typeof city === "string" ? fill(t.inTimezone, { city }) : city}</span>}
        </p>
        <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <span aria-hidden="true" className={cn("size-2 rounded-full", working ? "bg-nq-success" : "bg-nq-line-strong")} />
          {working ? t.working : t.offHours}
        </p>
        <p className="text-caption text-muted-foreground">{diff === 0 ? t.sameTime : fill(diff > 0 ? t.ahead : t.behind, { n })}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ social links */

export interface SocialLink {
  /** Which network. GitHub shows its official mark; other brands show their name as text, never a stand-in icon. */
  kind: "github" | "linkedin" | "x" | "youtube" | "instagram" | "email" | "website" | "other";
  label: string;
  href: string;
  /** "@fadymondy": shown after the label, always left to right. */
  handle?: string;
}

export interface SocialLinksProps extends Omit<ComponentProps<"ul">, "children"> {
  links: SocialLink[];
  /** `chips` a wrapping row of small buttons, `list` one link per line with the handle. Default chips. */
  layout?: "chips" | "list";
}

/** Links to the owner's other places. External links open in a new tab; `mailto:` links do not. */
export function SocialLinks({ links, layout = "chips", className, ...props }: SocialLinksProps) {
  return (
    <ul data-slot="social-links" className={cn("flex list-none gap-2 p-0", layout === "chips" ? "flex-wrap" : "flex-col", className)} {...props}>
      {links.map((l) => {
        const external = /^https?:\/\//i.test(l.href);
        return (
          <li key={`${l.kind}-${l.href}`}>
            <a
              href={l.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={cn(
                "inline-flex items-center gap-2 rounded-control text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                layout === "chips" ? "h-control-sm border border-border bg-card px-2.5 hover:bg-nq-hover" : "py-1 hover:underline hover:decoration-nq-line-strong hover:underline-offset-4",
              )}
            >
              {l.kind === "github" && <GitHubLogo className="size-4" />}
              {l.kind === "email" && <Icon icon={Mail} className="size-4 text-muted-foreground" />}
              {l.kind === "website" && <Icon icon={Globe} className="size-4 text-muted-foreground" />}
              <span>{l.label}</span>
              {layout === "list" && l.handle && (
                <span dir="ltr" className="text-muted-foreground">
                  {l.handle}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------ now */

export interface NowItem {
  /** "Building", "Reading", "Learning". */
  label: string;
  text: ReactNode;
  href?: string;
}

export interface NowWidgetProps extends Omit<ComponentProps<typeof Card>, "title"> {
  items: NowItem[];
  /** When the list was last edited. */
  updated?: Date | number | string;
  title?: ReactNode;
  labels?: Partial<PersonalWidgetLabels>;
}

/** A "now" page in a card: what the owner is building, reading and learning at the moment. */
export function NowWidget({ items, updated, title, labels, className, ...props }: NowWidgetProps) {
  const { t, locale } = usePersonalStrings(labels);
  return (
    <Card data-slot="now-widget" className={cn("gap-3", className)} {...props}>
      <CardHeader>
        <CardTitle>{title ?? t.now}</CardTitle>
        {updated && <p className="text-caption text-muted-foreground">{fill(t.updated, { date: formatDate(updated, locale, { dateStyle: "medium" }) })}</p>}
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2.5">
          {items.map((i) => (
            <div key={i.label} className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">{i.label}</dt>
              <dd dir="auto" className="text-body-sm text-foreground">
                {i.href ? (
                  <a href={i.href} className="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current">
                    {i.text}
                  </a>
                ) : (
                  i.text
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ stats */

export interface ProfileStat {
  label: string;
  value: number;
  /** "+" after the number: "12+". */
  suffix?: string;
  /** `compact` shows 12K. Default plain. */
  compact?: boolean;
}

export interface StatsWidgetProps extends Omit<ComponentProps<typeof Card>, "title"> {
  stats: ProfileStat[];
  title?: ReactNode;
  labels?: Partial<PersonalWidgetLabels>;
}

/** Headline numbers: years of experience, projects shipped, articles written. */
export function StatsWidget({ stats, title, labels, className, ...props }: StatsWidgetProps) {
  const { t } = usePersonalStrings(labels);
  return (
    <Card data-slot="stats-widget" className={cn("gap-3", className)} {...props}>
      <CardHeader>
        <CardTitle>{title ?? t.stats}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dd className="order-first text-h1 text-foreground">
                <Num value={s.value} format={s.compact ? { notation: "compact" } : undefined} />
                {s.suffix}
              </dd>
              <dt className="text-caption text-muted-foreground">{s.label}</dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ skills */

export interface Skill {
  name: string;
  group?: string;
  /** 1 to 5. Shown as dots. */
  level?: number;
}

export interface SkillsWidgetProps extends Omit<ComponentProps<"div">, "title"> {
  skills: Skill[];
  /** Show the level dots. Default true. */
  levels?: boolean;
  labels?: Partial<PersonalWidgetLabels>;
}

/** Skills grouped by area, strongest first, with a five-dot level. The level is also in text for screen readers. */
export function SkillsWidget({ skills, levels = true, labels, className, ...props }: SkillsWidgetProps) {
  const { t, locale } = usePersonalStrings(labels);
  return (
    <div data-slot="skills-widget" className={cn("flex flex-col gap-5", className)} {...props}>
      {groupSkills(skills).map(({ group, skills: list }) => (
        <div key={group} className="flex flex-col gap-2">
          {group && <p className="eyebrow">{group}</p>}
          <ul className="flex flex-wrap gap-2">
            {list.map((s) => (
              <li key={s.name} className="inline-flex h-control-sm items-center gap-2 rounded-control border border-border bg-card px-2.5 text-body-sm text-foreground">
                <bdi>{s.name}</bdi>
                {levels && s.level ? (
                  <span role="img" aria-label={fill(t.level, { n: formatNumber(s.level, locale) })} className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={cn("size-1.5 rounded-full", i <= (s.level as number) ? "bg-primary" : "bg-nq-line")} />
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ weather */

export type WeatherCondition = "clear" | "partly-cloudy" | "cloudy" | "rain" | "storm" | "snow" | "fog" | "wind";

const WEATHER_ICON = { clear: Sun, "partly-cloudy": CloudSun, cloudy: Cloud, rain: CloudRain, storm: CloudLightning, snow: Snowflake, fog: CloudFog, wind: Wind } as const;

export interface WeatherWidgetProps extends Omit<ComponentProps<typeof Card>, "title"> {
  city: ReactNode;
  /** Current temperature in degrees Celsius. */
  temperature: number;
  condition: WeatherCondition;
  high?: number;
  low?: number;
  /** `f` converts the values to Fahrenheit for display. Default `c`. */
  unit?: "c" | "f";
  labels?: Partial<PersonalWidgetLabels>;
}

/** Presentational weather for the owner's city. Pass the values from your own weather source; nothing is fetched here. */
export function WeatherWidget({ city, temperature, condition, high, low, unit = "c", labels, className, ...props }: WeatherWidgetProps) {
  const { t, locale } = usePersonalStrings(labels);
  const show = (c: number) => formatNumber(Math.round(unit === "f" ? (c * 9) / 5 + 32 : c), locale, { style: "unit", unit: unit === "f" ? "fahrenheit" : "celsius" });
  return (
    <Card data-slot="weather-widget" data-condition={condition} className={cn("gap-2", className)} {...props}>
      <CardHeader>
        <CardTitle>{t.weather}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Icon icon={WEATHER_ICON[condition]} className="size-9 shrink-0 text-nq-accent-text" />
        <div className="flex min-w-0 flex-col">
          <p className="text-h1 text-foreground" dir="ltr">
            {show(temperature)}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {t.condition[condition]}, <bdi>{city}</bdi>
          </p>
          {high !== undefined && low !== undefined && <p className="text-caption text-muted-foreground">{fill(t.highLow, { high: show(high), low: show(low) })}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
