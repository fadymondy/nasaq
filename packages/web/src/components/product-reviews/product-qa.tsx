"use client";

import { ArrowUp, BadgeCheck, MessageCircleQuestion, Search } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Textarea } from "../field";
import { useFormatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import {
  orderAnswers,
  type ProductAnswer,
  type ProductQuestion,
  type QuestionSort,
  searchQuestions,
  sortQuestions,
  validateAnswer,
  validateQuestion,
} from "./review-logic";
import { type ProductReviewsLabels, type ReviewActionResult, useReviewStrings } from "./review-strings";

export interface ProductQAProps extends Omit<ComponentProps<"section">, "children"> {
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
}

const fail = (r: ReviewActionResult) => (r && typeof r === "object" && r.error ? r.error : null);

function Upvote({ voted, count, onClick, label }: { voted: boolean; count: number; onClick: () => void; label: string }) {
  const fmt = useFormatNumber();
  return (
    <Button type="button" variant={voted ? "secondary" : "ghost"} size="sm" aria-pressed={voted} aria-label={label} onClick={onClick}>
      <ArrowUp aria-hidden />
      <bdi className="tabular-nums">{fmt(count)}</bdi>
    </Button>
  );
}

/**
 * Questions and answers for a product: an ask form, search and sort, upvotes on questions and answers, seller answers
 * first, and an answer form under each question. All writes go through callbacks and update optimistically.
 */
export function ProductQA({
  questions,
  answersShown = 2,
  pageSize = 5,
  defaultSort = "votes",
  onAsk,
  onAnswer,
  onVoteQuestion,
  onVoteAnswer,
  loading,
  error,
  onRetry,
  labels,
  className,
  ...props
}: ProductQAProps) {
  const { t, locale } = useReviewStrings(labels);
  const fmt = useFormatNumber();
  const uid = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<QuestionSort>(defaultSort);
  const [visible, setVisible] = useState(pageSize);
  const [ask, setAsk] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [askState, setAskState] = useState<"idle" | "sending" | "done">("idle");
  const [votes, setVotes] = useState<Record<string, { voted: boolean; count: number }>>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});
  const [answerError, setAnswerError] = useState<Record<string, string | null>>({});
  const [answerBusy, setAnswerBusy] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const date = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
  };
  const shown = useMemo(() => sortQuestions(searchQuestions(questions, query), sort), [questions, query, sort]);
  const sortLabels: Record<QuestionSort, string> = { votes: t.sortVotes, newest: t.sortNewest, answered: t.sortAnswered };

  const castVote = async (key: string, base: number, run?: (voted: boolean) => ReviewActionResult | Promise<ReviewActionResult>) => {
    const before = votes[key] ?? { voted: false, count: base };
    const voted = !before.voted;
    setVoteError(null);
    setVotes((v) => ({ ...v, [key]: { voted, count: Math.max(0, before.count + (voted ? 1 : -1)) } }));
    try {
      if (fail(await run?.(voted))) throw new Error("vote");
    } catch {
      setVotes((v) => ({ ...v, [key]: before }));
      setVoteError(t.voteFailed);
    }
  };

  const submitAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateQuestion(ask);
    if (problem) return setAskError(t.questionErrors[problem]);
    setAskError(null);
    setAskState("sending");
    try {
      const message = fail(await onAsk?.(ask.trim()));
      if (message) {
        setAskError(message);
        setAskState("idle");
        return;
      }
      setAsk("");
      setAskState("done");
    } catch {
      setAskError(t.submitFailed);
      setAskState("idle");
    }
  };

  const submitAnswer = async (q: ProductQuestion) => {
    const text = answerDraft[q.id] ?? "";
    const problem = validateAnswer(text);
    if (problem) return setAnswerError((e) => ({ ...e, [q.id]: problem === "answer-required" ? t.answerRequired : t.errors["body-too-long"] }));
    setAnswerError((e) => ({ ...e, [q.id]: null }));
    setAnswerBusy(q.id);
    try {
      const message = fail(await onAnswer?.(q.id, text.trim()));
      if (message) setAnswerError((e) => ({ ...e, [q.id]: message }));
      else setAnswerDraft((d) => ({ ...d, [q.id]: "" }));
    } catch {
      setAnswerError((e) => ({ ...e, [q.id]: t.submitFailed }));
    }
    setAnswerBusy(null);
  };

  const errorMessage = error ? (typeof error === "string" ? error : t.loadFailed) : null;

  return (
    <section data-slot="product-qa" aria-labelledby={`${uid}-title`} className={cn("flex flex-col gap-5", className)} {...props}>
      <header className="flex flex-col gap-1">
        <h2 id={`${uid}-title`} className="text-h2 text-foreground">
          {t.qaTitle}
        </h2>
        <p className="text-caption text-muted-foreground">{t.qaCount(fmt(questions.length), questions.length)}</p>
      </header>

      {onAsk && (
        <form noValidate onSubmit={submitAsk} className="flex flex-col gap-2">
          <label htmlFor={`${uid}-ask`} className="text-label text-foreground">
            {t.askTitle}
          </label>
          <Textarea id={`${uid}-ask`} value={ask} rows={2} placeholder={t.askPlaceholder} aria-invalid={askError ? true : undefined} aria-describedby={askError ? `${uid}-ask-error` : undefined} onChange={(e) => { setAsk(e.target.value); if (askState === "done") setAskState("idle"); }} />
          {askError && (
            <p id={`${uid}-ask-error`} role="alert" className="text-caption text-nq-danger-text">
              {askError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p role="status" className="text-caption text-nq-success-text">
              {askState === "done" ? t.askThanks : ""}
            </p>
            <Button type="submit" variant="primary" loading={askState === "sending"}>
              {askState === "sending" ? t.asking : t.askSubmit}
            </Button>
          </div>
        </form>
      )}

      {errorMessage ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-body-sm text-nq-danger-text">
          {errorMessage}
          {onRetry && (
            <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          )}
        </div>
      ) : loading ? (
        <div role="status" aria-busy="true" aria-label={t.loading} className="flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-8 text-center">
          <MessageCircleQuestion aria-hidden className="size-8 text-muted-foreground" />
          <p className="text-h3 text-foreground">{t.noQuestions}</p>
          <p className="text-body-sm text-muted-foreground">{t.noQuestionsHint}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                aria-label={t.searchQuestions}
                placeholder={t.searchQuestions}
                onChange={(e) => { setQuery(e.target.value); setVisible(pageSize); }}
                className="h-control w-full rounded-control border border-border bg-card ps-9 pe-3 text-body outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
              />
            </div>
            <Select value={sort} onValueChange={(v) => v && setSort(v as QuestionSort)}>
              <SelectTrigger aria-label={t.sortQuestions} className="w-auto min-w-40">
                <SelectValue>{sortLabels[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as QuestionSort[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {sortLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {t.qaCount(fmt(shown.length), shown.length)}
            {voteError}
          </p>
          {voteError && <p className="text-caption text-nq-danger-text">{voteError}</p>}

          {shown.length === 0 ? (
            <p className="py-6 text-center text-body text-muted-foreground">{t.noQuestionMatches}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {shown.slice(0, visible).map((q) => {
                const qv = votes[q.id] ?? { voted: false, count: q.votes ?? 0 };
                const answers = orderAnswers(q.answers);
                const all = open.has(q.id);
                const list: ProductAnswer[] = all ? answers : answers.slice(0, answersShown);
                return (
                  <li key={q.id} className="flex flex-col gap-3 py-5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-h3 text-foreground">{q.question}</h3>
                        <p className="text-caption text-muted-foreground">
                          {t.askedBy(q.author)} · <time dateTime={q.date}>{date(q.date)}</time> · {t.answers(fmt(q.answers.length), q.answers.length)}
                        </p>
                      </div>
                      <Upvote voted={qv.voted} count={qv.count} label={`${qv.voted ? t.upvoted : t.upvote}: ${t.upvoteCount(fmt(qv.count), qv.count)}`} onClick={() => void castVote(q.id, q.votes ?? 0, onVoteQuestion ? (v) => onVoteQuestion(q.id, v) : undefined)} />
                    </div>
                    {answers.length === 0 ? (
                      <p className="text-body-sm text-muted-foreground">{t.noAnswers}</p>
                    ) : (
                      <ul className="flex flex-col gap-3 ps-4">
                        {list.map((a) => {
                          const key = `${q.id}:${a.id}`;
                          const av = votes[key] ?? { voted: false, count: a.votes ?? 0 };
                          return (
                            <li key={a.id} className="flex items-start gap-3 border-s-2 border-border ps-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-body text-foreground">{a.body}</p>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                                  {a.seller && (
                                    <Badge variant="brand">
                                      <BadgeCheck aria-hidden />
                                      {t.fromSeller}
                                    </Badge>
                                  )}
                                  <span>
                                    {a.author} · <time dateTime={a.date}>{date(a.date)}</time>
                                  </span>
                                </p>
                              </div>
                              <Upvote voted={av.voted} count={av.count} label={`${av.voted ? t.upvoted : t.upvote}: ${t.upvoteCount(fmt(av.count), av.count)}`} onClick={() => void castVote(key, a.votes ?? 0, onVoteAnswer ? (v) => onVoteAnswer(q.id, a.id, v) : undefined)} />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {answers.length > answersShown && (
                      <button
                        type="button"
                        aria-expanded={all}
                        onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
                        className="self-start ps-4 text-label text-nq-accent-text outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
                      >
                        {all ? t.hideAnswers : t.showAnswers(fmt(answers.length - answersShown), answers.length - answersShown)}
                      </button>
                    )}
                    {onAnswer && (
                      <div className="flex flex-col gap-2 ps-4">
                        <Textarea
                          rows={2}
                          aria-label={`${t.answer}: ${q.question}`}
                          placeholder={t.answerPlaceholder}
                          value={answerDraft[q.id] ?? ""}
                          aria-invalid={answerError[q.id] ? true : undefined}
                          onChange={(e) => setAnswerDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                        />
                        {answerError[q.id] && (
                          <p role="alert" className="text-caption text-nq-danger-text">
                            {answerError[q.id]}
                          </p>
                        )}
                        <Button type="button" variant="secondary" size="sm" className="self-end" loading={answerBusy === q.id} onClick={() => void submitAnswer(q)}>
                          {t.answerSubmit}
                        </Button>
                      </div>
                    )}
                  </li>
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
    </section>
  );
}
