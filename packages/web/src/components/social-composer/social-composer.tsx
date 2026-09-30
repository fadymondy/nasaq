"use client";

import { CalendarClock, ImagePlus, Send, Video, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiSplitButton } from "../ai-states";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { DataTable, type DataTableRowAction, useDataTable } from "../data-table";
import { DatePicker, TimePicker } from "../date-picker";
import { Field, FieldDescription, FieldLabel, Textarea } from "../field";
import { formatDate, formatNumber } from "../numeric";
import { Progress } from "../progress";
import { StatCard, StatGrid } from "../stat-card";
import { Status, type StatusTone } from "../status";
import {
  checkSocialPost,
  type SocialMedia,
  type SocialMediaKind,
  type SocialMetrics,
  type SocialPlatform,
  type SocialPlatformCheck,
  type SocialProblem,
  type SocialTargetStatus,
  socialEngagementRate,
  socialEngagements,
  socialReady,
  socialRule,
  summarizeSocialMetrics,
} from "./social-composer-logic";

const STRINGS = {
  en: {
    accounts: "Post to",
    noAccounts: "Connect an account to start posting.",
    text: "Post text",
    textHint: "One text for every target. Each platform counts it its own way, and nothing is cut for you.",
    placeholder: "What do you want to share?",
    addImage: "Add image",
    addVideo: "Add video",
    removeMedia: (name: string) => `Remove ${name}`,
    media: "Media",
    assist: "Improve",
    schedule: "Schedule",
    scheduleHint: "Leave empty to publish right away.",
    date: "Date",
    time: "Time",
    clearSchedule: "Clear schedule",
    publish: "Publish now",
    scheduleAction: "Schedule post",
    saveDraft: "Save draft",
    targets: "Targets",
    pickTargets: "Pick at least one account to see how the post fits.",
    customVersion: "Write a version for this platform",
    useShared: "Use the shared text",
    custom: "Custom",
    chars: (used: string, limit: string) => `${used} of ${limit}`,
    over: (n: string) => `${n} over the limit`,
    left: (n: string) => `${n} left`,
    counter: (name: string) => `${name} character count`,
    problems: {
      empty: "Write some text.",
      over: "Too long for this platform.",
      media: (kind: SocialMediaKind) => (kind === "image" ? "Needs an image." : "Needs a video."),
      hashtags: (max: number) => `No more than ${max} hashtags.`,
    },
    preview: "Preview",
    ready: "Ready to go",
  },
  ar: {
    accounts: "انشر على",
    noAccounts: "اربط حسابًا لتبدأ النشر.",
    text: "نص المنشور",
    textHint: "نص واحد لكل الوجهات. كل منصة تعدّه بطريقتها، ولا يُقصّ منه شيء تلقائيًا.",
    placeholder: "ماذا تريد أن تشارك؟",
    addImage: "إضافة صورة",
    addVideo: "إضافة فيديو",
    removeMedia: (name: string) => `إزالة ${name}`,
    media: "الوسائط",
    assist: "تحسين",
    schedule: "الجدولة",
    scheduleHint: "اتركها فارغة للنشر فورًا.",
    date: "التاريخ",
    time: "الوقت",
    clearSchedule: "مسح الجدولة",
    publish: "انشر الآن",
    scheduleAction: "جدولة المنشور",
    saveDraft: "حفظ مسودة",
    targets: "الوجهات",
    pickTargets: "اختر حسابًا واحدًا على الأقل لترى كيف يتناسب المنشور.",
    customVersion: "اكتب نسخة لهذه المنصة",
    useShared: "استخدم النص المشترك",
    custom: "مخصص",
    chars: (used: string, limit: string) => `${used} من ${limit}`,
    over: (n: string) => `يزيد بمقدار ${n}`,
    left: (n: string) => `متبقٍ ${n}`,
    counter: (name: string) => `عدد أحرف ${name}`,
    problems: {
      empty: "اكتب نصًا.",
      over: "أطول من المسموح في هذه المنصة.",
      media: (kind: SocialMediaKind) => (kind === "image" ? "تحتاج صورة." : "تحتاج فيديو."),
      hashtags: (max: number) => `لا تزيد على ${max} وسمًا.`,
    },
    preview: "معاينة",
    ready: "جاهز للنشر",
  },
} as const;
export type SocialComposerLabels = Partial<(typeof STRINGS)["en"]>;

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  /** The handle or page name: "@nasaq", "Nasaq Studio". */
  name: string;
}

export interface SocialPost {
  body: string;
  /** A platform's own text, when it differs from `body`. */
  variants: Partial<Record<SocialPlatform, string>>;
  accountIds: string[];
  media: SocialMedia[];
  /** null publishes right away. */
  scheduledAt: Date | null;
}

const EMPTY_POST: SocialPost = { body: "", variants: {}, accountIds: [], media: [], scheduledAt: null };

export interface SocialComposerAssistAction {
  id: string;
  label: string;
}

export interface SocialComposerProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "onSubmit" | "children"> {
  accounts: readonly SocialAccount[];
  value?: SocialPost;
  defaultValue?: SocialPost;
  onValueChange?: (post: SocialPost) => void;
  /**
   * The user asked to add media. Open your picker or uploader and return the file (or resolve it). Without this
   * the attach buttons are hidden.
   */
  onAttach?: (kind: SocialMediaKind) => SocialMedia | null | undefined | void | Promise<SocialMedia | null | undefined | void>;
  /** Choices in the Improve menu. The first one runs from the main button. Without them there is no menu. */
  assistActions?: readonly SocialComposerAssistAction[];
  onAssist?: (actionId: string, post: SocialPost) => void;
  assisting?: boolean;
  onSubmit?: (post: SocialPost, checks: SocialPlatformCheck[]) => void;
  onSaveDraft?: (post: SocialPost) => void;
  /** The submit button shows a spinner and blocks while true. */
  submitting?: boolean;
  disabled?: boolean;
  locale?: string;
  labels?: SocialComposerLabels;
}

const toneOf = { ok: "default", near: "warning", over: "danger" } as const;

function withTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h || 0, m || 0, 0, 0);
  return next;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * One post for several social networks. Each chosen platform gets its own counter and limit (X weighs links as 23),
 * a preview of what it will send, a check for media it requires, and an optional version of its own. The composer
 * never cuts text: it tells you what is wrong and lets you fix it.
 */
export function SocialComposer({
  accounts,
  value,
  defaultValue = EMPTY_POST,
  onValueChange,
  onAttach,
  assistActions,
  onAssist,
  assisting,
  onSubmit,
  onSaveDraft,
  submitting,
  disabled,
  locale: localeProp,
  labels,
  className,
  ...props
}: SocialComposerProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState<SocialPost>(defaultValue);
  const post = value ?? inner;
  const [custom, setCustom] = useState<ReadonlySet<SocialPlatform>>(() => new Set(Object.keys(post.variants) as SocialPlatform[]));
  const textId = useId();
  const num = (n: number) => formatNumber(n, locale);

  const update = (patch: Partial<SocialPost>) => {
    const next = { ...post, ...patch };
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const chosen = accounts.filter((a) => post.accountIds.includes(a.id));
  const platforms = [...new Set(chosen.map((a) => a.platform))];
  const checks = checkSocialPost({ body: post.body, variants: post.variants, platforms, media: post.media });
  const ready = socialReady(checks);
  const time = post.scheduledAt ? hhmm(post.scheduledAt) : "09:00";

  const toggleAccount = (id: string) =>
    update({ accountIds: post.accountIds.includes(id) ? post.accountIds.filter((x) => x !== id) : [...post.accountIds, id] });

  const attach = async (kind: SocialMediaKind) => {
    const media = await onAttach?.(kind);
    if (media) update({ media: [...post.media, media] });
  };

  const setCustomFor = (platform: SocialPlatform, on: boolean) => {
    const next = new Set(custom);
    const variants = { ...post.variants };
    if (on) {
      next.add(platform);
      variants[platform] = variants[platform] ?? post.body;
    } else {
      next.delete(platform);
      delete variants[platform];
    }
    setCustom(next);
    update({ variants });
  };

  const problemText = (p: SocialProblem, platform: SocialPlatform): string => {
    const rule = socialRule(platform);
    if (p === "media") return t.problems.media(rule.requiresMedia ?? "image");
    if (p === "hashtags") return t.problems.hashtags(rule.maxHashtags ?? 0);
    return t.problems[p];
  };

  return (
    <div data-slot="social-composer" className={cn("grid w-full gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-4">
        <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
          <legend className="mb-1 text-label font-medium">{t.accounts}</legend>
          {accounts.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noAccounts}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => {
                const on = post.accountIds.includes(a.id);
                return (
                  <Button
                    key={a.id}
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-pressed={on}
                    data-selected={on || undefined}
                    onClick={() => toggleAccount(a.id)}
                    className="data-selected:border-primary data-selected:bg-nq-selected"
                  >
                    <span className="font-medium">{socialRule(a.platform).label}</span>
                    <bdi className="text-muted-foreground">{a.name}</bdi>
                  </Button>
                );
              })}
            </div>
          )}
        </fieldset>

        <Field>
          <FieldLabel htmlFor={textId}>{t.text}</FieldLabel>
          <Textarea
            id={textId}
            rows={6}
            value={post.body}
            disabled={disabled}
            placeholder={t.placeholder}
            onChange={(e) => update({ body: e.target.value })}
          />
          <FieldDescription>{t.textHint}</FieldDescription>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          {onAttach ? (
            <>
              <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => attach("image")}>
                <ImagePlus aria-hidden />
                {t.addImage}
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => attach("video")}>
                <Video aria-hidden />
                {t.addVideo}
              </Button>
            </>
          ) : null}
          {assistActions?.length ? (
            <AiSplitButton
              className="ms-auto"
              label={t.assist}
              generating={assisting}
              disabled={disabled}
              actions={assistActions}
              onRun={() => onAssist?.(assistActions[0]?.id ?? "", post)}
              onAction={(id) => onAssist?.(id, post)}
            />
          ) : null}
        </div>

        {post.media.length ? (
          <ul aria-label={t.media} className="flex flex-wrap gap-2">
            {post.media.map((m) => (
              <li key={m.id} className="inline-flex items-center gap-1.5 rounded-control border border-border bg-nq-surface-soft py-1 ps-2 pe-1 text-body-sm">
                {m.kind === "image" ? <ImagePlus aria-hidden className="size-3.5 text-muted-foreground" /> : <Video aria-hidden className="size-3.5 text-muted-foreground" />}
                <bdi>{m.name}</bdi>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.removeMedia(m.name)}
                  onClick={() => update({ media: post.media.filter((x) => x.id !== m.id) })}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
          <legend className="mb-1 inline-flex items-center gap-1.5 text-label font-medium">
            <CalendarClock aria-hidden className="size-4 text-muted-foreground" />
            {t.schedule}
          </legend>
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              aria-label={t.date}
              value={post.scheduledAt}
              locale={locale}
              onValueChange={(d) => update({ scheduledAt: d ? withTime(d, time) : null })}
            />
            <TimePicker
              aria-label={t.time}
              value={post.scheduledAt ? time : null}
              locale={locale}
              onValueChange={(v) => update({ scheduledAt: withTime(post.scheduledAt ?? new Date(), v ?? "09:00") })}
            />
            {post.scheduledAt ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => update({ scheduledAt: null })}>
                {t.clearSchedule}
              </Button>
            ) : null}
          </div>
          <p className="text-caption text-muted-foreground">{t.scheduleHint}</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button
            type="button"
            loading={submitting}
            disabled={disabled || !ready}
            onClick={() => onSubmit?.(post, checks)}
          >
            <Send aria-hidden />
            {post.scheduledAt ? t.scheduleAction : t.publish}
          </Button>
          {onSaveDraft ? (
            <Button type="button" variant="secondary" disabled={disabled || submitting} onClick={() => onSaveDraft(post)}>
              {t.saveDraft}
            </Button>
          ) : null}
          {ready ? (
            <Status tone="success" className="ms-auto">
              {t.ready}
            </Status>
          ) : null}
        </div>
      </div>

      <section aria-label={t.targets} className="flex min-w-0 flex-col gap-3">
        <h3 className="text-label font-medium">{t.targets}</h3>
        {checks.length === 0 ? <p className="text-body-sm text-muted-foreground">{t.pickTargets}</p> : null}
        {checks.map((c) => {
          const rule = socialRule(c.platform);
          const isCustom = custom.has(c.platform);
          return (
            <Card key={c.platform} data-slot="social-target" data-platform={c.platform} data-level={c.level}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <CardTitle as="h4" className="flex items-center gap-2 text-body font-medium">
                  {rule.label}
                  {c.usesVariant ? <Badge variant="outline">{t.custom}</Badge> : null}
                </CardTitle>
                <span className={cn("text-body-sm tabular-nums", c.level === "over" ? "text-nq-danger-text" : "text-muted-foreground")}>
                  {t.chars(num(c.length), num(c.limit))}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Progress
                  size="sm"
                  aria-label={t.counter(rule.label)}
                  value={Math.min(100, (c.length / c.limit) * 100)}
                  tone={toneOf[c.level]}
                  format={{ style: "percent", maximumFractionDigits: 0 }}
                />
                <p className={cn("text-caption", c.level === "over" ? "text-nq-danger-text" : "text-muted-foreground")}>
                  {c.remaining < 0 ? t.over(num(-c.remaining)) : t.left(num(c.remaining))}
                </p>
                {isCustom ? (
                  <Textarea
                    rows={4}
                    aria-label={`${rule.label} — ${t.custom}`}
                    value={post.variants[c.platform] ?? ""}
                    disabled={disabled}
                    onChange={(e) => update({ variants: { ...post.variants, [c.platform]: e.target.value } })}
                  />
                ) : (
                  <p className="line-clamp-4 whitespace-pre-wrap rounded-control bg-nq-surface-soft p-2 text-body-sm" aria-label={t.preview}>
                    {c.text || <span className="text-muted-foreground">{t.placeholder}</span>}
                  </p>
                )}
                {c.problems.length ? (
                  <ul className="flex flex-col gap-0.5 text-caption text-nq-danger-text">
                    {c.problems.map((p) => (
                      <li key={p}>{problemText(p, c.platform)}</li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="self-start px-0"
                  disabled={disabled}
                  onClick={() => setCustomFor(c.platform, !isCustom)}
                >
                  {isCustom ? t.useShared : t.customVersion}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ metrics */

const METRIC_STRINGS = {
  en: {
    table: "Post metrics",
    platform: "Platform",
    post: "Post",
    status: "Status",
    published: "Published",
    impressions: "Impressions",
    engagements: "Engagements",
    rate: "Engagement rate",
    posts: "Published posts",
    failed: "Failed",
    statuses: { draft: "Draft", queued: "Queued", published: "Published", failed: "Failed" },
    empty: "No posts yet.",
  },
  ar: {
    table: "أداء المنشورات",
    platform: "المنصة",
    post: "المنشور",
    status: "الحالة",
    published: "تاريخ النشر",
    impressions: "مرات الظهور",
    engagements: "التفاعلات",
    rate: "معدل التفاعل",
    posts: "منشورات منشورة",
    failed: "فشلت",
    statuses: { draft: "مسودة", queued: "في الانتظار", published: "منشور", failed: "فشل" },
    empty: "لا منشورات بعد.",
  },
} as const;
export type SocialMetricsTableLabels = Partial<(typeof METRIC_STRINGS)["en"]>;

export interface SocialMetricsRow extends SocialMetrics {
  id: string;
  platform: SocialPlatform;
  /** The account it went to. */
  account?: string;
  /** The post text; the table shows the start of it. */
  text: string;
  status: SocialTargetStatus;
  publishedAt?: Date | string | null;
}

export interface SocialMetricsTableProps {
  rows: readonly SocialMetricsRow[];
  onRowClick?: (row: SocialMetricsRow) => void;
  /** Open with ⋯ and on context-click. */
  rowActions?: (row: SocialMetricsRow) => DataTableRowAction[];
  /** Totals above the table. Default true. */
  summary?: boolean;
  loading?: boolean;
  locale?: string;
  labels?: SocialMetricsTableLabels;
  className?: string;
  empty?: ReactNode;
}

const statusTone: Record<SocialTargetStatus, StatusTone> = { draft: "neutral", queued: "info", published: "success", failed: "danger" };

/** Totals and a sortable per-post table of impressions, engagements and rate, for the posts a composer sent. */
export function SocialMetricsTable({ rows, onRowClick, rowActions, summary = true, loading, locale: localeProp, labels, className, empty }: SocialMetricsTableProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const t = { ...METRIC_STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const totals = summarizeSocialMetrics(rows);
  const pct = (n: number | null) => (n === null ? "—" : formatNumber(n, locale, { style: "percent", maximumFractionDigits: 1 }));
  const table = useDataTable<SocialMetricsRow>({
    data: [...rows],
    getRowId: (r) => r.id,
    defaultSort: { id: "impressions", direction: "desc" },
    columns: [
      {
        id: "platform",
        header: t.platform,
        sortValue: (r) => socialRule(r.platform).label,
        searchValue: (r) => `${socialRule(r.platform).label} ${r.account ?? ""} ${r.text}`,
        cell: (r) => (
          <div className="flex min-w-0 flex-col">
            <span className="font-medium">{socialRule(r.platform).label}</span>
            {r.account ? <bdi className="truncate text-caption text-muted-foreground">{r.account}</bdi> : null}
          </div>
        ),
      },
      { id: "post", header: t.post, cell: (r) => <span className="line-clamp-2 max-w-[32ch]">{r.text}</span> },
      {
        id: "status",
        header: t.status,
        sortValue: (r) => r.status,
        cell: (r) => <Status tone={statusTone[r.status]}>{t.statuses[r.status]}</Status>,
      },
      {
        id: "published",
        header: t.published,
        sortValue: (r) => (r.publishedAt ? new Date(r.publishedAt) : null),
        cell: (r) => (r.publishedAt ? formatDate(r.publishedAt, locale, { dateStyle: "medium" }) : "—"),
      },
      {
        id: "impressions",
        header: t.impressions,
        align: "end",
        sortValue: (r) => r.impressions ?? null,
        cell: (r) => (r.impressions === undefined ? "—" : <span className="tabular-nums">{formatNumber(r.impressions, locale)}</span>),
      },
      {
        id: "engagements",
        header: t.engagements,
        align: "end",
        sortValue: (r) => (r.status === "published" ? socialEngagements(r) : null),
        cell: (r) => (r.status === "published" ? <span className="tabular-nums">{formatNumber(socialEngagements(r), locale)}</span> : "—"),
      },
      {
        id: "rate",
        header: t.rate,
        align: "end",
        sortValue: (r) => socialEngagementRate(r),
        cell: (r) => <span className="tabular-nums">{pct(socialEngagementRate(r))}</span>,
      },
    ],
  });
  return (
    <div data-slot="social-metrics" className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
      {summary ? (
        <StatGrid>
          <StatCard label={t.posts} value={totals.posts} />
          <StatCard label={t.impressions} value={totals.impressions} format={{ notation: "compact" }} />
          <StatCard label={t.engagements} value={totals.engagements} format={{ notation: "compact" }} />
          <StatCard label={t.rate} value={pct(totals.rate)} />
        </StatGrid>
      ) : null}
      <DataTable
        table={table}
        label={t.table}
        rowLabel={(r) => `${socialRule(r.platform).label} ${r.text.slice(0, 30)}`}
        onRowClick={onRowClick}
        rowActions={rowActions}
        loading={loading}
        empty={empty ?? t.empty}
      />
    </div>
  );
}
