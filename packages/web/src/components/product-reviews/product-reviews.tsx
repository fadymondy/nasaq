"use client";

import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { BadgeCheck, ChevronLeft, ChevronRight, Flag, MessageSquareReply, PenLine, Star, ThumbsUp, TriangleAlert, X } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { ContextMenuActions, type ContextMenuAction } from "../context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { Textarea } from "../field";
import { useFormatNumber } from "../numeric";
import { Rating } from "../rating";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { ProductReviewForm, type ProductReviewFormProps, type ProductReviewInput } from "./review-form";
import {
  applyHelpfulVote,
  collectPhotos,
  filterReviews,
  fitSummary,
  hasActiveFilters,
  noReviewFilters,
  type ProductReview,
  type ReviewFilters,
  type ReviewSort,
  type ReviewSummary,
  sortReviews,
  summarizeReviews,
  toggleStar,
  totalPhotos,
  type StarLevel,
} from "./review-logic";
import { type ProductReviewsLabels, type ReviewActionResult, useReviewStrings } from "./review-strings";
import { ProductReviewSummary } from "./review-summary";

export type ProductReviewReportReason = "spam" | "offensive" | "fake" | "irrelevant" | "other";

export interface ProductReviewsProps extends Omit<ComponentProps<"section">, "onChange" | "children"> {
  reviews: readonly ProductReview[];
  /** Override the summary computed from `reviews`, e.g. when only one page of reviews is loaded. */
  summary?: ReviewSummary;
  /** Reviews per page; "show more" adds another page. */
  pageSize?: number;
  defaultSort?: ReviewSort;
  /** Loading state: skeleton rows in place of the list. */
  loading?: boolean;
  /** Error state: the message with a retry button. */
  error?: string | boolean;
  onRetry?: () => void;
  /** Turns on the "write a review" button and the form. */
  onSubmitReview?: (review: ProductReviewInput) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Shown in the form: ask fit, ask for a name. */
  formProps?: Pick<ProductReviewFormProps, "askFit" | "askName" | "defaultName" | "rules">;
  /** Helpful vote (optimistic). Return `{ error }` or throw and the vote rolls back. */
  onVoteHelpful?: (reviewId: string, voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Send a report about a review. Turns on Report. */
  onReport?: (reviewId: string, report: { reason: ProductReviewReportReason; note: string }) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Fires when the star filter, photo chip or verified chip changes. */
  onFiltersChange?: (filters: ReviewFilters) => void;
  labels?: ProductReviewsLabels;
}

const REASONS: ProductReviewReportReason[] = ["spam", "offensive", "fake", "irrelevant", "other"];

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-label outline-none transition-colors duration-150 ease-nq",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        pressed ? "border-foreground bg-nq-selected text-foreground" : "border-border bg-card text-foreground hover:bg-nq-hover",
      )}
    >
      {children}
    </button>
  );
}

function useDateFormat(locale: string) {
  return (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  };
}

/** A fixed-size thumbnail with a token placeholder when the URL is missing or fails. */
function Thumb({ src, alt, size, className }: { src: string; alt: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed || !src ? (
    <span role="img" aria-label={alt} style={{ width: size, height: size }} className={cn("inline-block bg-secondary", className)} />
  ) : (
    <img src={src} alt={alt} width={size} height={size} loading="lazy" onError={() => setFailed(true)} className={cn("bg-secondary object-cover", className)} />
  );
}

interface Vote {
  voted: boolean;
  count: number;
}

/**
 * The reviews block of a product page: rating summary with a filtering histogram, sort and filter chips, a photo strip
 * with a viewer, the review list (helpful votes, seller replies, report, a context menu per review), paging and the
 * write-a-review dialog. It manages its own filter and vote state and reports changes through callbacks.
 */
export function ProductReviews({
  reviews,
  summary,
  pageSize = 5,
  defaultSort = "helpful",
  loading,
  error,
  onRetry,
  onSubmitReview,
  formProps,
  onVoteHelpful,
  onReport,
  onFiltersChange,
  labels,
  className,
  ...props
}: ProductReviewsProps) {
  const { t, locale } = useReviewStrings(labels);
  const fmt = useFormatNumber();
  const formatDate = useDateFormat(locale);
  const uid = useId();
  const [filters, setFilters] = useState<ReviewFilters>(noReviewFilters);
  const [sort, setSort] = useState<ReviewSort>(defaultSort);
  const [visible, setVisible] = useState(pageSize);
  const [votes, setVotes] = useState<Record<string, Vote>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const writeRef = useRef<HTMLButtonElement>(null);

  const stats = summary ?? summarizeReviews(reviews);
  const fit = useMemo(() => fitSummary(reviews), [reviews]);
  const photos = useMemo(() => collectPhotos(reviews), [reviews]);
  const photoTotal = totalPhotos(reviews);
  const shown = useMemo(() => sortReviews(filterReviews(reviews, filters), sort), [reviews, filters, sort]);
  const page = shown.slice(0, visible);
  const active = hasActiveFilters(filters);

  const update = (next: ReviewFilters) => {
    setFilters(next);
    setVisible(pageSize);
    onFiltersChange?.(next);
  };

  const voteFor = (r: ProductReview): Vote => votes[r.id] ?? { voted: false, count: r.helpful ?? 0 };
  const vote = async (r: ProductReview) => {
    const before = voteFor(r);
    const voted = !before.voted;
    setVoteError(null);
    setVotes((v) => ({ ...v, [r.id]: { voted, count: applyHelpfulVote(before.count, voted) } }));
    try {
      const result = await onVoteHelpful?.(r.id, voted);
      if (result && typeof result === "object" && result.error) throw new Error(result.error);
    } catch {
      setVotes((v) => ({ ...v, [r.id]: before }));
      setVoteError(t.voteFailed);
    }
  };

  const sortLabels: Record<ReviewSort, string> = { helpful: t.sortHelpful, newest: t.sortNewest, oldest: t.sortOldest, highest: t.sortHighest, lowest: t.sortLowest };
  const reasonLabels: Record<ProductReviewReportReason, string> = { spam: t.reasonSpam, offensive: t.reasonOffensive, fake: t.reasonFake, irrelevant: t.reasonIrrelevant, other: t.reasonOther };

  const openPhoto = (reviewId: string, src: string) => {
    const i = photos.findIndex((p) => p.reviewId === reviewId && p.src === src);
    setViewer(i < 0 ? 0 : i);
  };

  const errorMessage = error ? (typeof error === "string" ? error : t.loadFailed) : null;

  return (
    <section data-slot="product-reviews" aria-labelledby={`${uid}-title`} className={cn("flex flex-col gap-6", className)} {...props}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${uid}-title`} className="text-h2 text-foreground">
          {t.reviews}
        </h2>
        {onSubmitReview && (
          <Button ref={writeRef} type="button" variant="secondary" onClick={() => setWriting(true)}>
            <PenLine aria-hidden />
            {t.writeReview}
          </Button>
        )}
      </header>

      {errorMessage ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-nq-danger-text">
          <p className="flex items-center gap-2 text-body-sm">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            {errorMessage}
          </p>
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          )}
        </div>
      ) : loading ? (
        <div role="status" aria-label={t.loading} className="flex flex-col gap-5" aria-busy="true">
          <div className="h-32 animate-pulse rounded-card bg-secondary motion-reduce:animate-none" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
              <div className="h-4 w-full animate-pulse rounded bg-secondary motion-reduce:animate-none" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ) : stats.count === 0 && reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-10 text-center">
          <Star aria-hidden className="size-8 text-muted-foreground" />
          <p className="text-h3 text-foreground">{t.noReviews}</p>
          <p className="text-body-sm text-muted-foreground">{t.noReviewsHint}</p>
          {onSubmitReview && (
            <Button type="button" variant="primary" className="mt-2" onClick={() => setWriting(true)}>
              <PenLine aria-hidden />
              {t.writeReview}
            </Button>
          )}
        </div>
      ) : (
        <>
          <ProductReviewSummary summary={stats} selectedStars={filters.stars} onToggleStar={(l) => update({ ...filters, stars: toggleStar(filters.stars, l) })} fit={fit} labels={labels} />

          {photoTotal > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-label text-foreground">{t.photosTitle}</h3>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {photos.slice(0, 8).map((p, i, list) => (
                  <li key={`${p.reviewId}-${p.src}`} className="shrink-0">
                    <button
                      type="button"
                      aria-label={t.viewPhoto}
                      onClick={() => setViewer(i)}
                      className="relative block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                    >
                      <Thumb src={p.src} alt={p.alt ?? t.viewPhoto} size={72} className="size-18 rounded-control" />
                      {i === list.length - 1 && photoTotal > list.length && (
                        <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-label text-background">
                          <bdi>{t.morePhotos(fmt(photoTotal - list.length))}</bdi>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div role="group" aria-label={t.filters} className="flex flex-wrap items-center gap-2 border-y border-border py-3">
            <Select value={sort} onValueChange={(v) => v && setSort(v as ReviewSort)}>
              <SelectTrigger aria-label={t.sort} className="w-auto min-w-40">
                <SelectValue>{sortLabels[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as ReviewSort[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {sortLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Chip pressed={Boolean(filters.withPhotos)} onClick={() => update({ ...filters, withPhotos: !filters.withPhotos })}>
              {t.withPhotos}
            </Chip>
            <Chip pressed={Boolean(filters.verifiedOnly)} onClick={() => update({ ...filters, verifiedOnly: !filters.verifiedOnly })}>
              <BadgeCheck aria-hidden className="size-3.5" />
              {t.verifiedOnly}
            </Chip>
            {filters.stars?.map((level) => (
              <button
                key={level}
                type="button"
                aria-label={t.filterByStars(fmt(level), fmt(stats.histogram[level]))}
                onClick={() => update({ ...filters, stars: toggleStar(filters.stars, level) })}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-foreground bg-nq-selected px-3 text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
              >
                <bdi>{fmt(level)}</bdi>
                <Star aria-hidden className="size-3.5 fill-nq-accent text-nq-accent" />
                <X aria-hidden className="size-3.5" />
              </button>
            ))}
            {active && (
              <Button type="button" variant="link" size="sm" onClick={() => update(noReviewFilters)}>
                {t.clearFilters}
              </Button>
            )}
          </div>

          <p role="status" aria-live="polite" className="text-caption text-muted-foreground">
            {t.showing(fmt(Math.min(visible, shown.length)), fmt(shown.length))}
            {voteError && <span className="ms-2 text-nq-danger-text">{voteError}</span>}
          </p>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-body text-muted-foreground">{t.noMatches}</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => update(noReviewFilters)}>
                {t.clearFilters}
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {page.map((r) => {
                const v = voteFor(r);
                const isReported = reported.has(r.id);
                const open = expanded.has(r.id);
                const long = r.body.length > 220;
                const actions: ContextMenuAction[] = [
                  { id: "helpful", label: v.voted ? t.helpfulUndo : t.helpful, icon: ThumbsUp, onSelect: () => void vote(r), group: "a" },
                  ...(onReport ? [{ id: "report", label: isReported ? t.reported : t.report, icon: Flag, onSelect: () => setReporting(r.id), disabled: isReported, danger: true, group: "b" }] : []),
                ];
                return (
                  <ContextMenuActions key={r.id} actions={actions} render={<li data-review-id={r.id} className="flex flex-col gap-2 py-5" />}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Rating value={r.rating} />
                      {r.verified && (
                        <Badge variant="success">
                          <BadgeCheck aria-hidden />
                          {t.verified}
                        </Badge>
                      )}
                    </div>
                    {r.title && <h3 className="text-h3 text-foreground">{r.title}</h3>}
                    <p className="text-caption text-muted-foreground">
                      {r.author} · <time dateTime={r.date}>{formatDate(r.date)}</time>
                      {r.variantLabel && <> · {t.boughtVariant(r.variantLabel)}</>}
                      {r.fit && <> · {t.fitLabel}: {r.fit === "small" ? t.fitSmall : r.fit === "true" ? t.fitTrue : t.fitLarge}</>}
                    </p>
                    <p className={cn("whitespace-pre-line text-body text-foreground", long && !open && "line-clamp-4")}>{r.body}</p>
                    {long && (
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                        className="self-start text-label text-nq-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
                      >
                        {open ? t.readLess : t.readMore}
                      </button>
                    )}
                    {r.photos && r.photos.length > 0 && (
                      <ul className="flex flex-wrap gap-2">
                        {r.photos.map((p) => (
                          <li key={p.src}>
                            <button type="button" aria-label={t.viewPhoto} onClick={() => openPhoto(r.id, p.src)} className="block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                              <Thumb src={p.src} alt={p.alt ?? t.viewPhoto} size={64} className="size-16" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.reply && (
                      <div className="ms-4 flex flex-col gap-1 border-s-2 border-nq-line-strong ps-3">
                        <p className="flex items-center gap-1.5 text-label text-foreground">
                          <MessageSquareReply aria-hidden className="size-4 text-muted-foreground" />
                          {t.sellerReply}
                        </p>
                        <p className="text-body-sm text-foreground">{r.reply.body}</p>
                        <p className="text-caption text-muted-foreground">
                          {r.reply.author} · <time dateTime={r.reply.date}>{formatDate(r.reply.date)}</time>
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button type="button" variant={v.voted ? "secondary" : "ghost"} size="sm" aria-pressed={v.voted} onClick={() => void vote(r)}>
                        <ThumbsUp aria-hidden />
                        {t.helpfulCount(fmt(v.count))}
                      </Button>
                      {onReport && (
                        <Button type="button" variant="ghost" size="sm" disabled={isReported} onClick={() => setReporting(r.id)}>
                          <Flag aria-hidden />
                          {isReported ? t.reported : t.report}
                        </Button>
                      )}
                    </div>
                  </ContextMenuActions>
                );
              })}
            </ul>
          )}

          {shown.length > visible && (
            <Button type="button" variant="secondary" className="self-center" onClick={() => setVisible((n) => n + pageSize)}>
              {t.showMore}
            </Button>
          )}
        </>
      )}

      {onSubmitReview && (
        <Dialog open={writing} onOpenChange={setWriting}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.formTitle}</DialogTitle>
              <DialogDescription>{t.formDescription}</DialogDescription>
            </DialogHeader>
            <ProductReviewForm {...formProps} labels={labels} onSubmit={onSubmitReview} onCancel={() => setWriting(false)} />
          </DialogContent>
        </Dialog>
      )}

      {onReport && (
        <ReportDialog
          open={reporting !== null}
          onOpenChange={(o) => !o && setReporting(null)}
          reasonLabels={reasonLabels}
          labels={labels}
          onSend={async (report) => {
            const id = reporting;
            if (!id) return;
            const result = await onReport(id, report);
            if (result && typeof result === "object" && result.error) return result;
            setReported((s) => new Set(s).add(id));
          }}
        />
      )}

      <Dialog open={viewer !== null} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.photosTitle}</DialogTitle>
            <DialogDescription>{viewer !== null ? t.photoOf(fmt(viewer + 1), fmt(photos.length)) : ""}</DialogDescription>
          </DialogHeader>
          {viewer !== null && photos[viewer] && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" aria-label={t.prevPhoto} disabled={viewer === 0} onClick={() => setViewer(viewer - 1)}>
                <ChevronLeft aria-hidden className="rtl:rotate-180" />
              </Button>
              <div className="flex min-w-0 flex-1 justify-center">
                <img key={photos[viewer].src} src={photos[viewer].src} alt={photos[viewer].alt ?? t.viewPhoto} width={640} height={640} className="aspect-square max-h-[60dvh] w-full rounded-card bg-secondary object-contain" />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label={t.nextPhoto} disabled={viewer >= photos.length - 1} onClick={() => setViewer(viewer + 1)}>
                <ChevronRight aria-hidden className="rtl:rotate-180" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ReportDialog({
  open,
  onOpenChange,
  reasonLabels,
  labels,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reasonLabels: Record<ProductReviewReportReason, string>;
  labels?: ProductReviewsLabels;
  onSend: (report: { reason: ProductReviewReportReason; note: string }) => Promise<ReviewActionResult>;
}) {
  const { t } = useReviewStrings(labels);
  const uid = useId();
  const [reason, setReason] = useState<ProductReviewReportReason | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setTimeout(() => { setReason(null); setNote(""); setState("idle"); setFailure(null); }, 200);
  };
  const send = async () => {
    if (!reason) return;
    setState("sending");
    setFailure(null);
    try {
      const result = await onSend({ reason, note: note.trim() });
      if (result && typeof result === "object" && result.error) {
        setFailure(result.error);
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setFailure(t.submitFailed);
      setState("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.reportTitle}</DialogTitle>
          <DialogDescription>{t.reportDescription}</DialogDescription>
        </DialogHeader>
        {state === "done" ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p role="status" className="text-body text-foreground">
              {t.reportThanks}
            </p>
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              {t.cancel}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <span id={`${uid}-reason`} className="text-label text-foreground">
              {t.reportReason}
            </span>
            <BaseRadioGroup value={reason} onValueChange={(v) => setReason(v as ProductReviewReportReason)} aria-labelledby={`${uid}-reason`} className="flex flex-col gap-1">
              {REASONS.map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground hover:bg-nq-hover">
                  <BaseRadio.Root value={k} className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-checked:border-foreground">
                    <BaseRadio.Indicator className="size-2 rounded-full bg-foreground" />
                  </BaseRadio.Root>
                  {reasonLabels[k]}
                </label>
              ))}
            </BaseRadioGroup>
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-foreground">{t.reportNote}</span>
              <Textarea value={note} rows={3} onChange={(e) => setNote(e.target.value)} />
            </label>
            {failure && (
              <p role="alert" className="text-body-sm text-nq-danger-text">
                {failure}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                {t.cancel}
              </Button>
              <Button type="button" variant="danger" disabled={!reason} loading={state === "sending"} onClick={() => void send()}>
                {t.reportSend}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
