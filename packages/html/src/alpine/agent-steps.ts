// nqAgentSteps, nqAgentConfirm and nqAgentDiff: the tool calls an agent made, the human-in-the-loop confirm before it
// acts, and the line diff between them. The markup is the React AgentSteps / AgentConfirm / AgentDiff (see the Blade
// components); the state lives here. Nothing here runs the agent's work: events hand the decision to your code.
//
//   <section data-slot="agent-steps" x-data="nqAgentSteps([{ id: 's1', label: 'Read tags', status: 'done' }], { redactKeys: ['token'], retry: true })">…</section>
//   <section data-slot="agent-confirm" x-data="nqAgentConfirm([{ id: 'c1', title: 'Rename', before: 'a', after: 'b' }], { requireReason: false })">…</section>
//   <div x-data="nqAgentDiff({ before: 'a', after: 'b', context: 2 })">…</div>
//
// Events (bubbling, from the root):
//   nqAgentSteps    "retry"   { id }
//   nqAgentConfirm  "apply"   { ids, wait(promise) }       wait() holds the busy state until the promise settles; resolve
//                   "reject"  { reason, wait(promise) }    { error } or reject it to show a failure and keep the choice open.
//                   "decided" { decision: "applied" | "rejected" }   after a successful apply or reject.
// `steps` / `changes` are x-modelable. Options: nqAgentSteps { redactKeys, defaultOpenIds, retry };
// nqAgentConfirm { requireReason, defaultUnchecked, defaultOpenIds }.

import {
  agentChangeKind,
  agentHighestRisk,
  agentRunState,
  agentStepCounts,
  currentStep,
  resultLanguage,
  selectedChangeIds,
  stringifyArgs,
  totalDurationMs,
  type AgentChange,
  type AgentRisk,
  type AgentStep,
} from "./agent-steps-logic";
import type { Magics, Register } from "./types";
import { diffLines, diffStats, foldDiff, type DiffItem } from "./version-history-logic";

interface Nq {
  t(en: string, ar: string): string;
  locale: string;
}
type Result = void | { error?: string };

const durationText = (locale: string, ms: number) => {
  const sub = ms < 1000;
  return new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "unit", unit: sub ? "millisecond" : "second", unitDisplay: "narrow", maximumFractionDigits: 1 }).format(sub ? ms : ms / 1000);
};

interface StepsState extends Magics {
  $nq: Nq;
  steps: AgentStep[];
  redactKeys: string[];
  defaultOpenIds: string[];
  canRetry: boolean;
  toggled: Record<string, boolean>;
  root: HTMLElement;
  isOpen(step: AgentStep): boolean;
}

interface ConfirmState extends Magics {
  $nq: Nq;
  changes: AgentChange[];
  picked: Record<string, boolean>;
  toggled: Record<string, boolean>;
  defaultUnchecked: string[];
  defaultOpenIds: string[] | null;
  requireReason: boolean;
  reviewed: boolean;
  busy: "apply" | "reject" | null;
  error: string | null;
  decision: "applied" | "rejected" | null;
  appliedCount: number;
  rejecting: boolean;
  reason: string;
  touched: boolean;
  root: HTMLElement;
  seed(): void;
  ids(): string[];
  chosen(): AgentChange[];
  needsReview(): boolean;
  canApply(): boolean;
  isOpen(change: AgentChange, index: number): boolean;
  run(kind: "apply" | "reject", name: string, detail: Record<string, unknown>): Promise<boolean>;
}

export const agentSteps: Register = (Alpine) => {
  Alpine.data("nqAgentSteps", (initial: AgentStep[] = [], options: { redactKeys?: string[]; defaultOpenIds?: string[]; retry?: boolean } = {}) => ({
    steps: initial,
    redactKeys: options.redactKeys ?? [],
    defaultOpenIds: options.defaultOpenIds ?? [],
    canRetry: options.retry ?? false,
    toggled: {} as Record<string, boolean>,
    root: null as unknown as HTMLElement,
    init(this: StepsState) {
      this.root = this.$el;
    },
    state(this: StepsState) {
      return agentRunState(this.steps);
    },
    isOpen(this: StepsState, step: AgentStep) {
      return step.id in this.toggled ? this.toggled[step.id] : this.defaultOpenIds.includes(step.id) || step.status === "awaiting";
    },
    toggle(this: StepsState, step: AgentStep) {
      this.toggled = { ...this.toggled, [step.id]: !this.isOpen(step) };
    },
    /** The steps with everything a row needs worked out. */
    rows(this: StepsState) {
      return this.steps.map((s, i) => {
        const argsText = stringifyArgs(s.args, this.redactKeys);
        return {
          ...s,
          last: i === this.steps.length - 1,
          argsText,
          hasDetails: argsText !== "" || Boolean(s.result) || Boolean(s.error),
          open: this.isOpen(s),
          lang: s.result ? resultLanguage(s) : "text",
          duration: s.durationMs !== undefined && s.status !== "pending" ? durationText(this.$nq.locale, s.durationMs) : "",
        };
      });
    },
    summary(this: StepsState) {
      const t = this.$nq.t.bind(this.$nq);
      const state = agentRunState(this.steps);
      if (state === "awaiting") return t("Waiting for your approval", "بانتظار موافقتك");
      if (state === "error") return t("A step failed", "فشلت إحدى الخطوات");
      if (state === "done") return t("All steps done", "اكتملت كل الخطوات");
      if (state === "running") {
        const current = currentStep(this.steps);
        const n = current ? this.steps.indexOf(current) + 1 : 0;
        const total = agentStepCounts(this.steps).total;
        return `${t("Working", "جارٍ العمل")}. ${t(`Step ${n} of ${total}`, `الخطوة ${n} من ${total}`)}`;
      }
      return t("No steps yet", "لا توجد خطوات بعد");
    },
    totalText(this: StepsState) {
      const total = totalDurationMs(this.steps);
      return agentRunState(this.steps) === "done" && total > 0 ? durationText(this.$nq.locale, total) : "";
    },
    showRetry(this: StepsState, step: AgentStep) {
      return this.canRetry && step.status === "error";
    },
    retry(this: StepsState, id: string) {
      this.root.dispatchEvent(new CustomEvent("retry", { bubbles: true, detail: { id } }));
    },
  }));

  Alpine.data("nqAgentDiff", (config: { before?: string; after?: string; context?: number } = {}) => ({
    before: config.before ?? "",
    after: config.after ?? "",
    context: config.context ?? 2,
    /** The folded diff rows, or [] when the texts do not differ. */
    diffItems(this: { before: string; after: string; context: number }): DiffItem[] {
      const lines = diffLines(this.before, this.after);
      return diffStats(lines).changed ? foldDiff(lines, this.context) : [];
    },
  }));

  Alpine.data("nqAgentConfirm", (initial: AgentChange[] = [], options: { requireReason?: boolean; defaultUnchecked?: string[]; defaultOpenIds?: string[] } = {}) => ({
    changes: initial,
    picked: {} as Record<string, boolean>,
    toggled: {} as Record<string, boolean>,
    defaultUnchecked: options.defaultUnchecked ?? [],
    defaultOpenIds: options.defaultOpenIds ?? null,
    requireReason: options.requireReason ?? false,
    reviewed: false,
    busy: null as "apply" | "reject" | null,
    error: null as string | null,
    decision: null as "applied" | "rejected" | null,
    appliedCount: 0,
    rejecting: false,
    reason: "",
    touched: false,
    root: null as unknown as HTMLElement,
    init(this: ConfirmState) {
      this.root = this.$el;
      this.seed();
      this.$watch("changes", () => this.seed());
      // Ticking or unticking a change asks for the high risk acknowledgement again.
      this.$watch("picked", () => {
        this.reviewed = false;
      });
    },
    seed(this: ConfirmState) {
      const next = { ...this.picked };
      let added = false;
      for (const c of this.changes) {
        if (!(c.id in next)) {
          next[c.id] = !this.defaultUnchecked.includes(c.id);
          added = true;
        }
      }
      if (added) this.picked = next;
    },
    ids(this: ConfirmState) {
      return selectedChangeIds(this.changes, new Set(this.changes.filter((c) => this.picked[c.id]).map((c) => c.id)));
    },
    chosen(this: ConfirmState) {
      return this.changes.filter((c) => this.picked[c.id]);
    },
    selectable(this: ConfirmState) {
      return this.changes.length > 1;
    },
    needsReview(this: ConfirmState) {
      return agentHighestRisk(this.chosen()) === "high";
    },
    canApply(this: ConfirmState) {
      return this.ids().length > 0 && (!this.needsReview() || this.reviewed) && this.busy === null;
    },
    riskHint(this: ConfirmState) {
      return this.needsReview() && !this.reviewed ? this.$id("nq-agent-confirm", "risk") : null;
    },
    overall(this: ConfirmState): AgentRisk {
      return agentHighestRisk(this.changes);
    },
    applyLabel(this: ConfirmState) {
      const n = this.ids().length;
      return this.changes.length > 1 && n !== this.changes.length ? this.$nq.t(`Apply ${n}`, `تطبيق ${n}`) : this.$nq.t("Apply all", "تطبيق الكل");
    },
    selectedText(this: ConfirmState) {
      const n = this.ids().length;
      if (n === 0) return this.$nq.t("Select at least one change to apply", "حدّد تغييرًا واحدًا على الأقل للتطبيق");
      const total = this.changes.length;
      return total > 1 ? this.$nq.t(`${n} of ${total} selected`, `تم تحديد ${n} من ${total}`) : "";
    },
    appliedText(this: ConfirmState) {
      const n = this.appliedCount;
      const ar = n === 1 ? "تم تطبيق تغيير واحد." : n === 2 ? "تم تطبيق تغييرين." : `تم تطبيق ${n} تغييرات.`;
      return this.$nq.t(n === 1 ? "1 change was applied." : `${n} changes were applied.`, ar);
    },
    kind(change: AgentChange) {
      return agentChangeKind(change);
    },
    kindText(this: ConfirmState, change: AgentChange) {
      const kind = agentChangeKind(change);
      return kind === "create" ? this.$nq.t("New", "جديد") : kind === "delete" ? this.$nq.t("Delete", "حذف") : this.$nq.t("Edit", "تعديل");
    },
    riskText(this: ConfirmState, risk: AgentRisk | undefined) {
      return risk === "high" ? this.$nq.t("High risk", "خطورة عالية") : risk === "medium" ? this.$nq.t("Medium risk", "خطورة متوسطة") : this.$nq.t("Low risk", "خطورة منخفضة");
    },
    stats(change: AgentChange) {
      return diffStats(diffLines(change.before ?? "", change.after ?? ""));
    },
    diffOf(change: AgentChange): DiffItem[] {
      const lines = diffLines(change.before ?? "", change.after ?? "");
      return diffStats(lines).changed ? foldDiff(lines, 2) : [];
    },
    isOpen(this: ConfirmState, change: AgentChange, index: number) {
      if (change.id in this.toggled) return this.toggled[change.id];
      return this.defaultOpenIds ? this.defaultOpenIds.includes(change.id) : index === 0;
    },
    toggle(this: ConfirmState, change: AgentChange, index: number) {
      this.toggled = { ...this.toggled, [change.id]: !this.isOpen(change, index) };
    },
    /** Dispatches the event and waits for whatever the host passed to detail.wait(). True when it went through. */
    async run(this: ConfirmState, kind: "apply" | "reject", name: string, detail: Record<string, unknown>) {
      this.busy = kind;
      this.error = null;
      let pending: Promise<Result> | null = null;
      const wait = (p: Promise<Result> | Result) => {
        pending = Promise.resolve(p);
      };
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait } }));
      try {
        const r = pending ? await (pending as Promise<Result>) : undefined;
        if (r && r.error) {
          this.error = r.error;
          this.busy = null;
          return false;
        }
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : this.$nq.t("Could not apply the changes. Nothing was changed.", "تعذّر تطبيق التغييرات. لم يتغير شيء.");
        this.busy = null;
        return false;
      }
      this.busy = null;
      return true;
    },
    async apply(this: ConfirmState) {
      if (!this.canApply()) return;
      const ids = this.ids();
      if (await this.run("apply", "apply", { ids })) {
        this.appliedCount = ids.length;
        this.decision = "applied";
        this.root.dispatchEvent(new CustomEvent("decided", { bubbles: true, detail: { decision: "applied" } }));
      }
    },
    askReject(this: ConfirmState) {
      this.rejecting = true;
      this.touched = false;
      this.error = null;
    },
    cancelReject(this: ConfirmState) {
      if (this.busy === null) this.rejecting = false;
    },
    reasonMissing(this: ConfirmState) {
      return this.requireReason && this.touched && this.reason.trim() === "";
    },
    async reject(this: ConfirmState) {
      this.touched = true;
      if (this.requireReason && this.reason.trim() === "") return;
      const reason = this.reason.trim() === "" ? undefined : this.reason.trim();
      if (await this.run("reject", "reject", { reason })) {
        this.rejecting = false;
        this.decision = "rejected";
        this.root.dispatchEvent(new CustomEvent("decided", { bubbles: true, detail: { decision: "rejected" } }));
      }
    },
  }));
};
