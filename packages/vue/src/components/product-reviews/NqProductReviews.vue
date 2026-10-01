<script setup lang="ts">
import { BadgeCheck, ChevronLeft, ChevronRight, Flag, MessageSquareReply, PenLine, Star, ThumbsUp, TriangleAlert, X } from "lucide-vue-next";
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqTextarea } from "../field";
import { useFormatNumber } from "../numeric";
import { NqRating } from "../rating";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { useNasaq } from "../../provider";
import { useReviewStrings, type ProductReviewsLabels, type ReviewActionResult } from "./labels";
import NqProductReviewForm, { type ProductReviewInput } from "./NqProductReviewForm.vue";
import NqProductReviewSummary from "./NqProductReviewSummary.vue";
import {
  applyHelpfulVote,
  collectPhotos,
  filterReviews,
  fitSummary,
  hasActiveFilters,
  noReviewFilters,
  sortReviews,
  summarizeReviews,
  toggleStar,
  totalPhotos,
  type ProductReview,
  type ReviewFilters,
  type ReviewRules,
  type ReviewSort,
  type ReviewSummary,
} from "./review-logic";

// The reviews block of a product page: rating summary with a filtering histogram, sort and filter chips, a photo strip with a
// viewer, the review list (helpful votes, seller replies, report, a context menu per review), paging and the write-a-review
// dialog. It manages its own filter and vote state and reports changes through callbacks.
export type ProductReviewReportReason = "spam" | "offensive" | "fake" | "irrelevant" | "other";

interface Props {
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
  formProps?: { askFit?: boolean; askName?: boolean; defaultName?: string; rules?: ReviewRules };
  /** Helpful vote (optimistic). Return `{ error }` or throw and the vote rolls back. */
  onVoteHelpful?: (reviewId: string, voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Send a report about a review. Turns on Report. */
  onReport?: (reviewId: string, report: { reason: ProductReviewReportReason; note: string }) => ReviewActionResult | Promise<ReviewActionResult>;
  labels?: ProductReviewsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { pageSize: 5, defaultSort: "helpful" });
/** Fires when the star filter, photo chip or verified chip changes. */
const emit = defineEmits<{ "filters-change": [filters: ReviewFilters] }>();

const { t } = useReviewStrings(() => props.labels);
const nq = useNasaq();
const fmt = useFormatNumber();
const uid = useId();
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(nq.locale.value, { dateStyle: "medium" }).format(d);
};

const filters = ref<ReviewFilters>({ ...noReviewFilters });
const sort = ref<ReviewSort>(props.defaultSort);
const visible = ref(props.pageSize);
const votes = ref<Record<string, { voted: boolean; count: number }>>({});
const voteError = ref<string | null>(null);
const writing = ref(false);
const reporting = ref<string | null>(null);
const reported = ref(new Set<string>());
const viewer = ref<number | null>(null);
const expanded = ref(new Set<string>());
const failedThumbs = ref(new Set<string>());

const stats = computed(() => props.summary ?? summarizeReviews(props.reviews));
const fit = computed(() => fitSummary(props.reviews));
const photos = computed(() => collectPhotos(props.reviews));
const photoTotal = computed(() => totalPhotos(props.reviews));
const shown = computed(() => sortReviews(filterReviews(props.reviews, filters.value), sort.value));
const page = computed(() => shown.value.slice(0, visible.value));
const active = computed(() => hasActiveFilters(filters.value));
const errorMessage = computed(() => (props.error ? (typeof props.error === "string" ? props.error : t.value.loadFailed) : null));

function update(next: ReviewFilters) {
  filters.value = next;
  visible.value = props.pageSize;
  emit("filters-change", next);
}

const voteFor = (r: ProductReview) => votes.value[r.id] ?? { voted: false, count: r.helpful ?? 0 };
async function vote(r: ProductReview) {
  const before = voteFor(r);
  const voted = !before.voted;
  voteError.value = null;
  votes.value = { ...votes.value, [r.id]: { voted, count: applyHelpfulVote(before.count, voted) } };
  try {
    const result = await props.onVoteHelpful?.(r.id, voted);
    if (result && typeof result === "object" && result.error) throw new Error(result.error);
  } catch {
    votes.value = { ...votes.value, [r.id]: before };
    voteError.value = t.value.voteFailed;
  }
}

const sortLabels = computed<Record<ReviewSort, string>>(() => ({ helpful: t.value.sortHelpful, newest: t.value.sortNewest, oldest: t.value.sortOldest, highest: t.value.sortHighest, lowest: t.value.sortLowest }));
const sortKeys = ["helpful", "newest", "oldest", "highest", "lowest"] as ReviewSort[];
const REASONS: ProductReviewReportReason[] = ["spam", "offensive", "fake", "irrelevant", "other"];
const reasonLabels = computed<Record<ProductReviewReportReason, string>>(() => ({ spam: t.value.reasonSpam, offensive: t.value.reasonOffensive, fake: t.value.reasonFake, irrelevant: t.value.reasonIrrelevant, other: t.value.reasonOther }));
const fitLabel = (f: "small" | "true" | "large") => (f === "small" ? t.value.fitSmall : f === "true" ? t.value.fitTrue : t.value.fitLarge);

function openPhoto(reviewId: string, src: string) {
  const i = photos.value.findIndex((p) => p.reviewId === reviewId && p.src === src);
  viewer.value = i < 0 ? 0 : i;
}
function toggleExpanded(id: string) {
  const n = new Set(expanded.value);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  expanded.value = n;
}
function actionsFor(r: ProductReview): ContextMenuAction[] {
  const v = voteFor(r);
  const isReported = reported.value.has(r.id);
  return [
    { id: "helpful", label: v.voted ? t.value.helpfulUndo : t.value.helpful, icon: ThumbsUp, onSelect: () => void vote(r), group: "a" },
    ...(props.onReport ? [{ id: "report", label: isReported ? t.value.reported : t.value.report, icon: Flag, onSelect: () => (reporting.value = r.id), disabled: isReported, danger: true, group: "b" }] : []),
  ];
}

// Report dialog state.
const reason = ref<ProductReviewReportReason | undefined>();
const note = ref("");
const reportState = ref<"idle" | "sending" | "done">("idle");
const reportFailure = ref<string | null>(null);
function closeReport(open: boolean) {
  if (open) return;
  reporting.value = null;
  setTimeout(() => {
    reason.value = undefined;
    note.value = "";
    reportState.value = "idle";
    reportFailure.value = null;
  }, 200);
}
async function sendReport() {
  const id = reporting.value;
  if (!reason.value || !id || !props.onReport) return;
  reportState.value = "sending";
  reportFailure.value = null;
  try {
    const result = await props.onReport(id, { reason: reason.value, note: note.value.trim() });
    if (result && typeof result === "object" && result.error) {
      reportFailure.value = result.error;
      reportState.value = "idle";
      return;
    }
    reported.value = new Set(reported.value).add(id);
    reportState.value = "done";
  } catch {
    reportFailure.value = t.value.submitFailed;
    reportState.value = "idle";
  }
}
watch(
  () => props.reviews,
  () => (visible.value = Math.max(visible.value, props.pageSize)),
);
</script>

<template>
  <section data-slot="product-reviews" :aria-labelledby="`${uid}-title`" :class="cn('flex flex-col gap-6', props.class)">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="`${uid}-title`" class="text-h2 text-foreground">{{ t.reviews }}</h2>
      <NqButton v-if="onSubmitReview" type="button" variant="secondary" @click="writing = true">
        <PenLine aria-hidden="true" />
        {{ t.writeReview }}
      </NqButton>
    </header>

    <div v-if="errorMessage" role="alert" class="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-nq-danger-text">
      <p class="flex items-center gap-2 text-body-sm">
        <TriangleAlert aria-hidden="true" class="size-4 shrink-0" />
        {{ errorMessage }}
      </p>
      <NqButton v-if="onRetry" type="button" variant="secondary" size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
    </div>
    <div v-else-if="loading" role="status" :aria-label="t.loading" class="flex flex-col gap-5" aria-busy="true">
      <div class="h-32 animate-pulse rounded-card bg-secondary motion-reduce:animate-none" />
      <div v-for="i in 3" :key="i" class="flex flex-col gap-2">
        <div class="h-4 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        <div class="h-4 w-full animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        <div class="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
      </div>
    </div>
    <div v-else-if="stats.count === 0 && reviews.length === 0" class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-10 text-center">
      <Star aria-hidden="true" class="size-8 text-muted-foreground" />
      <p class="text-h3 text-foreground">{{ t.noReviews }}</p>
      <p class="text-body-sm text-muted-foreground">{{ t.noReviewsHint }}</p>
      <NqButton v-if="onSubmitReview" type="button" variant="primary" class="mt-2" @click="writing = true">
        <PenLine aria-hidden="true" />
        {{ t.writeReview }}
      </NqButton>
    </div>
    <template v-else>
      <NqProductReviewSummary selectable :summary="stats" :selected-stars="filters.stars" :fit="fit" :labels="labels" @toggle-star="(l) => update({ ...filters, stars: toggleStar(filters.stars, l) })" />

      <div v-if="photoTotal > 0" class="flex flex-col gap-2">
        <h3 class="text-label text-foreground">{{ t.photosTitle }}</h3>
        <ul class="flex gap-2 overflow-x-auto pb-1">
          <li v-for="(p, i) in photos.slice(0, 8)" :key="`${p.reviewId}-${p.src}`" class="shrink-0">
            <button type="button" :aria-label="t.viewPhoto" class="relative block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" @click="viewer = i">
              <span v-if="failedThumbs.has(p.src) || !p.src" role="img" :aria-label="p.alt ?? t.viewPhoto" style="width: 72px; height: 72px" class="inline-block bg-secondary size-18 rounded-control" />
              <img v-else :src="p.src" :alt="p.alt ?? t.viewPhoto" width="72" height="72" loading="lazy" class="bg-secondary object-cover size-18 rounded-control" @error="failedThumbs = new Set(failedThumbs).add(p.src)" />
              <span v-if="i === Math.min(photos.length, 8) - 1 && photoTotal > Math.min(photos.length, 8)" class="absolute inset-0 flex items-center justify-center bg-foreground/60 text-label text-background">
                <bdi>{{ t.morePhotos(fmt(photoTotal - Math.min(photos.length, 8))) }}</bdi>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <div role="group" :aria-label="t.filters" class="flex flex-wrap items-center gap-2 border-y border-border py-3">
        <NqSelect :model-value="sort" @update:model-value="(v) => v && (sort = v as ReviewSort)">
          <NqSelectTrigger :aria-label="t.sort" class="w-auto min-w-40">
            <NqSelectValue />
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="k in sortKeys" :key="k" :value="k">{{ sortLabels[k] }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <button
          v-for="chip in [{ key: 'withPhotos', label: t.withPhotos, icon: false }, { key: 'verifiedOnly', label: t.verifiedOnly, icon: true }] as const"
          :key="chip.key"
          type="button"
          :aria-pressed="Boolean(filters[chip.key])"
          :data-pressed="filters[chip.key] ? '' : undefined"
          :class="cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-label outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
            filters[chip.key] ? 'border-foreground bg-nq-selected text-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover',
          )"
          @click="update({ ...filters, [chip.key]: !filters[chip.key] })"
        >
          <BadgeCheck v-if="chip.icon" aria-hidden="true" class="size-3.5" />
          {{ chip.label }}
        </button>
        <button
          v-for="level in filters.stars"
          :key="level"
          type="button"
          data-star-pill
          :aria-label="t.filterByStars(fmt(level), fmt(stats.histogram[level]))"
          class="inline-flex h-8 items-center gap-1 rounded-full border border-foreground bg-nq-selected px-3 text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          @click="update({ ...filters, stars: toggleStar(filters.stars, level) })"
        >
          <bdi>{{ fmt(level) }}</bdi>
          <Star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
          <X aria-hidden="true" class="size-3.5" />
        </button>
        <NqButton v-if="active" type="button" variant="link" size="sm" @click="update({ ...noReviewFilters })">{{ t.clearFilters }}</NqButton>
      </div>

      <p role="status" aria-live="polite" class="text-caption text-muted-foreground">
        {{ t.showing(fmt(Math.min(visible, shown.length)), fmt(shown.length)) }}
        <span v-if="voteError" class="ms-2 text-nq-danger-text">{{ voteError }}</span>
      </p>

      <div v-if="shown.length === 0" class="flex flex-col items-center gap-3 py-8 text-center">
        <p class="text-body text-muted-foreground">{{ t.noMatches }}</p>
        <NqButton type="button" variant="secondary" size="sm" @click="update({ ...noReviewFilters })">{{ t.clearFilters }}</NqButton>
      </div>
      <ul v-else class="flex flex-col divide-y divide-border">
        <NqContextMenuActions v-for="r in page" :key="r.id" as="li" :data-review-id="r.id" :actions="actionsFor(r)" class="flex flex-col gap-2 py-5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <NqRating :value="r.rating" />
            <NqBadge v-if="r.verified" variant="success">
              <BadgeCheck aria-hidden="true" />
              {{ t.verified }}
            </NqBadge>
          </div>
          <h3 v-if="r.title" class="text-h3 text-foreground">{{ r.title }}</h3>
          <p class="text-caption text-muted-foreground">
            {{ r.author }} · <time :datetime="r.date">{{ formatDate(r.date) }}</time>
            <template v-if="r.variantLabel"> · {{ t.boughtVariant(r.variantLabel) }}</template>
            <template v-if="r.fit"> · {{ t.fitLabel }}: {{ fitLabel(r.fit) }}</template>
          </p>
          <p :class="cn('whitespace-pre-line text-body text-foreground', r.body.length > 220 && !expanded.has(r.id) && 'line-clamp-4')">{{ r.body }}</p>
          <button
            v-if="r.body.length > 220"
            type="button"
            :aria-expanded="expanded.has(r.id)"
            class="self-start text-label text-nq-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="toggleExpanded(r.id)"
          >
            {{ expanded.has(r.id) ? t.readLess : t.readMore }}
          </button>
          <ul v-if="r.photos && r.photos.length > 0" class="flex flex-wrap gap-2">
            <li v-for="p in r.photos" :key="p.src">
              <button type="button" :aria-label="t.viewPhoto" class="block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" @click="openPhoto(r.id, p.src)">
                <span v-if="failedThumbs.has(p.src) || !p.src" role="img" :aria-label="p.alt ?? t.viewPhoto" style="width: 64px; height: 64px" class="inline-block bg-secondary size-16" />
                <img v-else :src="p.src" :alt="p.alt ?? t.viewPhoto" width="64" height="64" loading="lazy" class="bg-secondary object-cover size-16" @error="failedThumbs = new Set(failedThumbs).add(p.src)" />
              </button>
            </li>
          </ul>
          <div v-if="r.reply" class="ms-4 flex flex-col gap-1 border-s-2 border-nq-line-strong ps-3">
            <p class="flex items-center gap-1.5 text-label text-foreground">
              <MessageSquareReply aria-hidden="true" class="size-4 text-muted-foreground" />
              {{ t.sellerReply }}
            </p>
            <p class="text-body-sm text-foreground">{{ r.reply.body }}</p>
            <p class="text-caption text-muted-foreground">{{ r.reply.author }} · <time :datetime="r.reply.date">{{ formatDate(r.reply.date) }}</time></p>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <NqButton type="button" :variant="voteFor(r).voted ? 'secondary' : 'ghost'" size="sm" :aria-pressed="voteFor(r).voted" @click="vote(r)">
              <ThumbsUp aria-hidden="true" />
              {{ t.helpfulCount(fmt(voteFor(r).count)) }}
            </NqButton>
            <NqButton v-if="onReport" type="button" variant="ghost" size="sm" :disabled="reported.has(r.id)" @click="reporting = r.id">
              <Flag aria-hidden="true" />
              {{ reported.has(r.id) ? t.reported : t.report }}
            </NqButton>
          </div>
        </NqContextMenuActions>
      </ul>

      <NqButton v-if="shown.length > visible" type="button" variant="secondary" class="self-center" @click="visible += pageSize">{{ t.showMore }}</NqButton>
    </template>

    <NqDialog v-if="onSubmitReview" :open="writing" @update:open="(o) => (writing = o)">
      <NqDialogContent class="max-h-[90dvh] overflow-y-auto">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.formTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.formDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <NqProductReviewForm v-bind="formProps" cancelable :labels="labels" :on-submit="onSubmitReview" @cancel="writing = false" />
      </NqDialogContent>
    </NqDialog>

    <NqDialog v-if="onReport" :open="reporting !== null" @update:open="closeReport">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.reportTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.reportDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <div v-if="reportState === 'done'" class="flex flex-col items-center gap-4 py-4">
          <p role="status" class="text-body text-foreground">{{ t.reportThanks }}</p>
          <NqButton type="button" variant="secondary" @click="closeReport(false)">{{ t.cancel }}</NqButton>
        </div>
        <div v-else class="flex flex-col gap-4">
          <span :id="`${uid}-reason`" class="text-label text-foreground">{{ t.reportReason }}</span>
          <RadioGroupRoot :model-value="reason" :aria-labelledby="`${uid}-reason`" class="flex flex-col gap-1" @update:model-value="(v) => (reason = v as ProductReviewReportReason)">
            <label v-for="k in REASONS" :key="k" class="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground hover:bg-nq-hover">
              <RadioGroupItem :value="k" :data-checked="reason === k ? '' : undefined" class="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-checked:border-foreground">
                <RadioGroupIndicator class="size-2 rounded-full bg-foreground" />
              </RadioGroupItem>
              {{ reasonLabels[k] }}
            </label>
          </RadioGroupRoot>
          <label class="flex flex-col gap-1.5">
            <span class="text-label text-foreground">{{ t.reportNote }}</span>
            <NqTextarea v-model="note" :rows="3" />
          </label>
          <p v-if="reportFailure" role="alert" class="text-body-sm text-nq-danger-text">{{ reportFailure }}</p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <NqButton type="button" variant="ghost" @click="closeReport(false)">{{ t.cancel }}</NqButton>
            <NqButton type="button" variant="danger" :disabled="!reason" :loading="reportState === 'sending'" @click="sendReport">{{ t.reportSend }}</NqButton>
          </div>
        </div>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="viewer !== null" @update:open="(o) => !o && (viewer = null)">
      <NqDialogContent class="max-w-2xl">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.photosTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ viewer !== null ? t.photoOf(fmt(viewer + 1), fmt(photos.length)) : "" }}</NqDialogDescription>
        </NqDialogHeader>
        <div v-if="viewer !== null && photos[viewer]" class="flex items-center gap-2">
          <NqButton type="button" variant="ghost" size="icon" :aria-label="t.prevPhoto" :disabled="viewer === 0" @click="viewer = viewer! - 1">
            <ChevronLeft aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
          <div class="flex min-w-0 flex-1 justify-center">
            <img :key="photos[viewer]!.src" :src="photos[viewer]!.src" :alt="photos[viewer]!.alt ?? t.viewPhoto" width="640" height="640" class="aspect-square max-h-[60dvh] w-full rounded-card bg-secondary object-contain" />
          </div>
          <NqButton type="button" variant="ghost" size="icon" :aria-label="t.nextPhoto" :disabled="viewer >= photos.length - 1" @click="viewer = viewer! + 1">
            <ChevronRight aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
        </div>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
