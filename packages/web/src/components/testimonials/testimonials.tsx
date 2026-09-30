"use client";

import { ChevronLeft, ChevronRight, CircleCheck, Star } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { EmptyState } from "../states";
import { FORM_HONEYPOT } from "../public-form/form-model";
import { formatNumber } from "../numeric";
import {
  TESTIMONIAL_QUOTE_MAX,
  type Testimonial,
  type TestimonialErrorCode,
  testimonialOrder,
  testimonialStep,
  validateTestimonial,
} from "./testimonials-logic";

const STRINGS = {
  en: {
    name: "Your name",
    role: "Role",
    company: "Company",
    email: "Email",
    emailHint: "Optional. We only use it to thank you.",
    quote: "Your testimonial",
    quoteHint: (max: string) => `Up to ${max} characters.`,
    rating: "Rating",
    stars: (n: number) => `${n} ${n === 1 ? "star" : "stars"}`,
    consent: "You may show my name and words on your website.",
    submit: "Send testimonial",
    thanks: "Thank you! Your testimonial is on its way to be reviewed.",
    another: "Send another",
    empty: "No testimonials yet.",
    previous: "Previous testimonial",
    next: "Next testimonial",
    goTo: (n: number) => `Testimonial ${n}`,
    ratedOutOf: (n: number) => `Rated ${n} out of 5`,
    honeypot: "Leave this field empty",
    errors: {
      name: "Enter your name.",
      "quote-short": "Write a little more.",
      "quote-long": "That is too long.",
      rating: "Pick a rating from 1 to 5.",
      email: "Enter a valid email address.",
      consent: "Please agree so we can show it.",
    } satisfies Record<TestimonialErrorCode, string>,
  },
  ar: {
    name: "اسمك",
    role: "المسمى الوظيفي",
    company: "الشركة",
    email: "البريد الإلكتروني",
    emailHint: "اختياري. نستخدمه لشكرك فقط.",
    quote: "شهادتك",
    quoteHint: (max: string) => `حتى ${max} حرفًا.`,
    rating: "التقييم",
    stars: (n: number) => `${n} ${n === 1 ? "نجمة" : n === 2 ? "نجمتان" : n <= 10 ? "نجوم" : "نجمة"}`,
    consent: "يمكنكم عرض اسمي وكلماتي على موقعكم.",
    submit: "أرسل الشهادة",
    thanks: "شكرًا لك! شهادتك في طريقها إلى المراجعة.",
    another: "إرسال شهادة أخرى",
    empty: "لا شهادات بعد.",
    previous: "الشهادة السابقة",
    next: "الشهادة التالية",
    goTo: (n: number) => `الشهادة ${n}`,
    ratedOutOf: (n: number) => `التقييم ${n} من 5`,
    honeypot: "اترك هذا الحقل فارغًا",
    errors: {
      name: "أدخل اسمك.",
      "quote-short": "اكتب أكثر قليلًا.",
      "quote-long": "النص أطول من المسموح.",
      rating: "اختر تقييمًا من 1 إلى 5.",
      email: "أدخل بريدًا إلكترونيًا صحيحًا.",
      consent: "يرجى الموافقة لنتمكن من عرضها.",
    } satisfies Record<TestimonialErrorCode, string>,
  },
} as const;
export type TestimonialLabels = Partial<{ [K in keyof (typeof STRINGS)["en"]]: (typeof STRINGS)["en"][K] extends string ? string : (typeof STRINGS)["en"][K] }>;

function useStrings(labels: TestimonialLabels | undefined, localeProp: string | undefined) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"] };
}

/* ------------------------------------------------------------------ submit form */

export interface TestimonialSubmission {
  name: string;
  role: string;
  company: string;
  email: string;
  quote: string;
  rating: number | null;
  consent: boolean;
}

export interface TestimonialFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  /** Called with the checked, trimmed submission. Reject to keep the form. Bots (honeypot) never reach it. */
  onSubmit?: (submission: TestimonialSubmission) => void | Promise<void>;
  /** Ask for the rating. Default true. */
  askRating?: boolean;
  /** Make the rating mandatory. Default false. */
  requireRating?: boolean;
  /** Ask for an email. Default false. */
  askEmail?: boolean;
  /** Ask for role and company. Default true. */
  askRole?: boolean;
  /** Ask for permission to show the words publicly. Default true, and required. */
  requireConsent?: boolean;
  /** Thank-you text after sending. */
  thanks?: ReactNode;
  locale?: string;
  labels?: TestimonialLabels;
}

/** A public form for people to leave a testimonial: name, words, star rating, consent, a honeypot and a thank-you. */
export function TestimonialForm({ onSubmit, askRating = true, requireRating = false, askEmail = false, askRole = true, requireConsent = true, thanks, locale: localeProp, labels, className, ...props }: TestimonialFormProps) {
  const { locale, t } = useStrings(labels, localeProp);
  const uid = useId();
  const blank: TestimonialSubmission = { name: "", role: "", company: "", email: "", quote: "", rating: null, consent: false };
  const [v, setV] = useState(blank);
  const [trap, setTrap] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateTestimonial>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = <K extends keyof TestimonialSubmission>(key: K, value: TestimonialSubmission[K]) => {
    setV((s) => ({ ...s, [key]: value }));
    setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  };
  const idOf = (name: string) => `${uid}-${name}`;

  if (done) {
    return (
      <div data-slot="testimonial-form" data-state="done" role="status" className={cn("flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5", className)}>
        <CircleCheck aria-hidden className="size-6 text-nq-success" />
        <p className="text-body">{thanks ?? t.thanks}</p>
        <Button
          type="button"
          variant="link"
          className="px-0"
          onClick={() => {
            setV(blank);
            setDone(false);
          }}
        >
          {t.another}
        </Button>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateTestimonial(v, { requireConsent, requireRating });
    setErrors(found);
    const first = (["name", "quote", "email", "rating", "consent"] as const).find((k) => found[k]);
    if (first) {
      document.getElementById(idOf(first))?.focus();
      return;
    }
    if (trap.trim() !== "") {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      await onSubmit?.({ ...v, name: v.name.trim(), role: v.role.trim(), company: v.company.trim(), email: v.email.trim(), quote: v.quote.trim() });
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const err = (key: keyof typeof errors) => (errors[key] ? <FieldError match>{t.errors[errors[key] as TestimonialErrorCode]}</FieldError> : null);

  return (
    <form data-slot="testimonial-form" noValidate onSubmit={submit} className={cn("relative flex w-full flex-col gap-4", className)} {...props}>
      <Field invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor={idOf("name")}>{t.name}</FieldLabel>
        <Input id={idOf("name")} value={v.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
        {err("name")}
      </Field>
      {askRole ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={idOf("role")}>{t.role}</FieldLabel>
            <Input id={idOf("role")} value={v.role} onChange={(e) => set("role", e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={idOf("company")}>{t.company}</FieldLabel>
            <Input id={idOf("company")} value={v.company} autoComplete="organization" onChange={(e) => set("company", e.target.value)} />
          </Field>
        </div>
      ) : null}
      {askEmail ? (
        <Field invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor={idOf("email")}>{t.email}</FieldLabel>
          <Input id={idOf("email")} ltr inputMode="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          <FieldDescription>{t.emailHint}</FieldDescription>
          {err("email")}
        </Field>
      ) : null}
      {askRating ? (
        <Field invalid={Boolean(errors.rating)}>
          <FieldLabel id={idOf("rating-label")}>{t.rating}</FieldLabel>
          <div role="group" aria-labelledby={idOf("rating-label")} id={idOf("rating")} className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = v.rating !== null && n <= v.rating;
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={t.stars(n)}
                  aria-pressed={v.rating === n}
                  onClick={() => set("rating", v.rating === n ? null : n)}
                  className="rounded-control p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                >
                  <Star aria-hidden className={cn("size-6 transition-colors", on ? "fill-nq-accent text-nq-accent" : "text-nq-line-strong")} />
                </button>
              );
            })}
          </div>
          {err("rating")}
        </Field>
      ) : null}
      <Field invalid={Boolean(errors.quote)}>
        <FieldLabel htmlFor={idOf("quote")}>{t.quote}</FieldLabel>
        <Textarea id={idOf("quote")} rows={5} value={v.quote} onChange={(e) => set("quote", e.target.value)} />
        <FieldDescription>
          <span className="tabular-nums">{formatNumber(Array.from(v.quote).length, locale)}</span> / {t.quoteHint(formatNumber(TESTIMONIAL_QUOTE_MAX, locale))}
        </FieldDescription>
        {err("quote")}
      </Field>
      {requireConsent ? (
        <Field invalid={Boolean(errors.consent)}>
          <label className="flex items-start gap-2 text-body">
            <Checkbox id={idOf("consent")} checked={v.consent} onCheckedChange={(c) => set("consent", c === true)} className="mt-1" />
            <span>{t.consent}</span>
          </label>
          {err("consent")}
        </Field>
      ) : null}
      <div aria-hidden="true" className="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
        <label>
          {t.honeypot}
          <input type="text" name={FORM_HONEYPOT} tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>
      <div>
        <Button type="submit" loading={busy}>
          {t.submit}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ display */

export type TestimonialLayout = "wall" | "grid" | "spotlight";

export interface TestimonialWallProps extends Omit<ComponentProps<"div">, "children"> {
  items: readonly Testimonial[];
  /** `wall`: masonry columns. `grid`: equal cards. `spotlight`: one large quote at a time. Default `wall`. */
  layout?: TestimonialLayout;
  /** Moderation and other actions: opened with context-click, long-press, Shift+F10 or the Menu key. */
  itemActions?: (item: Testimonial) => ContextMenuAction[];
  /** Spotlight only: move on by itself every this many milliseconds. Off by default; stops when reduced motion is preferred. */
  autoAdvance?: number;
  locale?: string;
  labels?: TestimonialLabels;
  empty?: ReactNode;
}

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-4", n <= value ? "fill-nq-accent text-nq-accent" : "text-nq-line-strong")} />
      ))}
    </span>
  );
}

function Person({ item, size = "md" }: { item: Testimonial; size?: "md" | "lg" }) {
  const sub = [item.role, item.company].filter(Boolean).join(", ");
  return (
    <figcaption className="flex min-w-0 items-center gap-3">
      <Avatar name={item.name} src={item.avatarUrl} />
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate font-medium", size === "lg" ? "text-body" : "text-body-sm")}>{item.name}</span>
        {sub ? <span className="truncate text-caption text-muted-foreground">{sub}</span> : null}
      </span>
    </figcaption>
  );
}

function Card({ item, t, actions, spotlight }: { item: Testimonial; t: (typeof STRINGS)["en"]; actions: ContextMenuAction[] | undefined; spotlight?: boolean }) {
  const figure = (
    <figure
      data-slot="testimonial"
      data-id={item.id}
      tabIndex={actions?.length ? 0 : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        spotlight ? "p-6 sm:p-10" : "p-5",
      )}
    >
      {item.rating ? <Stars value={item.rating} label={t.ratedOutOf(item.rating)} /> : null}
      <blockquote className={cn("text-pretty", spotlight ? "text-heading-3 leading-relaxed" : "text-body")}>{item.quote}</blockquote>
      <Person item={item} size={spotlight ? "lg" : "md"} />
    </figure>
  );
  return actions?.length ? <ContextMenuActions actions={actions} render={figure} /> : figure;
}

/** Testimonials as a masonry wall, an equal grid, or a spotlight that steps through them. */
export function TestimonialWall({ items, layout = "wall", itemActions, autoAdvance, locale: localeProp, labels, empty, className, ...props }: TestimonialWallProps) {
  const { t } = useStrings(labels, localeProp);
  const ordered = layout === "spotlight" ? testimonialOrder(items) : [...items];
  const [index, setIndex] = useState(0);
  const at = ordered.length ? Math.min(index, ordered.length - 1) : 0;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (layout !== "spotlight" || !autoAdvance || paused || ordered.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => testimonialStep(i, 1, ordered.length)), autoAdvance);
    return () => window.clearInterval(timer);
  }, [layout, autoAdvance, paused, ordered.length]);

  if (items.length === 0) {
    return <div className={className}>{empty ?? <EmptyState title={t.empty} />}</div>;
  }

  if (layout === "spotlight") {
    const item = ordered[at] as Testimonial;
    return (
      <section
        data-slot="testimonial-wall"
        data-layout="spotlight"
        aria-roledescription="carousel"
        className={cn("flex w-full flex-col gap-4", className)}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        {...props}
      >
        <div aria-live={paused || !autoAdvance ? "polite" : "off"}>
          <Card key={item.id} item={item} t={t} actions={itemActions?.(item)} spotlight />
        </div>
        {ordered.length > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" size="icon" aria-label={t.previous} onClick={() => setIndex(testimonialStep(at, -1, ordered.length))}>
              <ChevronLeft aria-hidden className="rtl:rotate-180" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {ordered.map((o, i) => (
                <button
                  key={o.id}
                  type="button"
                  aria-label={t.goTo(i + 1)}
                  aria-current={i === at ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  className="grid size-6 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
                >
                  <span className={cn("size-2 rounded-full transition-colors", i === at ? "bg-primary" : "bg-nq-line-strong")} />
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" size="icon" aria-label={t.next} onClick={() => setIndex(testimonialStep(at, 1, ordered.length))}>
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <div
      data-slot="testimonial-wall"
      data-layout={layout}
      className={cn(layout === "wall" ? "columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid" : "grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4", "w-full", className)}
      {...props}
    >
      {ordered.map((item) => (
        <Card key={item.id} item={item} t={t} actions={itemActions?.(item)} />
      ))}
    </div>
  );
}
