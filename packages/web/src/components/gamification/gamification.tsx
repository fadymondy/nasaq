"use client";

import { ArrowDown, ArrowUp, Award, Check, ChevronLeft, ChevronRight, Crown, Flame, Gift, Lock, Minus, Sparkles, Star, Trophy, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Icon } from "../icon";
import { type FormatNumberOptions, formatDate, formatNumber, Num } from "../numeric";
import { Progress } from "../progress";
import { EmptyState, Skeleton } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "../tabs";
import {
  type AchievementFilter,
  type AchievementLike,
  achievementCounts,
  achievementPercent,
  achievementStatus,
  filterAchievements,
  type LeaderboardEntryLike,
  levelProgress,
  type LevelCurve,
  monthGrid,
  movement,
  pinnedEntry,
  rankEntries,
  type Rarity,
  RARITIES,
  splitPodium,
  streakStats,
} from "./gamification-logic";

export {
  achievementCounts,
  achievementPercent,
  achievementStatus,
  dayKey,
  filterAchievements,
  levelProgress,
  monthGrid,
  movement,
  pinnedEntry,
  rankEntries,
  rarityRank,
  RARITIES,
  splitPodium,
  streakStats,
  toDayKey,
  xpForLevel,
  type AchievementFilter,
  type AchievementLike,
  type AchievementStatus,
  type CalendarCell,
  type LeaderboardEntryLike,
  type LevelCurve,
  type LevelProgress,
  type MovementDirection,
  type Ranked,
  type Rarity,
  type StreakStats,
} from "./gamification-logic";

const STRINGS = {
  en: {
    rarity: { common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary" },
    earned: "Earned",
    inProgress: "In progress",
    locked: "Locked",
    all: "All",
    secret: "Secret achievement",
    secretHint: "Keep going to discover it.",
    earnedOn: (d: string) => `Earned ${d}`,
    progressOf: (a: string, b: string) => `${a} of ${b}`,
    xpReward: (n: string) => `+${n} XP`,
    badgesFilter: "Filter achievements",
    noMatches: "Nothing here yet",
    noMatchesHint: "Achievements that match this filter show up here.",
    level: (n: string) => `Level ${n}`,
    xpOf: (a: string, b: string) => `${a} / ${b} XP`,
    xpToNext: (n: string, level: string) => `${n} XP to level ${level}`,
    period: "Period",
    you: "You",
    rank: "Rank",
    yourRank: "Your rank",
    ranked: (n: string) => `Rank ${n}`,
    movedUp: (n: string) => `Up ${n}`,
    movedDown: (n: string) => `Down ${n}`,
    same: "No change",
    isNew: "New",
    score: "Score",
    emptyBoard: "No one on the board yet",
    emptyBoardHint: "Scores show up here once people start earning them.",
    leaderboard: "Leaderboard",
    streak: "Day streak",
    days: (n: number) => (n === 1 ? "day" : "days"),
    longest: (n: string) => `Longest ${n}`,
    atRisk: "Do something today to keep it going",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    activeDay: "Active",
    today: "Today",
    reward: "Reward",
    claim: "Claim",
    claiming: "Claiming",
    claimed: "Owned",
    needMore: (n: string) => `${n} more needed`,
    cost: (n: string, unit: string) => `${n} ${unit}`,
    points: "points",
    unlocked: "Achievement unlocked",
    dismiss: "Dismiss",
    view: "View",
    failed: "Could not claim. Try again.",
  },
  ar: {
    rarity: { common: "شائع", uncommon: "غير شائع", rare: "نادر", epic: "ملحمي", legendary: "أسطوري" },
    earned: "مُكتسب",
    inProgress: "قيد التقدّم",
    locked: "مقفل",
    all: "الكل",
    secret: "إنجاز سري",
    secretHint: "واصل التقدّم لتكتشفه.",
    earnedOn: (d: string) => `اكتُسب ${d}`,
    progressOf: (a: string, b: string) => `${a} من ${b}`,
    xpReward: (n: string) => `+${n} نقطة خبرة`,
    badgesFilter: "تصفية الإنجازات",
    noMatches: "لا شيء هنا بعد",
    noMatchesHint: "تظهر هنا الإنجازات المطابقة لهذه التصفية.",
    level: (n: string) => `المستوى ${n}`,
    xpOf: (a: string, b: string) => `${a} / ${b} نقطة خبرة`,
    xpToNext: (n: string, level: string) => `${n} نقطة خبرة للمستوى ${level}`,
    period: "الفترة",
    you: "أنت",
    rank: "الترتيب",
    yourRank: "ترتيبك",
    ranked: (n: string) => `المركز ${n}`,
    movedUp: (n: string) => `صعود ${n}`,
    movedDown: (n: string) => `هبوط ${n}`,
    same: "بلا تغيير",
    isNew: "جديد",
    score: "النقاط",
    emptyBoard: "لا أحد في القائمة بعد",
    emptyBoardHint: "تظهر النقاط هنا عندما يبدأ الناس بكسبها.",
    leaderboard: "لوحة المتصدّرين",
    streak: "أيام متتالية",
    days: (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومان" : n >= 3 && n <= 10 ? "أيام" : "يومًا"),
    longest: (n: string) => `الأطول ${n}`,
    atRisk: "أنجز شيئًا اليوم لتحافظ على السلسلة",
    prevMonth: "الشهر السابق",
    nextMonth: "الشهر التالي",
    activeDay: "نشِط",
    today: "اليوم",
    reward: "مكافأة",
    claim: "استلام",
    claiming: "جارٍ الاستلام",
    claimed: "مملوكة",
    needMore: (n: string) => `يلزم ${n} إضافية`,
    cost: (n: string, unit: string) => `${n} ${unit}`,
    points: "نقطة",
    unlocked: "تم فتح إنجاز",
    dismiss: "إغلاق",
    view: "عرض",
    failed: "تعذّر الاستلام. حاول مرة أخرى.",
  },
};

export type GamificationLabels = (typeof STRINGS)["en"];

function useKit(labels?: Partial<GamificationLabels>) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const base = STRINGS[ar ? "ar" : "en"];
  const t = { ...base, ...labels, rarity: { ...base.rarity, ...labels?.rarity } } as GamificationLabels;
  return { t, locale, ar, num: (n: number, o?: FormatNumberOptions) => formatNumber(n, locale, o) };
}

const subscribeMotion = (onChange: () => void) => {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

/** True when the visitor asked for less motion. The unlock celebration then shows as a still card. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/* ------------------------------------------------------------------ rarity */

/** Rarity is shown as a word too, never as colour alone. Tokens only: epic uses the violet tag hue, legendary the accent. */
const RARITY_STYLE: Record<Rarity, { ring: string; soft: string; text: string }> = {
  common: { ring: "border-nq-line-strong", soft: "bg-secondary", text: "text-muted-foreground" },
  uncommon: { ring: "border-nq-success", soft: "bg-nq-success-soft", text: "text-nq-success-text" },
  rare: { ring: "border-nq-info", soft: "bg-nq-info-soft", text: "text-nq-info-text" },
  epic: { ring: "border-[var(--nq-tag-violet)]", soft: "bg-[var(--nq-tag-violet-soft)]", text: "text-[var(--nq-tag-violet)]" },
  legendary: { ring: "border-nq-accent", soft: "bg-nq-accent/15", text: "text-nq-accent-text" },
};

export interface RarityBadgeProps extends ComponentProps<typeof Badge> {
  rarity: Rarity;
  labels?: Partial<GamificationLabels>;
}

export function RarityBadge({ rarity, labels, className, ...props }: RarityBadgeProps) {
  const { t } = useKit(labels);
  const s = RARITY_STYLE[rarity];
  return (
    <Badge data-slot="rarity-badge" data-rarity={rarity} variant="outline" className={cn("gap-1", s.ring, s.text, className)} {...props}>
      <Star aria-hidden className="fill-current" />
      {t.rarity[rarity]}
    </Badge>
  );
}

/* ------------------------------------------------------------------ achievements */

/** Something a person can earn. Generic: the app supplies the words, the icon and the goal. */
export interface Achievement extends AchievementLike {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** XP awarded when earned. */
  xp?: number;
  /** Hide the title and description until it is earned. */
  secret?: boolean;
}

const MEDAL_SIZE = {
  sm: { box: "size-14", icon: "size-6", ring: 56 },
  md: { box: "size-16", icon: "size-7", ring: 64 },
  lg: { box: "size-24", icon: "size-10", ring: 96 },
} as const;

export interface AchievementMedalProps extends Omit<ComponentProps<"span">, "children"> {
  achievement: Achievement;
  size?: keyof typeof MEDAL_SIZE;
}

/**
 * The round badge. Earned: solid ring in the rarity colour. In progress: the ring fills as the goal is reached.
 * Locked: dashed and dimmed with a lock. Decorative; the words that go with it carry the state.
 */
export function AchievementMedal({ achievement, size = "md", className, ...props }: AchievementMedalProps) {
  const status = achievementStatus(achievement);
  const pct = achievementPercent(achievement);
  const s = RARITY_STYLE[achievement.rarity ?? "common"];
  const dim = MEDAL_SIZE[size];
  const Glyph = achievement.icon ?? Trophy;
  const stroke = 4;
  const radius = (dim.ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span
      aria-hidden
      data-slot="achievement-medal"
      data-status={status}
      data-rarity={achievement.rarity ?? "common"}
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full", dim.box, className)}
      {...props}
    >
      {status === "in-progress" ? (
        <svg viewBox={`0 0 ${dim.ring} ${dim.ring}`} className={cn("absolute inset-0 -rotate-90 rtl:scale-x-[-1]", s.text)}>
          <circle cx={dim.ring / 2} cy={dim.ring / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-nq-line" />
          <circle
            cx={dim.ring / 2}
            cy={dim.ring / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            className="stroke-current transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none"
          />
        </svg>
      ) : (
        <span className={cn("absolute inset-0 rounded-full border-2", status === "earned" ? cn(s.ring, s.soft) : "border-dashed border-nq-line-strong bg-secondary")} />
      )}
      <span className={cn("relative grid place-items-center rounded-full", status === "in-progress" ? "size-[72%]" : "size-[68%]", status === "in-progress" && s.soft)}>
        {status === "locked" ? (
          <Lock className={cn("text-muted-foreground", size === "lg" ? "size-8" : "size-5")} />
        ) : (
          <Glyph className={cn(dim.icon, s.text, status === "in-progress" && "opacity-80")} />
        )}
      </span>
    </span>
  );
}

function StatusText({ a, labels }: { a: Achievement; labels?: Partial<GamificationLabels> }) {
  const { t, num } = useKit(labels);
  const status = achievementStatus(a);
  if (status === "earned") return <>{t.earned}</>;
  if (status === "locked") return <>{t.locked}</>;
  return (
    <>
      {t.inProgress} · {t.progressOf(num(a.progress ?? 0), num(a.goal ?? 1))}
    </>
  );
}

export interface BadgeGridProps extends Omit<ComponentProps<"section">, "children" | "onSelect"> {
  achievements: readonly Achievement[];
  /** Filter tabs (All, Earned, In progress, Locked). Default true. */
  filters?: boolean;
  filter?: AchievementFilter;
  onFilterChange?: (filter: AchievementFilter) => void;
  /** A badge was chosen: open its detail. */
  onSelect?: (id: string) => void;
  selectedId?: string;
  labels?: Partial<GamificationLabels>;
}

/** Every badge and achievement as a grid, with earned, in-progress and locked states and a filter. */
export function BadgeGrid({ achievements, filters = true, filter: controlled, onFilterChange, onSelect, selectedId, labels, className, ...props }: BadgeGridProps) {
  const { t, num } = useKit(labels);
  const [local, setLocal] = useState<AchievementFilter>("all");
  const filter = controlled ?? local;
  const counts = useMemo(() => achievementCounts(achievements), [achievements]);
  const shown = useMemo(() => filterAchievements(achievements, filter), [achievements, filter]);
  const tabs: [AchievementFilter, string][] = [
    ["all", t.all],
    ["earned", t.earned],
    ["in-progress", t.inProgress],
    ["locked", t.locked],
  ];
  return (
    <section data-slot="badge-grid" className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      {filters ? (
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setLocal(v as AchievementFilter);
            onFilterChange?.(v as AchievementFilter);
          }}
        >
          <TabsList aria-label={t.badgesFilter}>
            {tabs.map(([id, label]) => (
              <TabsTab key={id} value={id}>
                {label}
                <span className="text-caption tabular-nums text-muted-foreground">{num(counts[id])}</span>
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
        </Tabs>
      ) : null}
      {shown.length === 0 ? (
        <EmptyState icon={Award} title={t.noMatches} description={t.noMatchesHint} />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
          {shown.map((a) => {
            const status = achievementStatus(a);
            const hidden = a.secret && status !== "earned";
            const title = hidden ? t.secret : a.title;
            const Element = onSelect ? "button" : "div";
            return (
              <li key={a.id} className="min-w-0">
                <Element
                  {...(onSelect ? { type: "button" as const, onClick: () => onSelect(a.id), "aria-pressed": selectedId === a.id } : {})}
                  data-status={status}
                  data-selected={selectedId === a.id || undefined}
                  className={cn(
                    "flex h-full w-full flex-col items-center gap-2 rounded-card border border-border bg-card p-3 text-center outline-none transition-colors duration-150 ease-nq",
                    onSelect && "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
                    "data-selected:border-nq-line-strong data-selected:bg-nq-selected",
                    status === "locked" && "text-muted-foreground",
                  )}
                >
                  <AchievementMedal achievement={hidden ? { ...a, icon: undefined } : a} />
                  <span dir="auto" className={cn("line-clamp-2 text-label", status === "locked" ? "text-muted-foreground" : "text-foreground")}>
                    {title}
                  </span>
                  <span className="flex flex-col items-center gap-0.5 text-caption text-muted-foreground">
                    <span>
                      <StatusText a={a} labels={labels} />
                    </span>
                    {a.rarity && a.rarity !== "common" && !hidden ? <span className={RARITY_STYLE[a.rarity].text}>{t.rarity[a.rarity]}</span> : null}
                  </span>
                </Element>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export interface AchievementCardProps extends Omit<ComponentProps<"div">, "children"> {
  achievement: Achievement;
  /** Actions under the description, e.g. a share button. */
  actions?: ReactNode;
  labels?: Partial<GamificationLabels>;
}

/** One achievement in full: the badge, what it takes, how far along, when it was earned and what it pays. */
export function AchievementCard({ achievement: a, actions, labels, className, ...props }: AchievementCardProps) {
  const { t, locale, num } = useKit(labels);
  const status = achievementStatus(a);
  const hidden = a.secret && status !== "earned";
  const goal = a.goal && a.goal > 0 ? a.goal : 1;
  const titleId = useId();
  return (
    <Card role="group" aria-labelledby={titleId} data-slot="achievement-card" data-status={status} className={cn("min-w-0", className)} {...props}>
      <CardContent className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start">
        <AchievementMedal achievement={hidden ? { ...a, icon: undefined } : a} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <div className="flex flex-col items-center gap-1.5 sm:items-start">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <RarityBadge rarity={a.rarity ?? "common"} labels={labels} />
              {a.xp ? (
                <Badge variant="accent">
                  <Sparkles aria-hidden />
                  {t.xpReward(num(a.xp))}
                </Badge>
              ) : null}
            </div>
            <CardTitle as="h3" className="text-body" id={titleId}>
              <span dir="auto">{hidden ? t.secret : a.title}</span>
            </CardTitle>
            <CardDescription>
              <span dir="auto">{hidden ? t.secretHint : a.description}</span>
            </CardDescription>
          </div>
          {status === "earned" ? (
            <p className="inline-flex items-center gap-1.5 text-body-sm text-nq-success-text">
              <Check aria-hidden className="size-4" />
              {a.earnedAt ? t.earnedOn(formatDate(a.earnedAt, locale, { dateStyle: "medium" })) : t.earned}
            </p>
          ) : (
            <Progress
              value={achievementPercent(a)}
              label={status === "locked" ? t.locked : t.inProgress}
              valueText={t.progressOf(num(a.progress ?? 0), num(goal))}
              className="w-full max-w-sm"
            />
          )}
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ xp */

export interface XpProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** Lifetime XP. The level and the bar come from it and `curve`. */
  totalXp: number;
  curve?: LevelCurve;
  /** Name of the currency. Default "XP" (the labels decide the word). */
  labels?: Partial<GamificationLabels>;
}

/** The level and how far into it you are: a level number, "260 / 350 XP" and what is left to the next one. */
export function XpProgress({ totalXp, curve, labels, className, ...props }: XpProgressProps) {
  const { t, num } = useKit(labels);
  const p = levelProgress(totalXp, curve);
  return (
    <div data-slot="xp-progress" data-level={p.level} className={cn("flex items-center gap-3", className)} {...props}>
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-nq-accent bg-nq-accent/15 text-h3 tabular-nums text-nq-accent-text">
        {num(p.level)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-label text-foreground">{t.level(num(p.level))}</span>
          <span className="text-caption tabular-nums text-muted-foreground">
            <bdi>{t.xpOf(num(p.xp), num(p.span))}</bdi>
          </span>
        </div>
        <Progress value={p.percent} size="sm" aria-label={t.level(num(p.level))} />
        <span className="text-caption text-muted-foreground">
          <bdi>{t.xpToNext(num(p.remaining), num(p.level + 1))}</bdi>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ streaks */

export interface StreakCounterProps extends Omit<ComponentProps<"div">, "children"> {
  /** Consecutive days. */
  current: number;
  longest?: number;
  /** Today is not done yet and the streak will break tonight. */
  atRisk?: boolean;
  labels?: Partial<GamificationLabels>;
}

/** The flame and the number of days in a row. The longest run and a nudge when today is still open. */
export function StreakCounter({ current, longest, atRisk, labels, className, ...props }: StreakCounterProps) {
  const { t, num } = useKit(labels);
  return (
    <div data-slot="streak-counter" data-at-risk={atRisk || undefined} className={cn("flex items-center gap-3", className)} {...props}>
      <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-full", current > 0 ? "bg-nq-warning-soft text-nq-warning-text" : "bg-secondary text-muted-foreground")}>
        <Flame className={cn("size-6", current > 0 && "fill-current")} />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-baseline gap-1.5">
          <span className="text-h2 tabular-nums text-foreground">{num(current)}</span>
          <span className="text-body-sm text-muted-foreground">{t.streak}</span>
        </span>
        <span className="text-caption text-muted-foreground">
          {atRisk ? <span className="text-nq-warning-text">{t.atRisk}</span> : longest !== undefined ? t.longest(num(longest)) : null}
        </span>
      </div>
    </div>
  );
}

export interface StreakCalendarProps extends Omit<ComponentProps<"div">, "children"> {
  /** Days with activity. `YYYY-MM-DD` strings, dates or timestamps. */
  activeDays: readonly (Date | string | number)[];
  /** The month shown, any date inside it. Default: the current month. */
  month?: Date;
  onMonthChange?: (month: Date) => void;
  /** Override "today", for tests and demos. */
  today?: Date;
  /** First column: 0 Sunday, 1 Monday, 6 Saturday. Default 6 in Arabic and 0 otherwise. */
  weekStart?: number;
  labels?: Partial<GamificationLabels>;
}

/** A month of days with the active ones filled. Active is a check as well as a fill, so it does not depend on colour. */
export function StreakCalendar({ activeDays, month: controlled, onMonthChange, today: todayProp, weekStart, labels, className, ...props }: StreakCalendarProps) {
  const { t, locale, ar } = useKit(labels);
  const today = useMemo(() => todayProp ?? new Date(), [todayProp]);
  const [local, setLocal] = useState(() => controlled ?? today);
  const month = controlled ?? local;
  const start = weekStart ?? (ar ? 6 : 0);
  const weeks = useMemo(() => monthGrid(month.getFullYear(), month.getMonth(), activeDays, today, start), [month, activeDays, today, start]);
  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2026-08-30 is a Sunday.
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(2026, 7, 30 + ((i + start) % 7))));
  }, [locale, start]);
  const go = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setLocal(next);
    onMonthChange?.(next);
  };
  return (
    <div data-slot="streak-calendar" className={cn("flex w-full max-w-sm flex-col gap-2", className)} {...props}>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label={t.prevMonth} onClick={() => go(-1)}>
          <Icon icon={ChevronLeft} />
        </Button>
        <span aria-live="polite" className="text-label text-foreground">
          {formatDate(month, locale, { month: "long", year: "numeric" })}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label={t.nextMonth} onClick={() => go(1)}>
          <Icon icon={ChevronRight} />
        </Button>
      </div>
      <table role="grid" className="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            {weekdays.map((d, i) => (
              <th key={i} scope="col" className="pb-1 text-caption font-normal text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, wi) => (
            <tr key={wi}>
              {w.map((c, ci) => (
                <td key={ci} className="p-0">
                  {c ? (
                    <span
                      data-active={c.active || undefined}
                      data-today={c.today || undefined}
                      title={c.today ? t.today : c.active ? t.activeDay : undefined}
                      className={cn(
                        "relative mx-auto grid aspect-square w-full max-w-9 place-items-center rounded-full text-caption tabular-nums",
                        c.active ? "bg-nq-warning text-nq-bg" : c.future ? "text-muted-foreground/60" : "text-foreground",
                        c.today && "outline-2 -outline-offset-2 outline-nq-focus",
                      )}
                    >
                      {new Intl.NumberFormat(locale).format(c.day)}
                      {c.active ? <span className="sr-only">{t.activeDay}</span> : null}
                      {c.active ? <Check aria-hidden className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-card p-px text-nq-success-text" /> : null}
                    </span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface StreakCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  activeDays: readonly (Date | string | number)[];
  today?: Date;
  weekStart?: number;
  labels?: Partial<GamificationLabels>;
}

/** The counter and the calendar together, with the numbers worked out from the active days. */
export function StreakCard({ activeDays, today: todayProp, weekStart, labels, className, ...props }: StreakCardProps) {
  const today = useMemo(() => todayProp ?? new Date(), [todayProp]);
  const stats = useMemo(() => streakStats(activeDays, today), [activeDays, today]);
  return (
    <Card data-slot="streak-card" className={cn("min-w-0", className)} {...props}>
      <CardContent className="flex flex-col gap-4">
        <StreakCounter current={stats.current} longest={stats.longest} atRisk={stats.atRisk} labels={labels} />
        <StreakCalendar activeDays={activeDays} today={today} weekStart={weekStart} labels={labels} className="max-w-none" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ leaderboard */

export interface LeaderboardEntry extends LeaderboardEntryLike {
  avatar?: string;
  /** A second line under the name, e.g. a team or a title. */
  subtitle?: string;
}

export interface LeaderboardPeriod {
  id: string;
  label: string;
}

export interface LeaderboardProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  entries: readonly LeaderboardEntry[];
  /** The signed-in person. Their row is highlighted, and pinned below the list when they are outside it. */
  youId?: string;
  /** Period tabs, e.g. This week, This month, All time. */
  periods?: readonly LeaderboardPeriod[];
  period?: string;
  onPeriodChange?: (id: string) => void;
  /** Unit after the score, e.g. "XP" or "pts". */
  unit?: string;
  /** Rows shown, podium included. Others sit behind the pinned row. Default 10. */
  limit?: number;
  /** Show the top three on a podium. Default true. */
  podium?: boolean;
  loading?: boolean;
  title?: ReactNode;
  labels?: Partial<GamificationLabels>;
}

function Movement({ rank, previousRank, labels }: { rank: number; previousRank?: number; labels?: Partial<GamificationLabels> }) {
  const { t, num } = useKit(labels);
  const m = movement({ rank, previousRank });
  if (m.direction === "new") return <Badge variant="info">{t.isNew}</Badge>;
  const text = m.direction === "up" ? t.movedUp(num(m.by)) : m.direction === "down" ? t.movedDown(num(m.by)) : t.same;
  return (
    <span
      data-movement={m.direction}
      className={cn("inline-flex items-center gap-0.5 text-caption tabular-nums", m.direction === "up" ? "text-nq-success-text" : m.direction === "down" ? "text-nq-danger-text" : "text-muted-foreground")}
    >
      {m.direction === "up" ? <ArrowUp aria-hidden className="size-3.5" /> : m.direction === "down" ? <ArrowDown aria-hidden className="size-3.5" /> : <Minus aria-hidden className="size-3.5" />}
      {m.direction === "same" ? null : <span aria-hidden>{num(m.by)}</span>}
      <span className="sr-only">{text}</span>
    </span>
  );
}

const PODIUM = {
  1: { height: "h-24", avatar: "lg", order: "order-2", tone: "border-nq-accent bg-nq-accent/15 text-nq-accent-text" },
  2: { height: "h-16", avatar: "lg", order: "order-1", tone: "border-nq-line-strong bg-secondary text-foreground" },
  3: { height: "h-12", avatar: "lg", order: "order-3", tone: "border-nq-line-strong bg-secondary text-foreground" },
} as const;

/**
 * Ranking of people or teams: period tabs, a podium for the top three, the rest as a list with movement
 * since the last period, and your own row pinned at the bottom when you are further down.
 */
export function Leaderboard({ entries, youId, periods, period, onPeriodChange, unit, limit = 10, podium = true, loading, title, labels, className, ...props }: LeaderboardProps) {
  const { t, num } = useKit(labels);
  const [localPeriod, setLocalPeriod] = useState(periods?.[0]?.id);
  const activePeriod = period ?? localPeriod;
  const ranked = useMemo(() => rankEntries(entries), [entries]);
  const visible = ranked.slice(0, limit);
  const { top, rest } = splitPodium(visible, podium);
  const pinned = pinnedEntry(ranked, youId, visible.length);
  const headingId = useId();

  const score = (n: number) => (
    <span className="tabular-nums text-foreground">
      <Num value={n} />
      {unit ? <span className="ms-1 text-caption text-muted-foreground">{unit}</span> : null}
    </span>
  );

  const row = (e: (typeof ranked)[number], pin = false) => (
    <li
      key={e.id}
      data-you={e.id === youId || undefined}
      aria-current={e.id === youId ? "true" : undefined}
      className={cn(
        "flex min-h-14 items-center gap-3 px-4 py-2",
        e.id === youId && "bg-nq-selected",
        pin && "border-t border-border bg-card",
      )}
    >
      <span className="w-8 shrink-0 text-center text-label tabular-nums text-muted-foreground">
        <span className="sr-only">{t.rank} </span>
        {num(e.rank)}
      </span>
      <Avatar name={e.name} src={e.avatar} size="md" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <bdi dir="auto" className="truncate text-label text-foreground">
            {e.name}
          </bdi>
          {e.id === youId ? <Badge variant="brand">{t.you}</Badge> : null}
        </span>
        {e.subtitle ? (
          <span dir="auto" className="truncate text-caption text-muted-foreground">
            {e.subtitle}
          </span>
        ) : null}
      </span>
      <Movement rank={e.rank} previousRank={e.previousRank} labels={labels} />
      <span className="min-w-16 text-end text-body-sm">{score(e.score)}</span>
    </li>
  );

  return (
    <section data-slot="leaderboard" aria-labelledby={headingId} className={cn("min-w-0 overflow-hidden rounded-card border border-border bg-card", className)} {...props}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={headingId} className="flex items-center gap-2 text-label text-foreground">
          <Trophy aria-hidden className="size-4 text-nq-accent-text" />
          {title ?? t.leaderboard}
        </h2>
        {periods?.length ? (
          <Tabs
            value={activePeriod}
            onValueChange={(v) => {
              setLocalPeriod(v as string);
              onPeriodChange?.(v as string);
            }}
          >
            <TabsList aria-label={t.period}>
              {periods.map((p) => (
                <TabsTab key={p.id} value={p.id}>
                  {p.label}
                </TabsTab>
              ))}
              <TabsIndicator />
            </TabsList>
          </Tabs>
        ) : null}
      </header>

      {loading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3 p-4">
          <span className="sr-only">…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <EmptyState icon={Trophy} title={t.emptyBoard} description={t.emptyBoardHint} className="m-4 border-0" />
      ) : (
        <>
          {top.length ? (
            <ol data-slot="leaderboard-podium" className="flex items-end justify-center gap-2 border-b border-border px-4 pt-6 sm:gap-4">
              {top.map((e) => {
                const p = PODIUM[Math.min(3, e.rank) as 1 | 2 | 3];
                return (
                  <li key={e.id} data-you={e.id === youId || undefined} className={cn("flex min-w-0 flex-1 basis-0 flex-col items-center gap-1.5 sm:max-w-40", p.order)}>
                    <span className="relative">
                      {e.rank === 1 ? <Crown aria-hidden className="absolute -top-4 start-1/2 size-5 -translate-x-1/2 text-nq-accent-text rtl:translate-x-1/2" /> : null}
                      <Avatar name={e.name} src={e.avatar} size="lg" className={cn("size-14 text-body ring-2 ring-offset-2 ring-offset-card", e.rank === 1 ? "ring-nq-accent" : "ring-nq-line-strong")} />
                    </span>
                    <span className="flex w-full min-w-0 flex-col items-center text-center">
                      <bdi dir="auto" className="w-full truncate text-label text-foreground">
                        {e.name}
                      </bdi>
                      <span className="text-caption">{score(e.score)}</span>
                    </span>
                    <span className={cn("flex w-full flex-col items-center justify-start gap-0.5 rounded-t-control border border-b-0 pt-2 text-h3 tabular-nums", p.height, p.tone)}>
                      <span className="sr-only">{t.rank}</span>
                      {num(e.rank)}
                      <Movement rank={e.rank} previousRank={e.previousRank} labels={labels} />
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {rest.length ? <ol className="divide-y divide-border">{rest.map((e) => row(e))}</ol> : null}
          {pinned ? (
            <ol aria-label={t.yourRank} className="sticky bottom-0 shadow-[0_-4px_8px_-6px_color-mix(in_oklab,var(--nq-fg)_25%,transparent)]">
              {row(pinned, true)}
            </ol>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ rewards */

export type RewardStatus = "available" | "owned" | "locked";

export interface RewardCardProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  title: string;
  description?: string;
  /** Picture of the reward: an image, an icon or any node. */
  art?: ReactNode;
  rarity?: Rarity;
  /** Price in points. Omit for a reward that is simply earned. */
  cost?: number;
  /** What the price is in. Default "points" (localised). */
  costUnit?: string;
  /** The points the person has. Used to say how many more are needed. */
  balance?: number;
  status?: RewardStatus;
  /** Why it is locked, e.g. "Reach level 5". */
  lockedReason?: string;
  /** Claims the reward. Resolve with `{ error }` to show a message. */
  onClaim?: () => Promise<void | { error?: string }>;
  labels?: Partial<GamificationLabels>;
}

/** A reward or collectible: the art, its rarity, what it costs and a Claim button that handles its own progress and errors. */
export function RewardCard({ title, description, art, rarity = "common", cost, costUnit, balance, status = "available", lockedReason, onClaim, labels, className, ...props }: RewardCardProps) {
  const { t, num } = useKit(labels);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const mounted = useRef(true);
  useEffect(() => () => void (mounted.current = false), []);
  const s = RARITY_STYLE[rarity];
  const short = cost !== undefined && balance !== undefined && balance < cost ? cost - balance : 0;
  const canClaim = status === "available" && short === 0 && !!onClaim;

  async function claim() {
    if (!onClaim || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await onClaim();
      if (mounted.current && result && "error" in result && result.error) setError(result.error);
    } catch {
      if (mounted.current) setError(t.failed);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <Card data-slot="reward-card" data-status={status} data-rarity={rarity} className={cn("min-w-0 gap-3 overflow-hidden py-0", status === "locked" && "opacity-80", className)} {...props}>
      <div className={cn("grid h-32 place-items-center border-b [&_svg]:size-12", s.soft, s.ring, s.text)}>{art ?? <Gift aria-hidden />}</div>
      <CardHeader>
        <CardTitle as="h3" className="flex flex-wrap items-center gap-1.5">
          <span dir="auto">{title}</span>
          <RarityBadge rarity={rarity} labels={labels} />
        </CardTitle>
        {description ? (
          <CardDescription>
            <span dir="auto">{description}</span>
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4">
        <div className="flex items-center justify-between gap-2">
          {cost !== undefined ? (
            <span className="inline-flex items-center gap-1 text-label tabular-nums text-foreground">
              <Sparkles aria-hidden className="size-4 text-nq-accent-text" />
              <bdi>{t.cost(num(cost), costUnit ?? t.points)}</bdi>
            </span>
          ) : (
            <span />
          )}
          {status === "owned" ? (
            <Badge variant="success">
              <Check aria-hidden />
              {t.claimed}
            </Badge>
          ) : status === "locked" ? (
            <Badge variant="outline">
              <Lock aria-hidden />
              {t.locked}
            </Badge>
          ) : (
            <Button size="sm" variant="primary" loading={busy} disabled={!canClaim} onClick={claim}>
              {busy ? t.claiming : t.claim}
            </Button>
          )}
        </div>
        {status === "locked" && lockedReason ? <p className="text-caption text-muted-foreground">{lockedReason}</p> : null}
        {status === "available" && short > 0 ? <p className="text-caption text-muted-foreground">{t.needMore(num(short))}</p> : null}
        {error ? (
          <p role="alert" className="text-caption text-nq-danger-text">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ unlock celebration */

const BURST_DOTS = 10;

/** A ring of dots flying outward from the medal. Only when motion is allowed. */
function Burst({ active }: { active: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!active || !el || typeof el.animate !== "function") return;
    const anims = Array.from(el.children).map((child, i) => {
      const angle = (i / BURST_DOTS) * Math.PI * 2;
      const distance = 34 + (i % 2) * 10;
      return (child as HTMLElement).animate(
        [
          { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1)`, opacity: 0 },
        ],
        { duration: 800, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both", delay: 60 },
      );
    });
    return () => {
      for (const a of anims) a.cancel();
    };
  }, [active]);
  if (!active) return null;
  return (
    <span ref={host} aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: BURST_DOTS }, (_, i) => (
        <span key={i} className={cn("absolute start-1/2 top-1/2 size-1.5 rounded-full opacity-0", i % 3 === 0 ? "bg-nq-accent" : i % 3 === 1 ? "bg-nq-success" : "bg-nq-info")} />
      ))}
    </span>
  );
}

export interface AchievementUnlockToastProps extends Omit<ComponentProps<"div">, "children"> {
  /** The achievement just earned. `null` or `open={false}` hides the toast. */
  achievement: Achievement | null;
  open: boolean;
  onClose: () => void;
  /** Opens the achievement. Shows a View button. */
  onView?: (id: string) => void;
  /** Hides itself after this many ms. Paused while hovered or focused. Default 6000, 0 keeps it open. */
  duration?: number;
  /** Fixed to the bottom corner (default), or in the flow of the page. */
  floating?: boolean;
  labels?: Partial<GamificationLabels>;
}

/**
 * The celebration when something is earned: the medal pops in with a burst of dots. With `prefers-reduced-motion`
 * it appears as a still card with no burst and no pop. Screen readers hear "Achievement unlocked" and the title
 * through a polite live region that stays mounted, so mount this once and drive it with `open`.
 */
export function AchievementUnlockToast({ achievement, open, onClose, onView, duration = 6000, floating = true, labels, className, ...props }: AchievementUnlockToastProps) {
  const { t, num } = useKit(labels);
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const medal = useRef<HTMLSpanElement>(null);
  const id = achievement?.id;
  const shown = open && achievement;

  useEffect(() => {
    if (!shown || paused || duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [shown, paused, duration, onClose, id]);

  useEffect(() => {
    if (!shown || reduced) return;
    const anims = [
      card.current?.animate?.([{ transform: "translateY(16px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 260, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "both" }),
      medal.current?.animate?.([{ transform: "scale(0.5)" }, { transform: "scale(1.18)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out", delay: 120, fill: "both" }),
    ];
    return () => {
      for (const a of anims) a?.cancel();
    };
  }, [shown, reduced, id]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="achievement-unlock-toast"
      className={cn(floating ? "pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:end-4 sm:w-96" : "w-full", className)}
      {...props}
    >
      {shown ? (
        <div
          ref={card}
          data-rarity={achievement.rarity ?? "common"}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className={cn("pointer-events-auto relative flex items-center gap-3 rounded-floating border bg-popover p-3 text-popover-foreground shadow-floating", RARITY_STYLE[achievement.rarity ?? "common"].ring)}
        >
          <span className="relative shrink-0">
            <span ref={medal} className="inline-block">
              <AchievementMedal achievement={{ ...achievement, earnedAt: achievement.earnedAt ?? new Date() }} size="md" />
            </span>
            <Burst active={!reduced} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-eyebrow text-nq-accent-text">{t.unlocked}</span>
            <span dir="auto" className="truncate text-label text-foreground">
              {achievement.title}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
              <span>{t.rarity[achievement.rarity ?? "common"]}</span>
              {achievement.xp ? <span className="text-nq-accent-text">{t.xpReward(num(achievement.xp))}</span> : null}
            </span>
          </div>
          {onView ? (
            <Button size="sm" variant="secondary" onClick={() => onView(achievement.id)}>
              {t.view}
            </Button>
          ) : null}
          <Button variant="ghost" size="icon-sm" aria-label={t.dismiss} onClick={onClose}>
            <X aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}


