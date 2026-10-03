// nqErrorTracking: the state of the error-tracking screen. The markup is the React ErrorTracking's (see the Blade component,
// built on x-nq::entity-list); this holds which error is open, the status of every error and the resolve / ignore / reopen flow.
//
//   <div data-slot="error-tracking" x-data="nqErrorTracking({ rows: [...], texts: { errorFailed: '…', statuses: {…} } })"
//        x-on:nq-error-status="$event.detail.waitUntil(save($event.detail.id, $event.detail.status))">…</div>
//
// State: entries (the list rows; the entity list binds to them), openId (the error whose detail shows, or null), busy (the status being
// applied while the detail is open), failure (why the last change failed). Methods for your own buttons: openIssue(id), back(),
// changeStatus(id, status), statusOf(id).
// Events on the root: "nq-error-open" { id }, "nq-error-status" { id, status, previous, waitUntil(promise) }. Resolve the promise to apply
// the change; resolve { error } (or reject) to keep the old status and show why.

import type { Magics, Register } from "./types";

type Status = "unresolved" | "resolved" | "ignored";
type Row = { id: string; status: Status; statusText?: string; rank?: number; ts?: number } & Record<string, unknown>;

export interface ErrorTrackingTexts {
  errorFailed?: string;
  statuses?: Partial<Record<Status, string>>;
}
export interface ErrorTrackingConfig {
  rows?: Row[];
  /** Start with this error's detail open. */
  openId?: string | null;
  texts?: ErrorTrackingTexts;
}

interface ErrorTrackingState extends Magics {
  entries: Row[];
  openId: string | null;
  busy: Status | null;
  failure: string | null;
  texts: ErrorTrackingTexts;
  root: HTMLElement | null;
  statusOf(id: string): Status;
  changeStatus(id: string, next: Status): Promise<void>;
}

/** Unresolved first, then by severity rank, then the most recent. */
function ranked(rows: Row[]): Row[] {
  const open = (r: Row) => (r.status === "unresolved" ? 0 : 1);
  return [...rows].sort((a, b) => open(a) - open(b) || (a.rank ?? 0) - (b.rank ?? 0) || (b.ts ?? 0) - (a.ts ?? 0));
}

const ACTION_STATUS: Record<string, Status> = { resolve: "resolved", ignore: "ignored", reopen: "unresolved" };

export const errorTracking: Register = (Alpine) => {
  Alpine.data("nqErrorTracking", (config: ErrorTrackingConfig = {}) => ({
    entries: config.rows ?? [],
    openId: config.openId ?? null,
    busy: null as Status | null,
    failure: null as string | null,
    texts: config.texts ?? {},
    root: null as HTMLElement | null,
    init(this: ErrorTrackingState) {
      this.root = this.$el;
    },
    statusOf(this: ErrorTrackingState, id: string): Status {
      return this.entries.find((r) => r.id === id)?.status ?? "unresolved";
    },
    openIssue(this: ErrorTrackingState, id: string) {
      this.openId = id;
      this.failure = null;
      this.root?.dispatchEvent(new CustomEvent("nq-error-open", { bubbles: true, detail: { id } }));
    },
    back(this: ErrorTrackingState) {
      this.openId = null;
      this.failure = null;
    },
    /** The row menu and context menu of the entity list. */
    onAction(this: ErrorTrackingState & { openIssue(id: string): void }, detail: { action: string; row: Row }) {
      if (detail.action === "open") this.openIssue(detail.row.id);
      else if (ACTION_STATUS[detail.action]) void this.changeStatus(detail.row.id, ACTION_STATUS[detail.action]!);
    },
    async changeStatus(this: ErrorTrackingState, id: string, next: Status) {
      const previous = this.statusOf(id);
      const pending: Promise<unknown>[] = [];
      this.busy = this.openId === id ? next : null;
      this.failure = null;
      this.root?.dispatchEvent(
        new CustomEvent("nq-error-status", { bubbles: true, detail: { id, status: next, previous, waitUntil: (p: unknown) => void pending.push(Promise.resolve(p)) } }),
      );
      try {
        const results = (await Promise.all(pending)) as ({ error?: string } | void)[];
        const failed = results.find((r) => r && (r as { error?: string }).error) as { error?: string } | undefined;
        if (failed?.error) {
          if (this.openId === id) this.failure = failed.error;
        } else {
          this.entries = ranked(this.entries.map((r) => (r.id === id ? { ...r, status: next, statusText: this.texts.statuses?.[next] ?? next } : r)));
        }
      } catch {
        if (this.openId === id) this.failure = this.texts.errorFailed ?? "Could not update the error. Try again.";
      } finally {
        this.busy = null;
      }
    },
  }));
};
