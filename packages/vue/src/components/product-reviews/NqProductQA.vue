<script setup lang="ts">
import { ArrowUp, BadgeCheck, MessageCircleQuestion, Search } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqTextarea } from "../field";
import { useFormatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { useReviewStrings, type ProductReviewsLabels, type ReviewActionResult } from "./labels";
import { orderAnswers, searchQuestions, sortQuestions, validateAnswer, validateQuestion, type ProductQuestion, type QuestionSort } from "./review-logic";

// Questions and answers for a product: an ask form, search and sort, upvotes on questions and answers, seller answers first,
// and an answer form under each question. All writes go through callbacks and update optimistically.
interface Props {
  questions: readonly ProductQuestion[];
  /** Answers shown under a question before "show more". */
  answersShown?: number;
  /** Questions per page. */
  pageSize?: number;
  defaultSort?: QuestionSort;
  /** Turns on the ask form. */
  onAsk?: (question: string) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Turns on the answer form under each question. */
  onAnswer?: (questionId: string, answer: string) => ReviewActionResult | Promise<ReviewActionResult>;
  onVoteQuestion?: (questionId: string, voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>;
  onVoteAnswer?: (questionId: string, answerId: string, voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>;
  loading?: boolean;
  error?: string | boolean;
  onRetry?: () => void;
  labels?: ProductReviewsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { answersShown: 2, pageSize: 5, defaultSort: "votes" });

const { t } = useReviewStrings(() => props.labels);
const nq = useNasaq();
const fmt = useFormatNumber();
const uid = useId();
const query = ref("");
const sort = ref<QuestionSort>(props.defaultSort);
const visible = ref(props.pageSize);
const ask = ref("");
const askError = ref<string | null>(null);
const askState = ref<"idle" | "sending" | "done">("idle");
const votes = ref<Record<string, { voted: boolean; count: number }>>({});
const open = ref(new Set<string>());
const answerDraft = ref<Record<string, string>>({});
const answerError = ref<Record<string, string | null>>({});
const answerBusy = ref<string | null>(null);
const voteError = ref<string | null>(null);

const fail = (r: ReviewActionResult) => (r && typeof r === "object" && r.error ? r.error : null);
const date = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(nq.locale.value, { dateStyle: "medium" }).format(d);
};
const shown = computed(() => sortQuestions(searchQuestions(props.questions, query.value), sort.value));
const sortLabels = computed<Record<QuestionSort, string>>(() => ({ votes: t.value.sortVotes, newest: t.value.sortNewest, answered: t.value.sortAnswered }));
const sortKeys: QuestionSort[] = ["votes", "newest", "answered"];
const errorMessage = computed(() => (props.error ? (typeof props.error === "string" ? props.error : t.value.loadFailed) : null));
const voteOf = (key: string, base: number) => votes.value[key] ?? { voted: false, count: base };
const upvoteLabel = (v: { voted: boolean; count: number }) => `${v.voted ? t.value.upvoted : t.value.upvote}: ${t.value.upvoteCount(fmt(v.count), v.count)}`;

async function castVote(key: string, base: number, run?: (voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>) {
  const before = voteOf(key, base);
  const voted = !before.voted;
  voteError.value = null;
  votes.value = { ...votes.value, [key]: { voted, count: Math.max(0, before.count + (voted ? 1 : -1)) } };
  try {
    if (fail(await run?.(voted))) throw new Error("vote");
  } catch {
    votes.value = { ...votes.value, [key]: before };
    voteError.value = t.value.voteFailed;
  }
}

async function submitAsk() {
  const problem = validateQuestion(ask.value);
  if (problem) {
    askError.value = t.value.questionErrors[problem];
    return;
  }
  askError.value = null;
  askState.value = "sending";
  try {
    const message = fail(await props.onAsk?.(ask.value.trim()));
    if (message) {
      askError.value = message;
      askState.value = "idle";
      return;
    }
    ask.value = "";
    askState.value = "done";
  } catch {
    askError.value = t.value.submitFailed;
    askState.value = "idle";
  }
}

async function submitAnswer(q: ProductQuestion) {
  const text = answerDraft.value[q.id] ?? "";
  const problem = validateAnswer(text);
  if (problem) {
    answerError.value = { ...answerError.value, [q.id]: problem === "answer-required" ? t.value.answerRequired : t.value.errors["body-too-long"] };
    return;
  }
  answerError.value = { ...answerError.value, [q.id]: null };
  answerBusy.value = q.id;
  try {
    const message = fail(await props.onAnswer?.(q.id, text.trim()));
    if (message) answerError.value = { ...answerError.value, [q.id]: message };
    else answerDraft.value = { ...answerDraft.value, [q.id]: "" };
  } catch {
    answerError.value = { ...answerError.value, [q.id]: t.value.submitFailed };
  }
  answerBusy.value = null;
}

function toggleOpen(id: string) {
  const n = new Set(open.value);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  open.value = n;
}
</script>

<template>
  <section data-slot="product-qa" :aria-labelledby="`${uid}-title`" :class="cn('flex flex-col gap-5', props.class)">
    <header class="flex flex-col gap-1">
      <h2 :id="`${uid}-title`" class="text-h2 text-foreground">{{ t.qaTitle }}</h2>
      <p class="text-caption text-muted-foreground">{{ t.qaCount(fmt(questions.length), questions.length) }}</p>
    </header>

    <form v-if="onAsk" novalidate class="flex flex-col gap-2" @submit.prevent="submitAsk">
      <label :for="`${uid}-ask`" class="text-label text-foreground">{{ t.askTitle }}</label>
      <NqTextarea
        :id="`${uid}-ask`"
        :model-value="ask"
        :rows="2"
        :placeholder="t.askPlaceholder"
        :aria-invalid="askError ? true : undefined"
        :aria-describedby="askError ? `${uid}-ask-error` : undefined"
        @update:model-value="(v) => ((ask = v ?? ''), askState === 'done' && (askState = 'idle'))"
      />
      <p v-if="askError" :id="`${uid}-ask-error`" role="alert" class="text-caption text-nq-danger-text">{{ askError }}</p>
      <div class="flex items-center justify-between gap-3">
        <p role="status" class="text-caption text-nq-success-text">{{ askState === "done" ? t.askThanks : "" }}</p>
        <NqButton type="submit" variant="primary" :loading="askState === 'sending'">{{ askState === "sending" ? t.asking : t.askSubmit }}</NqButton>
      </div>
    </form>

    <div v-if="errorMessage" role="alert" class="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-body-sm text-nq-danger-text">
      {{ errorMessage }}
      <NqButton v-if="onRetry" type="button" variant="secondary" size="sm" @click="onRetry()">{{ t.retry }}</NqButton>
    </div>
    <div v-else-if="loading" role="status" aria-busy="true" :aria-label="t.loading" class="flex flex-col gap-4">
      <div v-for="i in 2" :key="i" class="flex flex-col gap-2">
        <div class="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
      </div>
    </div>
    <div v-else-if="questions.length === 0" class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-8 text-center">
      <MessageCircleQuestion aria-hidden="true" class="size-8 text-muted-foreground" />
      <p class="text-h3 text-foreground">{{ t.noQuestions }}</p>
      <p class="text-body-sm text-muted-foreground">{{ t.noQuestionsHint }}</p>
    </div>
    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative min-w-48 flex-1">
          <Search aria-hidden="true" class="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            :value="query"
            :aria-label="t.searchQuestions"
            :placeholder="t.searchQuestions"
            class="h-control w-full rounded-control border border-border bg-card ps-9 pe-3 text-body outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
            @input="(e) => ((query = (e.target as HTMLInputElement).value), (visible = pageSize))"
          />
        </div>
        <NqSelect :model-value="sort" @update:model-value="(v) => v && (sort = v as QuestionSort)">
          <NqSelectTrigger :aria-label="t.sortQuestions" class="w-auto min-w-40">
            <NqSelectValue />
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="k in sortKeys" :key="k" :value="k">{{ sortLabels[k] }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </div>
      <p role="status" aria-live="polite" class="sr-only">{{ t.qaCount(fmt(shown.length), shown.length) }}{{ voteError }}</p>
      <p v-if="voteError" class="text-caption text-nq-danger-text">{{ voteError }}</p>

      <p v-if="shown.length === 0" class="py-6 text-center text-body text-muted-foreground">{{ t.noQuestionMatches }}</p>
      <ul v-else class="flex flex-col divide-y divide-border">
        <li v-for="q in shown.slice(0, visible)" :key="q.id" :data-question-id="q.id" class="flex flex-col gap-3 py-5">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-h3 text-foreground">{{ q.question }}</h3>
              <p class="text-caption text-muted-foreground">
                {{ t.askedBy(q.author) }} · <time :datetime="q.date">{{ date(q.date) }}</time> · {{ t.answers(fmt(q.answers.length), q.answers.length) }}
              </p>
            </div>
            <NqButton type="button" :variant="voteOf(q.id, q.votes ?? 0).voted ? 'secondary' : 'ghost'" size="sm" :aria-pressed="voteOf(q.id, q.votes ?? 0).voted" :aria-label="upvoteLabel(voteOf(q.id, q.votes ?? 0))" @click="castVote(q.id, q.votes ?? 0, onVoteQuestion ? (v) => onVoteQuestion!(q.id, v) : undefined)">
              <ArrowUp aria-hidden="true" />
              <bdi class="tabular-nums">{{ fmt(voteOf(q.id, q.votes ?? 0).count) }}</bdi>
            </NqButton>
          </div>
          <p v-if="q.answers.length === 0" class="text-body-sm text-muted-foreground">{{ t.noAnswers }}</p>
          <ul v-else class="flex flex-col gap-3 ps-4">
            <li v-for="a in open.has(q.id) ? orderAnswers(q.answers) : orderAnswers(q.answers).slice(0, answersShown)" :key="a.id" class="flex items-start gap-3 border-s-2 border-border ps-3">
              <div class="min-w-0 flex-1">
                <p class="text-body text-foreground">{{ a.body }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                  <NqBadge v-if="a.seller" variant="brand">
                    <BadgeCheck aria-hidden="true" />
                    {{ t.fromSeller }}
                  </NqBadge>
                  <span>{{ a.author }} · <time :datetime="a.date">{{ date(a.date) }}</time></span>
                </p>
              </div>
              <NqButton type="button" :variant="voteOf(`${q.id}:${a.id}`, a.votes ?? 0).voted ? 'secondary' : 'ghost'" size="sm" :aria-pressed="voteOf(`${q.id}:${a.id}`, a.votes ?? 0).voted" :aria-label="upvoteLabel(voteOf(`${q.id}:${a.id}`, a.votes ?? 0))" @click="castVote(`${q.id}:${a.id}`, a.votes ?? 0, onVoteAnswer ? (v) => onVoteAnswer!(q.id, a.id, v) : undefined)">
                <ArrowUp aria-hidden="true" />
                <bdi class="tabular-nums">{{ fmt(voteOf(`${q.id}:${a.id}`, a.votes ?? 0).count) }}</bdi>
              </NqButton>
            </li>
          </ul>
          <button
            v-if="q.answers.length > answersShown"
            type="button"
            :aria-expanded="open.has(q.id)"
            class="self-start ps-4 text-label text-nq-accent-text outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="toggleOpen(q.id)"
          >
            {{ open.has(q.id) ? t.hideAnswers : t.showAnswers(fmt(q.answers.length - answersShown), q.answers.length - answersShown) }}
          </button>
          <div v-if="onAnswer" class="flex flex-col gap-2 ps-4">
            <NqTextarea
              :rows="2"
              :aria-label="`${t.answer}: ${q.question}`"
              :placeholder="t.answerPlaceholder"
              :model-value="answerDraft[q.id] ?? ''"
              :aria-invalid="answerError[q.id] ? true : undefined"
              @update:model-value="(v) => (answerDraft = { ...answerDraft, [q.id]: v ?? '' })"
            />
            <p v-if="answerError[q.id]" role="alert" class="text-caption text-nq-danger-text">{{ answerError[q.id] }}</p>
            <NqButton type="button" variant="secondary" size="sm" class="self-end" :loading="answerBusy === q.id" @click="submitAnswer(q)">{{ t.answerSubmit }}</NqButton>
          </div>
        </li>
      </ul>
      <NqButton v-if="shown.length > visible" type="button" variant="secondary" class="self-center" @click="visible += pageSize">{{ t.showMore }}</NqButton>
    </template>
  </section>
</template>
