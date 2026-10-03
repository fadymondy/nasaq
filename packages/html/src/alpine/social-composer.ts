// nqSocialComposer: one post for several social networks. The markup is the React SocialComposer markup (see the Blade component);
// the draft, the per-platform counters, the checks and the custom versions live here. Nothing is ever cut for the author.
//
//   <div data-slot="social-composer" x-data="nqSocialComposer({ accounts: [...], labels: {...} })"> … </div>
//
// Options: accounts [{ id, platform, name }], defaultValue { body, variants, accountIds, media, scheduledAt }, assistFirst (the id the
// main Improve button runs), locale, labels (strings with {used} {limit} {n} {name} {max} placeholders).
// Events (bubbling). Set event.detail.promise to a Promise when the action is async:
//   nq-social-attach      { kind }               promise resolves to { id, kind, name } (or nothing); the file is added
//   nq-social-assist      { actionId, post }     the Improve button or one of its actions; write the result back with setBody()
//   nq-social-submit      { post, checks }       only fires when every target passes
//   nq-social-save-draft  { post }
//   nq-social-change      { post }
// The date and the time are x-model targets (`date` is an ISO "2026-09-30" or null, `time` is "HH:mm").

import { checkSocialPost, socialReady, socialRule, type SocialMedia, type SocialMediaKind, type SocialPlatform, type SocialPlatformCheck } from "./social-composer-logic";
import type { Magics, Register } from "./types";

interface Account {
  id: string;
  platform: SocialPlatform;
  name: string;
}

interface Post {
  body: string;
  variants: Partial<Record<SocialPlatform, string>>;
  accountIds: string[];
  media: SocialMedia[];
  scheduledAt: string | null;
}

interface Options {
  accounts?: Account[];
  defaultValue?: Partial<Post>;
  assistFirst?: string | null;
  locale?: string;
  labels?: Record<string, string>;
}

interface TargetView {
  platform: SocialPlatform;
  label: string;
  level: SocialPlatformCheck["level"];
  tone: "default" | "warning" | "danger";
  percent: number;
  lengthText: string;
  remainingText: string;
  over: boolean;
  usesVariant: boolean;
  custom: boolean;
  text: string;
  variant: string;
  problems: string[];
  linkLabel: string;
  customLabel: string;
  counterLabel: string;
}

type Customs = Partial<Record<SocialPlatform, boolean>>;
type Tell = (name: string, detail: Record<string, unknown>) => CustomEvent<{ promise?: Promise<unknown> }>;

interface State extends Magics {
  accounts: Account[];
  body: string;
  variants: Post["variants"];
  customs: Customs;
  accountIds: string[];
  media: SocialMedia[];
  date: string | null;
  time: string;
  submitting: boolean;
  locale: string;
  labels: Record<string, string>;
  assistFirst: string | null;
  root: HTMLElement | null;
  checks: SocialPlatformCheck[];
  platforms: SocialPlatform[];
  ready: boolean;
  post: Post;
  tell: Tell;
  setCustom(platform: SocialPlatform, on: boolean): void;
  fmt(key: string, vars?: Record<string, string | number>): string;
  num(n: number): string;
}

const TONE = { ok: "default", near: "warning", over: "danger" } as const;

export const socialComposer: Register = (Alpine) => {
  Alpine.data("nqSocialComposer", (options: Options = {}) => {
    const start = options.defaultValue ?? {};
    return {
      accounts: options.accounts ?? [],
      body: start.body ?? "",
      variants: { ...(start.variants ?? {}) } as Post["variants"],
      customs: Object.fromEntries(Object.keys(start.variants ?? {}).map((p) => [p, true])) as Customs,
      accountIds: [...(start.accountIds ?? [])],
      media: [...(start.media ?? [])],
      date: start.scheduledAt ? start.scheduledAt.slice(0, 10) : (null as string | null),
      time: start.scheduledAt ? start.scheduledAt.slice(11, 16) : "09:00",
      submitting: false,
      locale: options.locale ?? "en",
      labels: options.labels ?? {},
      assistFirst: options.assistFirst ?? null,
      root: null as HTMLElement | null,

      init(this: State) {
        this.root = this.$el;
        this.$watch("post", (post: Post) => this.tell("nq-social-change", { post }));
      },

      fmt(this: State, key: string, vars: Record<string, string | number> = {}): string {
        return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), String(this.labels[key] ?? ""));
      },
      num(this: State, n: number): string {
        return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
      },
      tell(this: State, name: string, detail: Record<string, unknown>) {
        const event = new CustomEvent(name, { bubbles: true, detail });
        (this.root ?? this.$el).dispatchEvent(event);
        return event as CustomEvent<{ promise?: Promise<unknown> }>;
      },

      /* state */
      get post(): Post {
        const s = this as unknown as State;
        return {
          body: s.body,
          variants: { ...s.variants },
          accountIds: [...s.accountIds],
          media: [...s.media],
          scheduledAt: s.date ? `${s.date}T${s.time || "09:00"}` : null,
        };
      },
      get platforms(): SocialPlatform[] {
        const s = this as unknown as State;
        return [...new Set(s.accounts.filter((a) => s.accountIds.includes(a.id)).map((a) => a.platform))];
      },
      get checks(): SocialPlatformCheck[] {
        const s = this as unknown as State;
        return checkSocialPost({ body: s.body, variants: s.variants, platforms: s.platforms, media: s.media });
      },
      get ready(): boolean {
        return socialReady((this as unknown as State).checks);
      },
      get accountList(): (Account & { label: string })[] {
        return (this as unknown as State).accounts.map((a) => ({ ...a, label: socialRule(a.platform).label }));
      },
      get scheduled(): boolean {
        return Boolean((this as unknown as State).date);
      },
      get hasTargets(): boolean {
        return (this as unknown as State).checks.length > 0;
      },
      get targets(): TargetView[] {
        const s = this as unknown as State;
        return s.checks.map((c) => {
          const rule = socialRule(c.platform);
          const custom = Boolean(s.customs[c.platform]);
          return {
            platform: c.platform,
            label: rule.label,
            level: c.level,
            tone: TONE[c.level],
            percent: Math.min(100, (c.length / c.limit) * 100),
            lengthText: s.fmt("chars", { used: s.num(c.length), limit: s.num(c.limit) }),
            remainingText: c.remaining < 0 ? s.fmt("over", { n: s.num(-c.remaining) }) : s.fmt("left", { n: s.num(c.remaining) }),
            over: c.level === "over",
            usesVariant: c.usesVariant,
            custom,
            text: c.text,
            variant: s.variants[c.platform] ?? "",
            problems: c.problems.map((p) =>
              p === "media"
                ? s.labels[(rule.requiresMedia ?? "image") === "image" ? "problemMediaImage" : "problemMediaVideo"]!
                : p === "hashtags"
                  ? s.fmt("problemHashtags", { max: rule.maxHashtags ?? 0 })
                  : s.labels[p === "empty" ? "problemEmpty" : "problemOver"]!,
            ),
            linkLabel: custom ? s.labels.useShared! : s.labels.customVersion!,
            customLabel: `${rule.label} — ${s.labels.custom}`,
            counterLabel: s.fmt("counter", { name: rule.label }),
          };
        });
      },

      /* actions */
      selected(this: State, id: string): boolean {
        return this.accountIds.includes(id);
      },
      selectedAttr(this: State, id: string): string | null {
        return this.accountIds.includes(id) ? "" : null;
      },
      toggleAccount(this: State, id: string) {
        this.accountIds = this.accountIds.includes(id) ? this.accountIds.filter((x) => x !== id) : [...this.accountIds, id];
      },
      setBody(this: State, body: string) {
        this.body = body;
      },
      setCustom(this: State, platform: SocialPlatform, on: boolean) {
        this.customs = { ...this.customs, [platform]: on };
        const variants = { ...this.variants };
        if (on) variants[platform] = variants[platform] ?? this.body;
        else delete variants[platform];
        this.variants = variants;
      },
      toggleCustom(this: State, platform: SocialPlatform) {
        this.setCustom(platform, !this.customs[platform]);
      },
      setVariant(this: State, platform: SocialPlatform, value: string) {
        this.variants = { ...this.variants, [platform]: value };
      },
      async attach(this: State, kind: SocialMediaKind) {
        const event = this.tell("nq-social-attach", { kind });
        const media = (await event.detail.promise) as SocialMedia | null | undefined;
        if (media && typeof media === "object") this.media = [...this.media, media];
      },
      attachImage(this: State & { attach(kind: SocialMediaKind): Promise<void> }) {
        return this.attach("image");
      },
      attachVideo(this: State & { attach(kind: SocialMediaKind): Promise<void> }) {
        return this.attach("video");
      },
      removeMedia(this: State, id: string) {
        this.media = this.media.filter((m) => m.id !== id);
      },
      clearSchedule(this: State) {
        this.date = null;
      },
      assist(this: State, id: string | null) {
        this.tell("nq-social-assist", { actionId: id ?? this.assistFirst ?? "", post: this.post });
      },
      async submit(this: State) {
        if (!this.ready || this.submitting) return;
        const event = this.tell("nq-social-submit", { post: this.post, checks: this.checks });
        if (!event.detail.promise) return;
        this.submitting = true;
        try {
          await event.detail.promise;
        } finally {
          this.submitting = false;
        }
      },
      saveDraft(this: State) {
        this.tell("nq-social-save-draft", { post: this.post });
      },
    };
  });
};
