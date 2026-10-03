// nqSubscriptionLanding: the state of the subscribe, confirm and unsubscribe pages of an email list. The markup is the React
// SubscriptionLanding's, rendered by Blade; the stages and validation live here (the helpers below are
// subscription-landing-logic.ts of packages/web, copied).
//
//   <div data-slot="subscription-landing" x-data="nqSubscriptionLanding({ mode: 'subscribe', email, labels })"
//        x-on:nq-subscribe="$event.detail.waitUntil(subscribe($event.detail))">
//     <form x-show="stage === 'form'" x-on:submit.prevent="submitSubscribe()"> … x-model="email" x-model="consent" … </form>
//   </div>
//
// It dispatches from the root: nq-subscribe { email, name, waitUntil }, nq-confirm, nq-unsubscribe { reason, note }, nq-resubscribe.
// Each carries waitUntil(promise). Resolve nothing for success, or { error: "…" } to show a message; a rejection shows the generic
// error. With no listener the page moves on at once. The consent box is never pre-ticked; confirm and unsubscribe never run on load.

import type { Magics, Register } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isSubscriberEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function maskSubscriberEmail(value: string): string {
  const v = value.trim();
  const at = v.lastIndexOf("@");
  if (at < 1) return v;
  return `${v[0]}***${v.slice(at)}`;
}

type Issue = "email-empty" | "email-invalid" | "consent-missing";

function validateSubscription(input: { email: string; consent: boolean; requireConsent?: boolean }): Issue[] {
  const issues: Issue[] = [];
  if (!input.email.trim()) issues.push("email-empty");
  else if (!isSubscriberEmail(input.email)) issues.push("email-invalid");
  if ((input.requireConsent ?? true) && !input.consent) issues.push("consent-missing");
  return issues;
}

const STRINGS = {
  en: {
    pendingBody: "We sent a confirmation link to {email}. Your subscription starts when you open it.",
    confirmBody: "Confirm that {email} should get our emails.",
    unsubscribeBody: "Stop emails to {email}.",
    unsubscribedBody: "{email} will not get any more emails from us.",
    failed: "That did not work. Try again.",
    "email-empty": "Enter your email address.",
    "email-invalid": "That does not look like an email address.",
    "consent-missing": "Tick the box to agree.",
  },
  ar: {
    pendingBody: "أرسلنا رابط تأكيد إلى {email}. يبدأ اشتراكك عند فتحه.",
    confirmBody: "أكّد أن {email} يريد استلام رسائلنا.",
    unsubscribeBody: "إيقاف الرسائل إلى {email}.",
    unsubscribedBody: "لن يصل {email} أي بريد آخر منا.",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    "email-empty": "أدخل بريدك الإلكتروني.",
    "email-invalid": "لا يبدو هذا بريدًا إلكترونيًا.",
    "consent-missing": "ضع علامة للموافقة.",
  },
};

type Stage = "form" | "pending" | "done" | "undone";
type Result = void | { error?: string };

interface Config {
  mode?: "subscribe" | "confirm" | "unsubscribe";
  /** The address from the email link (confirm and unsubscribe pages). */
  email?: string;
  labels?: Partial<typeof STRINGS.en>;
}

interface State extends Magics {
  stage: Stage;
  name: string;
  email: string;
  consent: boolean;
  reason: string;
  note: string;
  busy: boolean;
  error: string;
  tried: boolean;
  emailBad: boolean;
  root: HTMLElement | null;
  run(event: string, detail: Record<string, unknown>, next: Stage): Promise<void>;
}

export const subscriptionLanding: Register = (Alpine) => {
  Alpine.data("nqSubscriptionLanding", (config: Config = {}) => {
    const t = { ...STRINGS[(document.documentElement.lang || "en").toLowerCase().startsWith("ar") ? "ar" : "en"], ...config.labels };
    const fill = (s: string, email: string) => s.replace("{email}", email);
    return {
      stage: "form" as Stage,
      name: "",
      email: config.email ?? "",
      consent: false,
      reason: "",
      note: "",
      busy: false,
      error: "",
      tried: false,
      emailBad: false,
      root: null as HTMLElement | null,
      init(this: State) {
        this.root = this.$el;
      },
      get issues(): Issue[] {
        return validateSubscription({ email: this.email, consent: this.consent });
      },
      /** The email message to show after a first try, or "". */
      get emailIssue(): string {
        const i = (this as unknown as State & { issues: Issue[] }).issues;
        if (!this.tried) return "";
        return i.includes("email-empty") ? t["email-empty"] : i.includes("email-invalid") ? t["email-invalid"] : "";
      },
      get consentIssue(): string {
        const i = (this as unknown as State & { issues: Issue[] }).issues;
        return this.tried && i.includes("consent-missing") ? t["consent-missing"] : "";
      },
      get shown(): string {
        return maskSubscriberEmail(config.email ?? this.email);
      },
      get pendingText(): string {
        return fill(t.pendingBody, this.email.trim());
      },
      get confirmText(): string {
        return fill(t.confirmBody, this.shown);
      },
      get unsubscribeText(): string {
        return fill(t.unsubscribeBody, this.shown);
      },
      get unsubscribedText(): string {
        return fill(t.unsubscribedBody, this.shown);
      },
      async run(this: State, event: string, detail: Record<string, unknown>, next: Stage) {
        this.busy = true;
        this.error = "";
        const pending: unknown[] = [];
        try {
          this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void pending.push(p) } }));
          const results = (await Promise.all(pending)) as Result[];
          const failed = results.find((r) => r && typeof r === "object" && r.error);
          if (failed && failed.error) this.error = failed.error;
          else this.stage = next;
        } catch {
          this.error = t.failed;
        } finally {
          this.busy = false;
        }
      },
      submitSubscribe(this: State & { issues: Issue[] }) {
        this.tried = true;
        this.emailBad = this.issues.includes("email-empty") || this.issues.includes("email-invalid");
        if (this.issues.length) return;
        void this.run("nq-subscribe", { email: this.email.trim(), name: this.name.trim() || undefined }, "pending");
      },
      startOver(this: State) {
        this.stage = "form";
        this.consent = false;
        this.tried = false;
        this.emailBad = false;
      },
      confirm(this: State) {
        void this.run("nq-confirm", {}, "done");
      },
      unsubscribe(this: State) {
        void this.run("nq-unsubscribe", { reason: this.reason || undefined, note: this.note.trim() || undefined }, "done");
      },
      resubscribe(this: State) {
        void this.run("nq-resubscribe", {}, "undone");
      },
    };
  });
};
