// nqTestimonialForm and nqTestimonialWall: the behaviour of the testimonial submit form and the testimonial display.
// The markup is the React one (see the Blade testimonials components); the shared submit plumbing is login-form-logic.ts.
//
//   <form data-slot="testimonial-form" x-data="nqTestimonialForm({ requireConsent, requireRating, errors, failed })"
//         x-on:nq-testimonial="$event.detail.waitUntil(send($event.detail.data))">
//   <div data-slot="testimonial-wall" x-data="nqTestimonialWall({ count, autoAdvance })"
//         x-on:nq-testimonial-action="remove($event.detail.id)">
//
// Form: `v` holds the answers (controls bind with x-model), `done` shows the thank-you. nq-testimonial { data, waitUntil(promise) }
// bubbles from the form; resolve nothing for success or { error } to keep the form. A filled honeypot (`trap`) never fires it.
// Wall: `at` is the spotlight slide (stepped by step(), go(), and autoAdvance unless paused or reduced motion is on).
// nq-testimonial-action { action, id } bubbles from the wall when a card's context menu item runs.

import { authBase, type AuthState } from "./login-form-logic";
import { testimonialStep, validateTestimonial, type TestimonialErrorCode, type TestimonialSubmission } from "./testimonials-logic";
import type { Register } from "./types";

type Field = "name" | "quote" | "rating" | "email" | "consent";
const ORDER: Field[] = ["name", "quote", "email", "rating", "consent"];

interface FormConfig {
  requireConsent?: boolean;
  requireRating?: boolean;
  errors?: Partial<Record<TestimonialErrorCode, string>>;
  failed?: string;
  locale?: string;
}
interface FormState extends AuthState {
  v: TestimonialSubmission;
  trap: string;
  done: boolean;
  snapshot: TestimonialSubmission;
  length(): number;
  num(n: number): string;
  starClass(n: number): string;
  setRating(n: number): void;
  onSubmit(): Promise<void>;
  again(): void;
}

const ERRORS: Record<TestimonialErrorCode, string> = {
  name: "Enter your name.",
  "quote-short": "Write a little more.",
  "quote-long": "That is too long.",
  rating: "Pick a rating from 1 to 5.",
  email: "Enter a valid email address.",
  consent: "Please agree so we can show it.",
};

const blank = (): TestimonialSubmission => ({ name: "", role: "", company: "", email: "", quote: "", rating: null, consent: false });

interface WallConfig {
  count?: number;
  autoAdvance?: number;
}
interface WallState {
  at: number;
  count: number;
  auto: boolean;
  paused: boolean;
  root: HTMLElement | undefined;
  timer: ReturnType<typeof setInterval> | undefined;
  $el: HTMLElement;
  $watch<T>(key: string, fn: (value: T) => void): void;
  restart(): void;
  isAt(i: number): boolean;
  step(by: number): void;
  go(i: number): void;
  act(action: string, id: string): void;
}

export const testimonials: Register = (Alpine) => {
  Alpine.data("nqTestimonialForm", (config: FormConfig = {}) => {
    const messages = { ...ERRORS, ...config.errors };
    return {
      ...authBase({ names: ORDER, failed: config.failed }),
      v: blank(),
      trap: "",
      done: false,
      snapshot: blank(),
      init(this: FormState) {
        this.authInit(this.$el);
        // An edited answer clears its own error.
        this.$watch("v", (now: TestimonialSubmission) => {
          for (const key of ORDER) if (now[key as keyof TestimonialSubmission] !== this.snapshot[key as keyof TestimonialSubmission]) this.clear(key);
          this.snapshot = { ...now };
        });
      },
      destroy(this: FormState) {
        this.authDestroy();
      },
      /** The characters of the quote, as the counter counts them. */
      length(this: FormState) {
        return Array.from(this.v.quote).length;
      },
      /** A number in the locale with Latin digits. */
      num(this: FormState, n: number) {
        return new Intl.NumberFormat(`${config.locale ?? "en"}-u-nu-latn`).format(n);
      },
      starClass(this: FormState, n: number) {
        return this.v.rating !== null && n <= this.v.rating ? "fill-nq-accent text-nq-accent" : "text-nq-line-strong";
      },
      setRating(this: FormState, n: number) {
        this.v.rating = this.v.rating === n ? null : n;
      },
      async onSubmit(this: FormState) {
        const found = validateTestimonial(this.v, { requireConsent: config.requireConsent !== false, requireRating: Boolean(config.requireRating) });
        const local = Object.fromEntries(Object.entries(found).map(([k, code]) => [k, messages[code as TestimonialErrorCode]]));
        this.error = "";
        if (Object.keys(local).length) {
          this.setErrors(local);
          const first = ORDER.find((k) => found[k]);
          this.$nextTick(() => this.authRoot?.querySelector<HTMLElement>(`[data-field="${first}"] :is(input, textarea, button):not([type=hidden])`)?.focus());
          return;
        }
        if (this.trap.trim() !== "") {
          this.setErrors({});
          this.done = true;
          return;
        }
        const s = this.v;
        const data = { ...s, name: s.name.trim(), role: s.role.trim(), company: s.company.trim(), email: s.email.trim(), quote: s.quote.trim() };
        await this.submitWith("nq-testimonial", { data }, {}, { onOk: () => (this.done = true) });
      },
      again(this: FormState) {
        this.v = blank();
        this.snapshot = blank();
        this.done = false;
      },
    };
  });

  Alpine.data("nqTestimonialWall", (config: WallConfig = {}) => ({
    at: 0,
    count: config.count ?? 0,
    auto: (config.autoAdvance ?? 0) > 0,
    paused: false,
    root: undefined as HTMLElement | undefined,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    init(this: WallState) {
      this.root = this.$el;
      this.$watch("paused", () => this.restart());
      this.restart();
    },
    destroy(this: WallState) {
      clearInterval(this.timer);
    },
    /** Starts (or stops) the auto-advance timer: off when paused, with one slide, or when reduced motion is preferred. */
    restart(this: WallState) {
      clearInterval(this.timer);
      this.timer = undefined;
      if (!this.auto || this.paused || this.count < 2) return;
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      this.timer = setInterval(() => this.step(1), config.autoAdvance);
    },
    isAt(this: WallState, i: number) {
      return this.at === i;
    },
    step(this: WallState, by: number) {
      this.at = testimonialStep(this.at, by, this.count);
    },
    go(this: WallState, i: number) {
      this.at = i;
    },
    act(this: WallState, action: string, id: string) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-testimonial-action", { bubbles: true, detail: { action, id } }));
    },
  }));
};
