// nqCampaignComposer: compose a broadcast by email or WhatsApp. The markup is the React CampaignComposer's (see the Blade component);
// the draft, the live count, the checks, the preview, the test dialog, the confirmation and the send progress live here.
//
//   <div data-slot="campaign-composer" x-data="nqCampaignComposer({ audiences: [...], variables: [...], labels: {...} })" x-modelable="progress"> … </div>
//
// Options: audiences [{ id, label, description?, counts? { email, whatsapp } }], variables [{ key, label, sample }], defaultValue
// { channel, audienceId, subject, body }, liveCount (ask for each count through an event instead of audience.counts), canSend,
// canSendTest (both true), sender { name, email }, testRecipient, progress { sent, failed, total } | null (x-modelable), locale, labels.
// Events (bubbling). Set event.detail.promise to a Promise (or one resolving to { error }); with no listener the action succeeds on the spot:
//   nq-campaign-count      { audienceId, channel }   promise resolves to the number of people (only with liveCount)
//   nq-campaign-send-test  { draft, to }
//   nq-campaign-send       { draft }
//   nq-campaign-stop       {}                         the Stop button of the progress bar
//   nq-campaign-change     { draft }                  the draft changed (draft is { channel, audienceId, subject, body })
// While `progress` is set the composer locks (inert) and shows the bar.

import {
  CAMPAIGN_WHATSAPP_MAX,
  campaignProgress,
  fillVariables,
  renderEmailDocument,
  validateCampaign,
  type CampaignChannel,
  type CampaignIssue,
  type EmailVariable,
} from "./campaign-composer-logic";
import type { Magics, Register } from "./types";

interface Audience {
  id: string;
  label: string;
  description?: string;
  counts?: Partial<Record<CampaignChannel, number>>;
}

interface Draft {
  channel: CampaignChannel;
  audienceId: string | null;
  subject: string;
  body: string;
}

interface Progress {
  sent: number;
  failed: number;
  total: number;
}

interface Options {
  audiences?: Audience[];
  variables?: EmailVariable[];
  defaultValue?: Partial<Draft>;
  liveCount?: boolean;
  canSend?: boolean;
  canSendTest?: boolean;
  sender?: { name: string; email: string };
  testRecipient?: string;
  progress?: Progress | null;
  locale?: string;
  labels?: Record<string, unknown>;
}

interface Note {
  tone: "success" | "danger";
  text: string;
}

type Result = { error?: string } | number | undefined | void;

interface State extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [member: string]: any;
  audiences: Audience[];
  variables: EmailVariable[];
  channel: CampaignChannel;
  audienceId: string | null;
  subject: string;
  body: string;
  count: number | null;
  countError: boolean;
  countToken: number;
  liveCount: boolean;
  canSend: boolean;
  canSendTest: boolean;
  sender: { name: string; email: string } | null;
  testRecipient: string;
  progress: Progress | null;
  locale: string;
  rtl: boolean;
  labels: Record<string, string> & { issues: Record<CampaignIssue, string>; channels: Record<CampaignChannel, string> };
  device: "desktop" | "mobile";
  testOpen: boolean;
  testTo: string;
  testBusy: boolean;
  testNote: Note | null;
  confirmOpen: boolean;
  sending: boolean;
  sendError: string | null;
  tried: boolean;
  root: HTMLElement | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{7,}$/;

export const campaignComposer: Register = (Alpine) => {
  Alpine.data("nqCampaignComposer", (options: Options = {}) => ({
    audiences: options.audiences ?? [],
    variables: options.variables ?? [],
    channel: (options.defaultValue?.channel ?? "email") as CampaignChannel,
    audienceId: (options.defaultValue?.audienceId ?? null) as string | null,
    subject: options.defaultValue?.subject ?? "",
    body: options.defaultValue?.body ?? "",
    count: null as number | null,
    countError: false,
    countToken: 0,
    liveCount: Boolean(options.liveCount),
    canSend: options.canSend !== false,
    canSendTest: options.canSendTest !== false,
    sender: options.sender ?? null,
    testRecipient: options.testRecipient ?? "",
    progress: (options.progress ?? null) as Progress | null,
    locale: options.locale ?? "en",
    rtl: (options.locale ?? "").startsWith("ar"),
    labels: (options.labels ?? {}) as State["labels"],
    device: "desktop" as "desktop" | "mobile",
    testOpen: false,
    testTo: "",
    testBusy: false,
    testNote: null as Note | null,
    confirmOpen: false,
    sending: false,
    sendError: null as string | null,
    tried: false,
    root: null as HTMLElement | null,
    whatsappMax: CAMPAIGN_WHATSAPP_MAX,

    init(this: State) {
      this.root = this.$el;
      this.loadCount();
      this.$watch("audienceId", () => this.loadCount());
      this.$watch("channel", () => this.loadCount());
      this.$watch("draft", (draft: Draft) => this.tell("nq-campaign-change", { draft }));
      this.$watch("testOpen", (open: boolean) => {
        if (!open) this.testNote = null;
      });
    },

    /* strings */
    fmt(this: State, key: string, vars: Record<string, string | number> = {}): string {
      return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), String(this.labels[key] ?? ""));
    },
    num(this: State, n: number): string {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
    },

    /* state */
    get draft(): Draft {
      const s = this as unknown as State;
      return { channel: s.channel, audienceId: s.audienceId, subject: s.subject, body: s.body };
    },
    get audience(): Audience | null {
      const s = this as unknown as State;
      return s.audiences.find((a) => a.id === s.audienceId) ?? null;
    },
    get isEmail(): boolean {
      return (this as unknown as State).channel === "email";
    },
    get locked(): boolean {
      const s = this as unknown as State;
      return s.progress !== null || s.sending;
    },
    get issues(): CampaignIssue[] {
      const s = this as unknown as State;
      return validateCampaign({
        channel: s.channel,
        audienceId: s.audienceId,
        audienceCount: s.countError ? null : s.count,
        subject: s.subject,
        body: s.body,
        knownVariables: s.variables.map((v) => v.key),
      });
    },
    get issueItems(): { key: string; text: string }[] {
      const s = this as unknown as State & { issues: CampaignIssue[] };
      return s.issues.map((key) => ({ key, text: s.labels.issues[key] ?? key }));
    },
    get ready(): boolean {
      return (this as unknown as State & { issues: CampaignIssue[] }).issues.length === 0;
    },
    get countText(): string {
      const s = this as unknown as State;
      if (s.count === null) return "";
      return `${s.num(s.count)} ${s.count === 1 ? s.labels.peopleOne : s.labels.peopleMany}`;
    },
    get countState(): "none" | "error" | "loading" | "ready" {
      const s = this as unknown as State;
      return !s.audienceId ? "none" : s.countError ? "error" : s.count === null ? "loading" : "ready";
    },
    get bodyText(): string {
      const s = this as unknown as State;
      return s.isEmail ? s.body : fillVariables(s.body, s.variables);
    },
    get charsText(): string {
      const s = this as unknown as State;
      return s.fmt("characters", { n: s.num(s.body.length), max: s.num(CAMPAIGN_WHATSAPP_MAX) });
    },
    get tooLong(): boolean {
      return (this as unknown as State).body.length > CAMPAIGN_WHATSAPP_MAX;
    },
    get previewSubject(): string {
      const s = this as unknown as State;
      return fillVariables(s.subject, s.variables) || "—";
    },
    get recipient(): string {
      const s = this as unknown as State;
      return s.variables.find((v) => v.key === "email")?.sample ?? "";
    },
    get srcdoc(): string {
      const s = this as unknown as State;
      return renderEmailDocument({ body: s.body || "<p></p>", dir: s.rtl ? "rtl" : "ltr", variables: s.variables, footer: s.labels.footerEmail });
    },
    get prog(): { percent: number; state: "sending" | "done" | "partial" } {
      const s = this as unknown as State;
      const p = s.progress ? campaignProgress(s.progress) : { percent: 0, state: "sending" as const };
      return { percent: p.percent, state: p.state };
    },
    get progLabel(): string {
      const s = this as unknown as State & { prog: { state: string } };
      return s.prog.state === "sending" ? s.labels.sending! : s.prog.state === "done" ? s.labels.done! : s.labels.partial!;
    },
    get progText(): string {
      const s = this as unknown as State;
      return s.progress ? s.fmt("sentOf", { sent: s.num(s.progress.sent), total: s.num(s.progress.total) }) : "";
    },
    get failedText(): string {
      const s = this as unknown as State;
      return s.progress ? s.fmt("failedCount", { n: s.num(s.progress.failed) }) : "";
    },
    get sendTitle(): string {
      const s = this as unknown as State;
      const n = s.count ?? 0;
      return s.fmt("sendTitle", { n: s.num(n), people: n === 1 ? s.labels.peopleOne! : s.labels.peopleMany! });
    },
    get testToLabel(): string {
      const s = this as unknown as State;
      return s.isEmail ? s.labels.testToEmail! : s.labels.testToWhatsapp!;
    },
    get testDescription(): string {
      const s = this as unknown as State;
      return s.isEmail ? s.labels.testEmail! : s.labels.testWhatsapp!;
    },

    /* actions */
    setChannel(this: State, next: CampaignChannel) {
      if (this.locked || next === this.channel) return;
      this.channel = next;
      this.body = "";
    },
    channelKey(this: State, event: KeyboardEvent) {
      const keys = this.rtl ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
      const at = keys.indexOf(event.key);
      if (at < 0) return;
      event.preventDefault();
      this.setChannel(at === 0 ? "email" : "whatsapp");
      const buttons = (this.root?.querySelectorAll<HTMLElement>('[data-slot="campaign-channel"] [data-slot="toggle"]') ?? []) as NodeListOf<HTMLElement>;
      buttons[at]?.focus();
    },
    insert(this: State, key: string) {
      if (!this.locked) this.body = `${this.body}{{${key}}}`;
    },
    tell(this: State, event: string, detail: Record<string, unknown>) {
      this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail }));
    },
    async ask(this: State, event: string, detail: Record<string, unknown>): Promise<Result> {
      const d: { promise?: unknown } & Record<string, unknown> = { ...detail };
      this.root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: d }));
      return (await d.promise) as Result;
    },
    async loadCount(this: State) {
      const token = ++this.countToken;
      this.countError = false;
      if (!this.audienceId) {
        this.count = null;
        return;
      }
      if (!this.liveCount) {
        this.count = this.audience?.counts?.[this.channel] ?? null;
        return;
      }
      this.count = null;
      try {
        const r = await this.ask("nq-campaign-count", { audienceId: this.audienceId, channel: this.channel });
        if (token === this.countToken) this.count = typeof r === "number" ? r : null;
      } catch {
        if (token === this.countToken) this.countError = true;
      }
    },
    trySend(this: State) {
      this.tried = true;
      if (this.issues.length === 0 && this.canSend) this.confirmOpen = true;
    },
    async start(this: State) {
      this.confirmOpen = false;
      this.sending = true;
      this.sendError = null;
      try {
        const r = await this.ask("nq-campaign-send", { draft: { ...this.draft } });
        if (r && typeof r === "object" && r.error) this.sendError = r.error;
      } catch {
        this.sendError = this.labels.failed ?? "";
      }
      this.sending = false;
    },
    stop(this: State) {
      this.tell("nq-campaign-stop", {});
    },
    openTest(this: State) {
      this.testTo = this.channel === "email" ? this.testRecipient : "";
      this.testNote = null;
      this.testOpen = true;
    },
    async sendTest(this: State) {
      if (this.testBusy) return;
      const to = this.testTo.trim();
      const valid = this.channel === "email" ? EMAIL_RE.test(to) : PHONE_RE.test(to);
      if (!valid) {
        this.testNote = { tone: "danger", text: this.labels.testInvalid ?? "" };
        return;
      }
      this.testBusy = true;
      this.testNote = null;
      try {
        const r = await this.ask("nq-campaign-send-test", { draft: { ...this.draft }, to });
        this.testNote = r && typeof r === "object" && r.error ? { tone: "danger", text: r.error } : { tone: "success", text: this.labels.testSent ?? "" };
      } catch {
        this.testNote = { tone: "danger", text: this.labels.failed ?? "" };
      }
      this.testBusy = false;
    },
  }));
};
