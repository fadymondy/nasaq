// nqProductReviews, nqProductReviewForm, nqProductQA and nqProductReviewSummary: the reviews block of a product page (summary with a
// filtering histogram, sort and filter chips, photo strip with a viewer, helpful votes, report, a write-a-review form) and the
// questions and answers block. The markup is the React one, rendered by Blade as templates this module fills from the `reviews` /
// `questions` JSON; the filter, sort, vote and validation logic and the en/ar copy are packages/web's (review-logic.ts and
// review-strings.ts), copied below.
//
//   <section data-slot="product-reviews" x-data="nqProductReviews({ reviews, pageSize: 5, canSubmit: true, canReport: true })"
//            x-on:nq-vote="$event.detail.waitUntil(api.vote($event.detail.id, $event.detail.voted))" …>
//
// Events dispatched from the root, each with waitUntil(promise): nq-vote { id, voted }, nq-report { id, reason, note },
// nq-review { review }, nq-ask { question }, nq-answer { questionId, answer }, nq-vote-question { questionId, voted },
// nq-vote-answer { questionId, answerId, voted }. Resolve nothing for success or { error } to roll back and show a message; a
// rejection shows the generic error. Also nq-filters { stars, withPhotos, verifiedOnly } and nq-review-sent (no waitUntil).

import type { Magics, Register } from "./types";

/* The review and Q&A data types (the shared commerce model of packages/web, declared here because the Vue package has no lib/commerce). */
export type ReviewFit = "small" | "true" | "large";
export interface ReviewPhoto {
  src: string;
  alt?: string;
}
export interface ProductReview {
  id: string;
  author: string;
  /** 1 to 5. */
  rating: number;
  title?: string;
  body: string;
  /** ISO date. */
  date: string;
  /** Bought this product from the store. */
  verified?: boolean;
  photos?: readonly ReviewPhoto[];
  /** Helpful votes from other shoppers. */
  helpful?: number;
  /** The variant they bought, e.g. "Black · M". */
  variantLabel?: string;
  fit?: ReviewFit;
  reply?: { author: string; body: string; date: string };
}
export interface ProductAnswer {
  id: string;
  author: string;
  body: string;
  date: string;
  /** Answered by the store or brand. */
  seller?: boolean;
  votes?: number;
}
export interface ProductQuestion {
  id: string;
  author: string;
  question: string;
  date: string;
  votes?: number;
  answers: readonly ProductAnswer[];
}

export const STAR_LEVELS = [5, 4, 3, 2, 1] as const;
export type StarLevel = (typeof STAR_LEVELS)[number];

export interface ReviewSummary {
  average: number;
  count: number;
  /** Reviews per star level. */
  histogram: Record<StarLevel, number>;
}

const emptyHistogram = (): Record<StarLevel, number> => ({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

/** Rounds to a valid star level, or 0 for junk. */
export function starLevel(rating: number): 0 | StarLevel {
  const r = Math.round(rating);
  return r >= 1 && r <= 5 ? (r as StarLevel) : 0;
}

/** Counts, total and average (one decimal, rounded half up) from a list of reviews. */
export function summarizeReviews(reviews: readonly Pick<ProductReview, "rating">[]): ReviewSummary {
  const histogram = emptyHistogram();
  let sum = 0;
  let count = 0;
  for (const review of reviews) {
    const level = starLevel(review.rating);
    if (!level) continue;
    histogram[level]++;
    sum += level;
    count++;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, histogram };
}

/** Share of a level as a whole percent of `count`. The five shares of a full histogram may not add to exactly 100. */
export function histogramPercent(histogram: Record<StarLevel, number>, level: StarLevel, count?: number): number {
  const total = count ?? STAR_LEVELS.reduce((n, l) => n + histogram[l], 0);
  return total > 0 ? Math.round((histogram[level] / total) * 100) : 0;
}

export type ReviewSort = "helpful" | "newest" | "oldest" | "highest" | "lowest";

export interface ReviewFilters {
  /** Show only these star levels. Empty or omitted = all. */
  stars?: readonly StarLevel[];
  withPhotos?: boolean;
  verifiedOnly?: boolean;
  /** Case-insensitive text search in title, body and author. */
  query?: string;
}

export const noReviewFilters: ReviewFilters = { stars: [], withPhotos: false, verifiedOnly: false, query: "" };

export function hasActiveFilters(filters: ReviewFilters): boolean {
  return Boolean(filters.stars?.length || filters.withPhotos || filters.verifiedOnly || filters.query?.trim());
}

/** Toggles one star level in a filter list, keeping the display order 5..1. */
export function toggleStar(stars: readonly StarLevel[] | undefined, level: StarLevel): StarLevel[] {
  const set = new Set(stars ?? []);
  if (set.has(level)) set.delete(level);
  else set.add(level);
  return STAR_LEVELS.filter((l) => set.has(l));
}

export function filterReviews<R extends ProductReview>(reviews: readonly R[], filters: ReviewFilters): R[] {
  const stars = filters.stars?.length ? new Set<number>(filters.stars) : null;
  const q = filters.query?.trim().toLowerCase();
  return reviews.filter((r) => {
    if (stars && !stars.has(starLevel(r.rating))) return false;
    if (filters.withPhotos && !r.photos?.length) return false;
    if (filters.verifiedOnly && !r.verified) return false;
    if (q && !`${r.title ?? ""} ${r.body} ${r.author}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const time = (iso: string) => {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
};

/** A stable sort: ties keep their incoming order. The list is copied. */
export function sortReviews<R extends ProductReview>(reviews: readonly R[], sort: ReviewSort): R[] {
  const key: Record<ReviewSort, (a: R, b: R) => number> = {
    helpful: (a, b) => (b.helpful ?? 0) - (a.helpful ?? 0) || time(b.date) - time(a.date),
    newest: (a, b) => time(b.date) - time(a.date),
    oldest: (a, b) => time(a.date) - time(b.date),
    highest: (a, b) => b.rating - a.rating || (b.helpful ?? 0) - (a.helpful ?? 0),
    lowest: (a, b) => a.rating - b.rating || (b.helpful ?? 0) - (a.helpful ?? 0),
  };
  return reviews.map((r, i) => [r, i] as const).sort((a, b) => key[sort](a[0], b[0]) || a[1] - b[1]).map(([r]) => r);
}

/** Photos from all reviews (newest reviews first), each tagged with its review, capped at `limit`. */
export function collectPhotos(reviews: readonly ProductReview[], limit = Infinity): { reviewId: string; src: string; alt?: string }[] {
  const out: { reviewId: string; src: string; alt?: string }[] = [];
  for (const r of sortReviews(reviews, "newest"))
    for (const p of r.photos ?? []) {
      if (out.length >= limit) return out;
      out.push({ reviewId: r.id, src: p.src, ...(p.alt ? { alt: p.alt } : {}) });
    }
  return out;
}

export function totalPhotos(reviews: readonly ProductReview[]): number {
  return reviews.reduce((n, r) => n + (r.photos?.length ?? 0), 0);
}

/** Share of reviewers who said it runs small, true to size or large, in whole percent, out of those who said. */
export function fitSummary(reviews: readonly Pick<ProductReview, "fit">[]): { answered: number; small: number; true: number; large: number } {
  const counts = { small: 0, true: 0, large: 0 };
  for (const r of reviews) if (r.fit) counts[r.fit]++;
  const answered = counts.small + counts.true + counts.large;
  const pct = (n: number) => (answered ? Math.round((n / answered) * 100) : 0);
  return { answered, small: pct(counts.small), true: pct(counts.true), large: pct(counts.large) };
}

/** Optimistic helpful vote: voting adds one, taking the vote back removes it, and the count never goes below zero. */
export function applyHelpfulVote(count: number | undefined, voted: boolean): number {
  return Math.max(0, (count ?? 0) + (voted ? 1 : -1));
}

/* --------------------------------------------------------------- write a review */

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
  name?: string;
  fit?: ReviewFit | "";
  photos?: number;
}

export type ReviewFieldError = "rating-required" | "title-required" | "title-too-long" | "body-required" | "body-too-short" | "body-too-long" | "name-required" | "too-many-photos";
export type ReviewErrors = Partial<Record<"rating" | "title" | "body" | "name" | "photos", ReviewFieldError>>;

export interface ReviewRules {
  titleMax?: number;
  bodyMin?: number;
  bodyMax?: number;
  maxPhotos?: number;
  requireTitle?: boolean;
  requireName?: boolean;
}

export const DEFAULT_REVIEW_RULES: Required<ReviewRules> = { titleMax: 80, bodyMin: 20, bodyMax: 2000, maxPhotos: 5, requireTitle: false, requireName: false };

/** Field errors for a draft. Whitespace does not count towards lengths. An empty object means valid. */
export function validateReview(draft: ReviewDraft, rules: ReviewRules = {}): ReviewErrors {
  const r = { ...DEFAULT_REVIEW_RULES, ...rules };
  const errors: ReviewErrors = {};
  if (!starLevel(draft.rating) || draft.rating !== Math.round(draft.rating)) errors.rating = "rating-required";
  const title = draft.title.trim();
  if (!title && r.requireTitle) errors.title = "title-required";
  else if (title.length > r.titleMax) errors.title = "title-too-long";
  const body = draft.body.trim();
  if (!body) errors.body = "body-required";
  else if (body.length < r.bodyMin) errors.body = "body-too-short";
  else if (body.length > r.bodyMax) errors.body = "body-too-long";
  if (r.requireName && !draft.name?.trim()) errors.name = "name-required";
  if ((draft.photos ?? 0) > r.maxPhotos) errors.photos = "too-many-photos";
  return errors;
}

/* --------------------------------------------------------------------------- Q&A */

export type QuestionSort = "votes" | "newest" | "answered";

export function sortQuestions<Q extends ProductQuestion>(questions: readonly Q[], sort: QuestionSort): Q[] {
  const key: Record<QuestionSort, (a: Q, b: Q) => number> = {
    votes: (a, b) => (b.votes ?? 0) - (a.votes ?? 0) || time(b.date) - time(a.date),
    newest: (a, b) => time(b.date) - time(a.date),
    answered: (a, b) => b.answers.length - a.answers.length || (b.votes ?? 0) - (a.votes ?? 0),
  };
  return questions.map((q, i) => [q, i] as const).sort((a, b) => key[sort](a[0], b[0]) || a[1] - b[1]).map(([q]) => q);
}

/** Store answers first, then the most upvoted, then the newest. */
export function orderAnswers<A extends ProductAnswer>(answers: readonly A[]): A[] {
  return answers
    .map((a, i) => [a, i] as const)
    .sort((a, b) => Number(Boolean(b[0].seller)) - Number(Boolean(a[0].seller)) || (b[0].votes ?? 0) - (a[0].votes ?? 0) || time(b[0].date) - time(a[0].date) || a[1] - b[1])
    .map(([a]) => a);
}

/** Case-insensitive search across a question and its answers. */
export function searchQuestions<Q extends ProductQuestion>(questions: readonly Q[], query: string): Q[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...questions];
  return questions.filter((item) => `${item.question} ${item.answers.map((a) => a.body).join(" ")}`.toLowerCase().includes(q));
}

export type QuestionError = "question-required" | "question-too-short" | "question-too-long";

export function validateQuestion(text: string, rules: { min?: number; max?: number } = {}): QuestionError | null {
  const { min = 10, max = 300 } = rules;
  const t = text.trim();
  if (!t) return "question-required";
  if (t.length < min) return "question-too-short";
  if (t.length > max) return "question-too-long";
  return null;
}

export type AnswerError = "answer-required" | "answer-too-long";
export function validateAnswer(text: string, max = 1000): AnswerError | null {
  const t = text.trim();
  if (!t) return "answer-required";
  return t.length > max ? "answer-too-long" : null;
}

const EN_PLURAL = new Intl.PluralRules("en");
const AR_PLURAL = new Intl.PluralRules("ar");

/** Counts read as the number in the count position ("1 answer", "2 answers"); pass the raw count so the noun agrees. */
const en = (count: number | undefined, one: string, other: string): string => (count !== undefined && EN_PLURAL.select(count) === "one" ? one : other);

/** Arabic nouns take six forms. Without a count the plain plural is used. */
function ar(count: number | undefined, forms: { one: string; two: string; few: string; many: string; other: string }): string {
  return count === undefined ? forms.many : forms[AR_PLURAL.select(count) as keyof typeof forms] ?? forms.other;
}

/** English and Arabic copy for reviews and Q&A. Every entry can be overridden with the `labels` prop. */
export const REVIEW_STRINGS = {
  en: {
    reviews: "Customer reviews",
    basedOn: (n: string, count?: number) => `Based on ${n} ${en(count, "review", "reviews")}`,
    reviewsCount: "reviews",
    starsRow: (n: string) => `${n} stars`,
    filterByStars: (n: string, count: string) => `Show only ${n}-star reviews (${count})`,
    stars: "Stars",
    histogram: "Rating breakdown. Choose a row to filter the reviews.",
    writeReview: "Write a review",
    sort: "Sort by",
    sortHelpful: "Most helpful",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortHighest: "Highest rating",
    sortLowest: "Lowest rating",
    withPhotos: "With photos",
    verifiedOnly: "Verified purchases",
    clearFilters: "Clear filters",
    filters: "Filter reviews",
    search: "Search reviews",
    showing: (shown: string, total: string) => `Showing ${shown} of ${total} reviews`,
    showMore: "Show more reviews",
    noReviews: "No reviews yet",
    noReviewsHint: "Be the first to share what you think.",
    noMatches: "No reviews match these filters",
    photosTitle: "Photos from customers",
    photoOf: (n: string, total: string) => `Photo ${n} of ${total}`,
    viewPhoto: "View customer photo",
    prevPhoto: "Previous photo",
    nextPhoto: "Next photo",
    morePhotos: (n: string) => `+${n}`,
    verified: "Verified purchase",
    boughtVariant: (v: string) => `Bought: ${v}`,
    fitLabel: "Fit",
    fitSmall: "Runs small",
    fitTrue: "True to size",
    fitLarge: "Runs large",
    fitSummary: (n: string) => `Fit, from ${n} reviewers`,
    readMore: "Read more",
    readLess: "Read less",
    sellerReply: "Reply from the seller",
    helpful: "Helpful",
    helpfulCount: (n: string) => `Helpful (${n})`,
    helpfulUndo: "Marked helpful. Select to undo.",
    report: "Report",
    reported: "Reported",
    reportTitle: "Report this review",
    reportDescription: "Tell us what is wrong. We look at every report.",
    reportReason: "Reason",
    reasonSpam: "Spam or advertising",
    reasonOffensive: "Offensive or abusive",
    reasonFake: "Looks fake",
    reasonIrrelevant: "Not about this product",
    reasonOther: "Something else",
    reportNote: "Details (optional)",
    reportSend: "Send report",
    reportThanks: "Thanks. We will review it.",
    cancel: "Cancel",
    actions: "Review actions",
    loading: "Loading reviews",
    loadFailed: "Could not load the reviews.",
    retry: "Try again",
    voteFailed: "Could not save your vote. Try again.",
    // form
    formTitle: "Write a review",
    formDescription: "Share what you liked or did not, to help other shoppers.",
    yourRating: "Your rating",
    ratingStar: (n: string) => `${n} out of 5`,
    ratingWord: ["", "Poor", "Fair", "Good", "Very good", "Excellent"],
    reviewTitle: "Title (optional)",
    reviewTitleHint: "Sum it up in a few words.",
    reviewBody: "Your review",
    reviewBodyHint: (n: string) => `At least ${n} characters.`,
    yourName: "Name",
    fitQuestion: "How does it fit?",
    addPhotos: "Add photos",
    photosHint: (n: string) => `Up to ${n} photos.`,
    removePhoto: "Remove photo",
    submitReview: "Submit review",
    submitting: "Sending your review",
    reviewThanks: "Thanks for your review",
    reviewThanksHint: "It will appear after we check it.",
    submitFailed: "Could not send your review. Try again.",
    errors: {
      "rating-required": "Choose a star rating.",
      "title-required": "Add a title.",
      "title-too-long": "The title is too long.",
      "body-required": "Write your review.",
      "body-too-short": "Add a little more detail.",
      "body-too-long": "The review is too long.",
      "name-required": "Enter your name.",
      "too-many-photos": "You added too many photos.",
    } satisfies Record<ReviewFieldError, string>,
    // Q&A
    qaTitle: "Questions and answers",
    qaCount: (n: string, count?: number) => `${n} ${en(count, "question", "questions")}`,
    askTitle: "Ask a question",
    askPlaceholder: "Ask about size, materials, delivery…",
    askSubmit: "Post question",
    asking: "Posting your question",
    askThanks: "Your question was posted.",
    searchQuestions: "Search questions",
    noQuestions: "No questions yet",
    noQuestionsHint: "Ask the first one.",
    noQuestionMatches: "No questions match your search",
    answer: "Answer",
    answerPlaceholder: "Write your answer",
    answerSubmit: "Post answer",
    answers: (n: string, count?: number) => `${n} ${en(count, "answer", "answers")}`,
    noAnswers: "No answers yet",
    showAnswers: (n: string, count?: number) => `Show ${n} more ${en(count, "answer", "answers")}`,
    hideAnswers: "Show fewer answers",
    fromSeller: "Seller",
    upvote: "Upvote",
    upvoted: "Upvoted",
    upvoteCount: (n: string, count?: number) => `${n} ${en(count, "upvote", "upvotes")}`,
    askedBy: (name: string) => `Asked by ${name}`,
    questionErrors: {
      "question-required": "Write your question.",
      "question-too-short": "Add a little more detail.",
      "question-too-long": "The question is too long.",
    } satisfies Record<QuestionError, string>,
    answerRequired: "Write an answer first.",
    sortQuestions: "Sort questions",
    sortVotes: "Most upvoted",
    sortAnswered: "Most answered",
  },
  ar: {
    reviews: "تقييمات العملاء",
    basedOn: (n: string) => `بناءً على ${n} تقييم`,
    reviewsCount: "تقييم",
    starsRow: (n: string) => `${n} نجوم`,
    filterByStars: (n: string, count: string) => `عرض تقييمات ${n} نجوم فقط (${count})`,
    stars: "النجوم",
    histogram: "توزيع التقييمات. اختر صفًا لتصفية التقييمات.",
    writeReview: "اكتب تقييمًا",
    sort: "الترتيب",
    sortHelpful: "الأكثر فائدة",
    sortNewest: "الأحدث",
    sortOldest: "الأقدم",
    sortHighest: "الأعلى تقييمًا",
    sortLowest: "الأقل تقييمًا",
    withPhotos: "بها صور",
    verifiedOnly: "مشتريات موثّقة",
    clearFilters: "مسح التصفية",
    filters: "تصفية التقييمات",
    search: "ابحث في التقييمات",
    showing: (shown: string, total: string) => `عرض ${shown} من ${total} تقييم`,
    showMore: "عرض المزيد من التقييمات",
    noReviews: "لا توجد تقييمات بعد",
    noReviewsHint: "كن أول من يشارك رأيه.",
    noMatches: "لا توجد تقييمات تطابق هذه التصفية",
    photosTitle: "صور من العملاء",
    photoOf: (n: string, total: string) => `الصورة ${n} من ${total}`,
    viewPhoto: "عرض صورة العميل",
    prevPhoto: "الصورة السابقة",
    nextPhoto: "الصورة التالية",
    morePhotos: (n: string) => `+${n}`,
    verified: "شراء موثّق",
    boughtVariant: (v: string) => `اشترى: ${v}`,
    fitLabel: "المقاس",
    fitSmall: "ضيّق قليلًا",
    fitTrue: "المقاس مضبوط",
    fitLarge: "واسع قليلًا",
    fitSummary: (n: string) => `المقاس، حسب ${n} مقيّم`,
    readMore: "اقرأ المزيد",
    readLess: "عرض أقل",
    sellerReply: "رد البائع",
    helpful: "مفيد",
    helpfulCount: (n: string) => `مفيد (${n})`,
    helpfulUndo: "تم التعليم كمفيد. اضغط للتراجع.",
    report: "إبلاغ",
    reported: "تم الإبلاغ",
    reportTitle: "الإبلاغ عن هذا التقييم",
    reportDescription: "أخبرنا ما المشكلة. نراجع كل بلاغ.",
    reportReason: "السبب",
    reasonSpam: "محتوى دعائي أو مزعج",
    reasonOffensive: "مسيء أو مهين",
    reasonFake: "يبدو مزيفًا",
    reasonIrrelevant: "لا يخص هذا المنتج",
    reasonOther: "سبب آخر",
    reportNote: "تفاصيل (اختياري)",
    reportSend: "إرسال البلاغ",
    reportThanks: "شكرًا لك. سنراجعه.",
    cancel: "إلغاء",
    actions: "إجراءات التقييم",
    loading: "جارٍ تحميل التقييمات",
    loadFailed: "تعذّر تحميل التقييمات.",
    retry: "حاول مرة أخرى",
    voteFailed: "تعذّر حفظ تصويتك. حاول مرة أخرى.",
    formTitle: "اكتب تقييمًا",
    formDescription: "شاركنا ما أعجبك أو لم يعجبك لتساعد غيرك من المتسوّقين.",
    yourRating: "تقييمك",
    ratingStar: (n: string) => `${n} من 5`,
    ratingWord: ["", "سيئ", "مقبول", "جيد", "جيد جدًا", "ممتاز"],
    reviewTitle: "العنوان (اختياري)",
    reviewTitleHint: "لخّص رأيك في بضع كلمات.",
    reviewBody: "تقييمك",
    reviewBodyHint: (n: string) => `على الأقل ${n} حرفًا.`,
    yourName: "الاسم",
    fitQuestion: "كيف كان المقاس؟",
    addPhotos: "أضف صورًا",
    photosHint: (n: string) => `حتى ${n} صور.`,
    removePhoto: "إزالة الصورة",
    submitReview: "إرسال التقييم",
    submitting: "جارٍ إرسال تقييمك",
    reviewThanks: "شكرًا على تقييمك",
    reviewThanksHint: "سيظهر بعد مراجعته.",
    submitFailed: "تعذّر إرسال تقييمك. حاول مرة أخرى.",
    errors: {
      "rating-required": "اختر عدد النجوم.",
      "title-required": "أضف عنوانًا.",
      "title-too-long": "العنوان طويل جدًا.",
      "body-required": "اكتب تقييمك.",
      "body-too-short": "أضف مزيدًا من التفاصيل.",
      "body-too-long": "التقييم طويل جدًا.",
      "name-required": "أدخل اسمك.",
      "too-many-photos": "أضفت صورًا أكثر من المسموح.",
    } satisfies Record<ReviewFieldError, string>,
    qaTitle: "الأسئلة والأجوبة",
    qaCount: (n: string, count?: number) => ar(count, { one: "سؤال واحد", two: "سؤالان", few: `${n} أسئلة`, many: `${n} سؤالًا`, other: `${n} سؤال` }),
    askTitle: "اطرح سؤالًا",
    askPlaceholder: "اسأل عن المقاس أو الخامة أو التوصيل…",
    askSubmit: "نشر السؤال",
    asking: "جارٍ نشر سؤالك",
    askThanks: "تم نشر سؤالك.",
    searchQuestions: "ابحث في الأسئلة",
    noQuestions: "لا توجد أسئلة بعد",
    noQuestionsHint: "اطرح السؤال الأول.",
    noQuestionMatches: "لا توجد أسئلة تطابق بحثك",
    answer: "أجب",
    answerPlaceholder: "اكتب إجابتك",
    answerSubmit: "نشر الإجابة",
    answers: (n: string, count?: number) => ar(count, { one: "إجابة واحدة", two: "إجابتان", few: `${n} إجابات`, many: `${n} إجابة`, other: `${n} إجابة` }),
    noAnswers: "لا توجد إجابات بعد",
    showAnswers: (n: string, count?: number) => ar(count, { one: "عرض إجابة أخرى", two: "عرض إجابتين أخريين", few: `عرض ${n} إجابات أخرى`, many: `عرض ${n} إجابة أخرى`, other: `عرض ${n} إجابة أخرى` }),
    hideAnswers: "عرض إجابات أقل",
    fromSeller: "البائع",
    upvote: "تأييد",
    upvoted: "تم التأييد",
    upvoteCount: (n: string, count?: number) => ar(count, { one: "تأييد واحد", two: "تأييدان", few: `${n} تأييدات`, many: `${n} تأييدًا`, other: `${n} تأييد` }),
    askedBy: (name: string) => `سأل ${name}`,
    questionErrors: {
      "question-required": "اكتب سؤالك.",
      "question-too-short": "أضف مزيدًا من التفاصيل.",
      "question-too-long": "السؤال طويل جدًا.",
    } satisfies Record<QuestionError, string>,
    answerRequired: "اكتب إجابة أولًا.",
    sortQuestions: "ترتيب الأسئلة",
    sortVotes: "الأكثر تأييدًا",
    sortAnswered: "الأكثر إجابة",
  },
} as const;

export type ReviewStrings = { [K in keyof typeof REVIEW_STRINGS.en]: (typeof REVIEW_STRINGS.en)[K] extends (...a: infer A) => string ? (...a: A) => string : (typeof REVIEW_STRINGS.en)[K] extends readonly string[] ? readonly string[] : (typeof REVIEW_STRINGS.en)[K] extends string ? string : (typeof REVIEW_STRINGS.en)[K] };
export type ProductReviewsLabels = Partial<ReviewStrings>;

/* ------------------------------------------------------------------------------------------------ runtime helpers */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = Magics & Record<string, any>;
const self = (o: unknown) => o as S;

function strings(labels?: Record<string, unknown>) {
  const ar = (document.documentElement.lang || "en").toLowerCase().startsWith("ar");
  const lang = ar ? "ar" : "en";
  const nf = new Intl.NumberFormat(`${lang}-u-nu-latn`);
  const dateFmt = new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { dateStyle: "medium" });
  return {
    ar,
    t: { ...REVIEW_STRINGS[lang], ...labels } as unknown as ReviewStrings,
    fmt: (n: number) => nf.format(n),
    pct: (n: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { style: "percent" }).format(n),
    score: (n: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n),
    compact: (n: number) => new Intl.NumberFormat(`${lang}-u-nu-latn`, { notation: "compact" }).format(n),
    date(iso: string) {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
    },
  };
}

/** Dispatches a bubbling event carrying `waitUntil(promise)`; resolves to the first `{ error }` a listener returned, else null. A rejection throws. */
async function ask(el: Element, name: string, detail: Record<string, unknown>): Promise<string | null> {
  const pending: unknown[] = [];
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => pending.push(p) } }));
  for (const result of await Promise.all(pending)) {
    if (result && typeof result === "object" && (result as { error?: string }).error) return (result as { error: string }).error;
  }
  return null;
}

/** Roving keys for a radio group: arrows move to the next or previous value (following the reading direction). */
function radioKey(event: KeyboardEvent, values: readonly string[], current: string | undefined, set: (v: string) => void) {
  const rtl = document.documentElement.dir === "rtl" || getComputedStyle(event.currentTarget as Element).direction === "rtl";
  const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 1, ArrowUp: -1 }[event.key];
  if (!step) return;
  event.preventDefault();
  const i = current ? values.indexOf(current) : -1;
  const next = values[(i + step + values.length) % values.length]!;
  set(next);
  const group = (event.currentTarget as Element).closest("[role=radiogroup]");
  queueMicrotask(() => group?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
}

const hist = (reviews: readonly ProductReview[], summary?: ReviewSummary) => summary ?? summarizeReviews(reviews);

/** The summary fields the Blade summary markup binds to; shared by the reviews block and the standalone summary. */
function summaryState(reviews: readonly ProductReview[], summaryIn: ReviewSummary | undefined, s: ReturnType<typeof strings>) {
  const stats = hist(reviews, summaryIn);
  const fit = fitSummary(reviews);
  return {
    stats,
    avgText: s.score(stats.average),
    countText: s.fmt(stats.count),
    basedOn: s.t.basedOn(s.fmt(stats.count), stats.count),
    spoken(value: number, count?: number) {
      const sc = s.score(value);
      const tail = count === undefined ? "" : (s.ar ? `، ${s.compact(count)} ${s.t.reviewsCount}` : `, ${s.compact(count)} ${s.t.reviewsCount}`);
      return s.ar ? `التقييم ${sc} من 5${tail}` : `Rated ${sc} out of 5${tail}`;
    },
    rows: STAR_LEVELS.map((level) => ({
      level,
      levelText: s.fmt(level),
      countText: s.fmt(stats.histogram[level]),
      pct: histogramPercent(stats.histogram, level, stats.count),
      label: s.t.filterByStars(s.fmt(level), s.fmt(stats.histogram[level])),
      plain: `${s.t.starsRow(s.fmt(level))}, ${s.fmt(stats.histogram[level])}`,
    })),
    fitRows: fit.answered
      ? [
          { key: "small", label: s.t.fitSmall, pct: fit.small, text: s.pct(fit.small / 100) },
          { key: "true", label: s.t.fitTrue, pct: fit.true, text: s.pct(fit.true / 100) },
          { key: "large", label: s.t.fitLarge, pct: fit.large, text: s.pct(fit.large / 100) },
        ]
      : [],
    fitTitle: fit.answered ? s.t.fitSummary(s.fmt(fit.answered)) : "",
    fitAria: fit.answered ? [s.t.fitSmall + " " + s.pct(fit.small / 100), s.t.fitTrue + " " + s.pct(fit.true / 100), s.t.fitLarge + " " + s.pct(fit.large / 100)].join(", ") : "",
  };
}

/* ------------------------------------------------------------------------------------------------------ components */

interface ReviewsConfig {
  reviews: ProductReview[];
  summary?: ReviewSummary;
  pageSize?: number;
  defaultSort?: ReviewSort;
  loading?: boolean;
  error?: string | boolean;
  canSubmit?: boolean;
  canReport?: boolean;
  labels?: Record<string, string>;
}

export const productReviews: Register = (Alpine) => {
  // The standalone rating summary: <div x-data="nqProductReviewSummary({ reviews })"> … </div>
  Alpine.data("nqProductReviewSummary", (config: { reviews?: ProductReview[]; summary?: ReviewSummary; labels?: Record<string, string> }) => {
    const s = strings(config.labels);
    return { t: s.t, fmt: s.fmt, selectable: false, isSelected: () => false, toggleStar() {}, ...summaryState(config.reviews ?? [], config.summary, s) };
  });

  Alpine.data("nqProductReviews", (config: ReviewsConfig) => {
    const s = strings(config.labels);
    const reviews = config.reviews;
    const pageSize = Math.max(1, config.pageSize ?? 5);
    const photoList = collectPhotos(reviews);
    const base = summaryState(reviews, config.summary, s);
    let root: Element;
    return {
      ...base,
      t: s.t,
      selectable: true,
      filters: { stars: [] as StarLevel[], withPhotos: false, verifiedOnly: false },
      sort: (config.defaultSort ?? "helpful") as ReviewSort,
      visible: pageSize,
      votes: {} as Record<string, { voted: boolean; count: number }>,
      voteError: null as string | null,
      writing: false,
      reportOpen: false,
      reportingId: null as string | null,
      reportedIds: [] as string[],
      report: { reason: "", note: "", state: "idle", failure: null as string | null },
      viewerOpen: false,
      viewer: 0,
      expanded: [] as string[],
      failed: {} as Record<string, boolean>,
      loading: Boolean(config.loading),
      errorText: config.error ? (typeof config.error === "string" ? config.error : s.t.loadFailed) : "",
      canSubmit: Boolean(config.canSubmit),
      canReport: Boolean(config.canReport),
      photoTotal: totalPhotos(reviews),
      photoStrip: photoList.slice(0, 8),
      ratingText: (value: number) => s.score(value),
      fmt: s.fmt,
      date: s.date,
      init(this: S) {
        root = this.$root;
        this.$watch("reportOpen", (open: boolean) => {
          if (open) return;
          this.reportingId = null;
          setTimeout(() => (this.report = { reason: "", note: "", state: "idle", failure: null }), 200);
        });
      },

      get empty() {
        return !self(this).loading && !self(this).errorText && base.stats.count === 0 && reviews.length === 0;
      },
      get ready() {
        return !self(this).loading && !self(this).errorText && !self(this).empty;
      },
      get active() {
        return hasActiveFilters(self(this).filters);
      },
      get selectedStars() {
        return self(this).filters.stars;
      },
      get shown(): ProductReview[] {
        return sortReviews(filterReviews(reviews, self(this).filters), self(this).sort);
      },
      get page(): ProductReview[] {
        return self(this).shown.slice(0, self(this).visible);
      },
      get showingText() {
        return s.t.showing(s.fmt(Math.min(self(this).visible, self(this).shown.length)), s.fmt(self(this).shown.length));
      },
      get reportLabels() {
        return REASON_KEYS.map((k) => ({ key: k, label: s.t[REASON_LABEL[k]] as string }));
      },
      get viewerPhoto() {
        return photoList[self(this).viewer];
      },
      get viewerCaption() {
        return s.t.photoOf(s.fmt(self(this).viewer + 1), s.fmt(photoList.length));
      },
      get hasPrev() {
        return self(this).viewer > 0;
      },
      get hasNext() {
        return self(this).viewer < photoList.length - 1;
      },

      isSelected(this: S, level: number) {
        return this.filters.stars.includes(level);
      },
      toggleStar(this: S, level: StarLevel) {
        this.update({ ...this.filters, stars: toggleStar(this.filters.stars, level) });
      },
      toggleFlag(this: S, key: "withPhotos" | "verifiedOnly") {
        this.update({ ...this.filters, [key]: !this.filters[key] });
      },
      clearFilters(this: S) {
        this.update({ stars: [], withPhotos: false, verifiedOnly: false });
      },
      update(this: S, next: { stars: StarLevel[]; withPhotos: boolean; verifiedOnly: boolean }) {
        this.filters = next;
        this.visible = pageSize;
        root.dispatchEvent(new CustomEvent("nq-filters", { bubbles: true, detail: { stars: [...next.stars], withPhotos: next.withPhotos, verifiedOnly: next.verifiedOnly } }));
      },
      starPillLabel(this: S, level: number) {
        return s.t.filterByStars(s.fmt(level), s.fmt(base.stats.histogram[level as StarLevel]));
      },
      showMore(this: S) {
        this.visible += pageSize;
      },

      voteFor(this: S, r: ProductReview) {
        return this.votes[r.id] ?? { voted: false, count: r.helpful ?? 0 };
      },
      helpfulText(this: S, r: ProductReview) {
        return s.t.helpfulCount(s.fmt(this.voteFor(r).count));
      },
      async vote(this: S, r: ProductReview) {
        const before = this.voteFor(r);
        const voted = !before.voted;
        this.voteError = null;
        this.votes = { ...this.votes, [r.id]: { voted, count: applyHelpfulVote(before.count, voted) } };
        try {
          const error = await ask(root, "nq-vote", { id: r.id, voted });
          if (error) throw new Error(error);
        } catch {
          this.votes = { ...this.votes, [r.id]: before };
          this.voteError = s.t.voteFailed;
        }
      },

      isLong: (r: ProductReview) => r.body.length > 220,
      isExpanded(this: S, id: string) {
        return this.expanded.includes(id);
      },
      toggleExpanded(this: S, id: string) {
        this.expanded = this.expanded.includes(id) ? this.expanded.filter((x: string) => x !== id) : [...this.expanded, id];
      },
      metaTail(r: ProductReview) {
        return (
          (r.variantLabel ? ` · ${s.t.boughtVariant(r.variantLabel)}` : "") +
          (r.fit ? ` · ${s.t.fitLabel}: ${r.fit === "small" ? s.t.fitSmall : r.fit === "true" ? s.t.fitTrue : s.t.fitLarge}` : "")
        );
      },
      openPhoto(this: S, reviewId: string, src: string) {
        const i = photoList.findIndex((p) => p.reviewId === reviewId && p.src === src);
        this.viewer = i < 0 ? 0 : i;
        this.viewerOpen = true;
      },
      step(this: S, by: number) {
        this.viewer = Math.min(Math.max(0, this.viewer + by), photoList.length - 1);
      },

      isReported(this: S, id: string) {
        return this.reportedIds.includes(id);
      },
      openReport(this: S, id: string) {
        if (this.isReported(id)) return;
        this.reportingId = id;
        this.reportOpen = true;
      },
      async sendReport(this: S) {
        const id = this.reportingId;
        if (!this.report.reason || !id) return;
        this.report = { ...this.report, state: "sending", failure: null };
        try {
          const error = await ask(root, "nq-report", { id, reason: this.report.reason, note: this.report.note.trim() });
          if (error) {
            this.report = { ...this.report, state: "idle", failure: error };
            return;
          }
          this.reportedIds = [...this.reportedIds, id];
          this.report = { ...this.report, state: "done" };
        } catch {
          this.report = { ...this.report, state: "idle", failure: s.t.submitFailed };
        }
      },
      /** The write-a-review form calls this; a listener on the root receives nq-review { review, waitUntil }. */
      sendReview(draft: unknown) {
        return ask(root, "nq-review", { review: draft });
      },
    };
  });

  Alpine.data("nqProductReviewForm", (config: { askFit?: boolean; askName?: boolean; defaultName?: string; rules?: ReviewRules; labels?: Record<string, string> } = {}) => {
    const s = strings(config.labels);
    const rules = { ...DEFAULT_REVIEW_RULES, ...config.rules };
    const files: File[] = [];
    let root: Element;
    return {
      t: s.t,
      askFit: Boolean(config.askFit),
      askName: Boolean(config.askName),
      rating: 0,
      title: "",
      body: "",
      name: config.defaultName ?? "",
      fit: "" as ReviewFit | "",
      previews: [] as { name: string; url: string }[],
      touched: [] as string[],
      submitted: false,
      state: "idle" as "idle" | "sending" | "done",
      failure: null as string | null,
      stars: [1, 2, 3, 4, 5],
      fits: ["small", "true", "large"] as ReviewFit[],
      maxPhotos: rules.maxPhotos,
      titleMax: rules.titleMax + 20,
      fmt: s.fmt,
      bodyHint: s.t.reviewBodyHint(s.fmt(rules.bodyMin)),
      photosHint: s.t.photosHint(s.fmt(rules.maxPhotos)),
      init(this: S) {
        root = this.$root;
      },
      get errors() {
        return validateReview({ rating: self(this).rating, title: self(this).title, body: self(this).body, name: self(this).name, fit: self(this).fit, photos: self(this).previews.length }, { ...config.rules, requireName: config.askName ? true : config.rules?.requireName });
      },
      show(this: S, field: string): string {
        return (this.submitted || this.touched.includes(field)) && this.errors[field] ? this.t.errors[this.errors[field]] : "";
      },
      touch(this: S, field: string) {
        if (!this.touched.includes(field)) this.touched = [...this.touched, field];
      },
      ratingWord(this: S) {
        return this.rating ? s.t.ratingWord[this.rating] : "";
      },
      starLabel: (n: number) => s.t.ratingStar(s.fmt(n)),
      setRating(this: S, n: number) {
        this.rating = n;
        this.touch("rating");
      },
      ratingKey(this: S, event: KeyboardEvent) {
        radioKey(event, ["1", "2", "3", "4", "5"], this.rating ? String(this.rating) : undefined, (v) => this.setRating(Number(v)));
      },
      fitText: (f: ReviewFit) => (f === "small" ? s.t.fitSmall : f === "true" ? s.t.fitTrue : s.t.fitLarge),
      fitKey(this: S, event: KeyboardEvent) {
        radioKey(event, ["small", "true", "large"], this.fit || undefined, (v) => (this.fit = v));
      },
      addFiles(this: S, event: Event) {
        const input = event.target as HTMLInputElement;
        for (const f of Array.from(input.files ?? [])) {
          if (!f.type.startsWith("image/")) continue;
          files.push(f);
          this.previews = [...this.previews, { name: f.name, url: URL.createObjectURL(f) }];
        }
        this.touch("photos");
        input.value = "";
      },
      removePhoto(this: S, i: number) {
        files.splice(i, 1);
        URL.revokeObjectURL(this.previews[i].url);
        this.previews = this.previews.filter((_: unknown, j: number) => j !== i);
      },
      removeLabel: (name: string) => `${s.t.removePhoto}: ${name}`,
      async submit(this: S) {
        this.submitted = true;
        this.failure = null;
        const errors = this.errors;
        if (Object.keys(errors).length) {
          const first = (["rating", "title", "body", "name", "photos"] as const).find((k) => errors[k]);
          root.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
          return;
        }
        this.state = "sending";
        const draft = { rating: this.rating, title: this.title.trim(), body: this.body.trim(), name: this.name.trim(), ...(this.fit ? { fit: this.fit } : {}), photos: [...files] };
        try {
          // Inside <x-nq::product-reviews> the block's sendReview carries the event; standalone, the form's own root does.
          const error = await (typeof this.sendReview === "function" ? this.sendReview(draft) : ask(root, "nq-review", { review: draft }));
          if (error) {
            this.failure = error;
            this.state = "idle";
            return;
          }
          this.state = "done";
          root.dispatchEvent(new CustomEvent("nq-review-sent", { bubbles: true }));
        } catch {
          this.failure = s.t.submitFailed;
          this.state = "idle";
        }
      },
    };
  });

  Alpine.data("nqProductQA", (config: { questions: ProductQuestion[]; answersShown?: number; pageSize?: number; defaultSort?: QuestionSort; loading?: boolean; error?: string | boolean; canAsk?: boolean; canAnswer?: boolean; labels?: Record<string, string> }) => {
    const s = strings(config.labels);
    const questions = config.questions;
    const answersShown = config.answersShown ?? 2;
    const pageSize = Math.max(1, config.pageSize ?? 5);
    let root: Element;
    const fail = (e: string | null) => e;
    return {
      t: s.t,
      query: "",
      sort: (config.defaultSort ?? "votes") as QuestionSort,
      visible: pageSize,
      ask: "",
      askError: null as string | null,
      askState: "idle" as "idle" | "sending" | "done",
      votes: {} as Record<string, { voted: boolean; count: number }>,
      open: [] as string[],
      answerDraft: {} as Record<string, string>,
      answerError: {} as Record<string, string | null>,
      answerBusy: null as string | null,
      voteError: null as string | null,
      loading: Boolean(config.loading),
      errorText: config.error ? (typeof config.error === "string" ? config.error : s.t.loadFailed) : "",
      canAsk: Boolean(config.canAsk),
      canAnswer: Boolean(config.canAnswer),
      date: s.date,
      fmt: s.fmt,
      qaCountText: s.t.qaCount(s.fmt(questions.length), questions.length),
      init(this: S) {
        root = this.$root;
        this.$watch("query", () => (this.visible = pageSize));
      },
      get empty() {
        return !self(this).loading && !self(this).errorText && questions.length === 0;
      },
      get ready() {
        return !self(this).loading && !self(this).errorText && questions.length > 0;
      },
      get shown(): ProductQuestion[] {
        return sortQuestions(searchQuestions(questions, self(this).query), self(this).sort);
      },
      get page(): ProductQuestion[] {
        return self(this).shown.slice(0, self(this).visible);
      },
      get shownCountText() {
        return s.t.qaCount(s.fmt(self(this).shown.length), self(this).shown.length);
      },
      showMore(this: S) {
        this.visible += pageSize;
      },
      answersOf(this: S, q: ProductQuestion) {
        const all = orderAnswers(q.answers);
        return this.open.includes(q.id) ? all : all.slice(0, answersShown);
      },
      askedBy: (q: ProductQuestion) => `${s.t.askedBy(q.author)}`,
      answersCount: (q: ProductQuestion) => s.t.answers(s.fmt(q.answers.length), q.answers.length),
      moreAnswers: (q: ProductQuestion) => q.answers.length > answersShown,
      toggleLabel(this: S, q: ProductQuestion) {
        return this.open.includes(q.id) ? s.t.hideAnswers : s.t.showAnswers(s.fmt(q.answers.length - answersShown), q.answers.length - answersShown);
      },
      toggleOpen(this: S, id: string) {
        this.open = this.open.includes(id) ? this.open.filter((x: string) => x !== id) : [...this.open, id];
      },
      voteOf(this: S, key: string, base: number) {
        return this.votes[key] ?? { voted: false, count: base };
      },
      upvoteLabel(this: S, key: string, base: number) {
        const v = this.voteOf(key, base);
        return `${v.voted ? s.t.upvoted : s.t.upvote}: ${s.t.upvoteCount(s.fmt(v.count), v.count)}`;
      },
      async castVote(this: S, key: string, base: number, event: string, detail: Record<string, unknown>) {
        const before = this.voteOf(key, base);
        const voted = !before.voted;
        this.voteError = null;
        this.votes = { ...this.votes, [key]: { voted, count: Math.max(0, before.count + (voted ? 1 : -1)) } };
        try {
          if (fail(await ask(root, event, { ...detail, voted }))) throw new Error("vote");
        } catch {
          this.votes = { ...this.votes, [key]: before };
          this.voteError = s.t.voteFailed;
        }
      },
      voteQuestion(this: S, q: ProductQuestion) {
        return this.castVote(q.id, q.votes ?? 0, "nq-vote-question", { questionId: q.id });
      },
      voteAnswer(this: S, q: ProductQuestion, a: ProductAnswer) {
        return this.castVote(`${q.id}:${a.id}`, a.votes ?? 0, "nq-vote-answer", { questionId: q.id, answerId: a.id });
      },
      async submitAsk(this: S) {
        const problem = validateQuestion(this.ask);
        if (problem) {
          this.askError = s.t.questionErrors[problem];
          return;
        }
        this.askError = null;
        this.askState = "sending";
        try {
          const message = await ask(root, "nq-ask", { question: this.ask.trim() });
          if (message) {
            this.askError = message;
            this.askState = "idle";
            return;
          }
          this.ask = "";
          this.askState = "done";
        } catch {
          this.askError = s.t.submitFailed;
          this.askState = "idle";
        }
      },
      async submitAnswer(this: S, q: ProductQuestion) {
        const text = this.answerDraft[q.id] ?? "";
        const problem = validateAnswer(text);
        if (problem) {
          this.answerError = { ...this.answerError, [q.id]: problem === "answer-required" ? s.t.answerRequired : s.t.errors["body-too-long"] };
          return;
        }
        this.answerError = { ...this.answerError, [q.id]: null };
        this.answerBusy = q.id;
        try {
          const message = await ask(root, "nq-answer", { questionId: q.id, answer: text.trim() });
          if (message) this.answerError = { ...this.answerError, [q.id]: message };
          else this.answerDraft = { ...this.answerDraft, [q.id]: "" };
        } catch {
          this.answerError = { ...this.answerError, [q.id]: s.t.submitFailed };
        }
        this.answerBusy = null;
      },
    };
  });
};

const REASON_KEYS = ["spam", "offensive", "fake", "irrelevant", "other"] as const;
const REASON_LABEL = { spam: "reasonSpam", offensive: "reasonOffensive", fake: "reasonFake", irrelevant: "reasonIrrelevant", other: "reasonOther" } as const;
