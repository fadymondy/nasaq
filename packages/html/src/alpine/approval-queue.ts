// nqApprovalQueue: a pending-first queue of things waiting for a decision. The markup is the React ApprovalQueue's (see the Blade
// component); the state lives here. It has no backend: Approve, Reject (with a required reason) and Convert dispatch bubbling
// events and, unless `optimistic: false`, mark the item decided locally so the queue updates at once.
//
//   <section data-slot="approval-queue" x-data="nqApprovalQueue([{ id: 'a1', kind: 'action', status: 'pending', title: '…', createdAt: 1700000000000 }], { convert: true })">…</section>
//
// Events (bubbling): "approve" { id }, "reject" { id, reason }, "convert" { id }. `items` is x-modelable.
// Options: defaultFilter (pending | decided | all), convert (show the convert button), now (reference time), optimistic.

import {
  approvalStatus,
  canApprove,
  canDecide,
  pendingCount,
  redactArgs,
  sortQueue,
  toMs,
  unmetCriteria,
  type ApprovalItem,
} from "./approval-queue-logic";
import type { Magics, Register } from "./types";

type Filter = "pending" | "decided" | "all";

export interface ApprovalQueueOptions {
  defaultFilter?: Filter;
  convert?: boolean;
  now?: number;
  optimistic?: boolean;
}

interface QueueState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  items: ApprovalItem[];
  filter: Filter;
  rejecting: ApprovalItem | null;
  reason: string;
  touched: boolean;
  root: HTMLElement;
  convert: boolean;
  optimistic: boolean;
  fixedNow: number | undefined;
  clock(): number;
  rows(): ApprovalItem[];
  waiting(): number;
  waitingText(): string;
  relative(value: ApprovalItem["createdAt"]): string;
  fire(name: string, detail: unknown): void;
  decide(id: string, status: ApprovalItem["status"], reason?: string): void;
}

export const approvalQueue: Register = (Alpine) => {
  Alpine.data("nqApprovalQueue", (initial: ApprovalItem[] = [], options: ApprovalQueueOptions = {}) => ({
    items: initial,
    filter: (options.defaultFilter ?? "pending") as Filter,
    rejecting: null as ApprovalItem | null,
    reason: "",
    touched: false,
    root: null as unknown as HTMLElement,
    convert: options.convert ?? false,
    optimistic: options.optimistic !== false,
    fixedNow: options.now,
    init(this: QueueState) {
      this.root = this.$el;
    },
    clock(this: QueueState) {
      return this.fixedNow ?? Date.now();
    },
    status(this: QueueState, item: ApprovalItem) {
      return approvalStatus(item, this.clock());
    },
    rows(this: QueueState) {
      const now = this.clock();
      return sortQueue(this.items, now)
        .filter((i) => {
          const pending = approvalStatus(i, now) === "pending";
          return this.filter === "all" || (this.filter === "pending" ? pending : !pending);
        })
        .map((i) => ({
          ...i,
          shown: approvalStatus(i, now),
          decidable: canDecide(i, now),
          approvable: canApprove(i, now),
          unmet: unmetCriteria(i).length,
          argRows: redactArgs(i.args, i.redact),
          expiresText: i.expiresAt !== undefined ? this.relative(i.expiresAt) : "",
          createdText: this.relative(i.createdAt),
          decidedText: i.decidedAt !== undefined ? this.relative(i.decidedAt) : "",
        }));
    },
    waiting(this: QueueState) {
      return pendingCount(this.items, this.clock());
    },
    waitingText(this: QueueState) {
      const n = this.waiting();
      const t = this.$nq.t.bind(this.$nq);
      if (n === 0) return t("Nothing is waiting for you", "لا شيء ينتظرك");
      if (this.$nq.locale.startsWith("ar")) return n === 1 ? "طلب واحد ينتظرك" : n === 2 ? "طلبان ينتظرانك" : n <= 10 ? `${n} طلبات تنتظرك` : `${n} طلبًا ينتظرك`;
      return n === 1 ? "1 waiting for you" : `${n} waiting for you`;
    },
    relative(this: QueueState, value: ApprovalItem["createdAt"]) {
      const diff = toMs(value) - this.clock();
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];
      const rtf = new Intl.RelativeTimeFormat(`${this.$nq.locale}-u-nu-latn`, { numeric: "auto" });
      for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
      return rtf.format(Math.round(diff / 1000), "second");
    },
    fire(this: QueueState, name: string, detail: unknown) {
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    decide(this: QueueState, id: string, status: ApprovalItem["status"], reason?: string) {
      if (!this.optimistic) return;
      this.items = this.items.map((i) => (i.id === id ? { ...i, status, ...(reason ? { reason } : {}), decidedAt: this.clock() } : i));
    },
    approve(this: QueueState, id: string) {
      const item = this.items.find((i) => i.id === id);
      if (!item || !canApprove(item, this.clock())) return;
      this.fire("approve", { id });
      this.decide(id, "approved");
    },
    askReject(this: QueueState, id: string) {
      this.rejecting = this.items.find((i) => i.id === id) ?? null;
      this.reason = "";
      this.touched = false;
    },
    cancelReject(this: QueueState) {
      this.rejecting = null;
    },
    submitReject(this: QueueState) {
      this.touched = true;
      const reason = this.reason.trim();
      if (!this.rejecting || reason === "") return;
      const id = this.rejecting.id;
      this.fire("reject", { id, reason });
      this.decide(id, "rejected", reason);
      this.rejecting = null;
    },
    toConvert(this: QueueState, id: string) {
      this.fire("convert", { id });
      this.decide(id, "converted");
    },
  }));
};
