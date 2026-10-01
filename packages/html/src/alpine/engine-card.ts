// nqEngineCard: the log actions of an engine card. The markup is the React EngineCard's, rendered by <x-nq::engine-card actions>.
//
//   <div x-data="nqEngineCard"> <button x-on:click="act('log_unit')" x-bind:disabled="busy">Log</button>
//     <p x-show="error" x-text="error"></p> </div>
//
// act(kind, doseId?) marks the card busy and dispatches a bubbling "nq-engine-action" event with
// { engine, kind, doseId, wait(promise) }. A listener hands wait() a promise resolving with nothing or { error }: the card stays busy
// until it settles and shows the error as-is. A promise that rejects shows the generic "try again" message. No listener, no wait: done at once.

import type { Magics, Register } from "./types";

interface ActionDetail {
  engine: string;
  kind: string;
  doseId?: string;
  wait(promise: Promise<unknown>): void;
}

interface CardState extends Magics {
  pending: string | null;
  error: string | null;
  readonly busy: boolean;
  act(kind: string, doseId?: string): Promise<void>;
}

export const engineCard: Register = (Alpine) => {
  Alpine.data("nqEngineCard", () => ({
    pending: null as string | null,
    error: null as string | null,
    get busy() {
      return this.pending !== null;
    },
    async act(this: CardState, kind: string, doseId?: string) {
      const root = this.$root as HTMLElement;
      const waits: Promise<unknown>[] = [];
      this.pending = `${kind}:${doseId ?? ""}`;
      this.error = null;
      const detail: ActionDetail = { engine: root.getAttribute("data-engine") ?? "", kind, doseId, wait: (p) => void waits.push(p) };
      this.$dispatch("nq-engine-action", detail);
      try {
        const results = await Promise.all(waits);
        const failed = results.find((r) => r && typeof r === "object" && "error" in r && (r as { error?: string }).error) as { error?: string } | undefined;
        if (failed?.error) this.error = failed.error;
      } catch {
        this.error = root.getAttribute("data-error-text") ?? "Something went wrong. Try again.";
      } finally {
        this.pending = null;
      }
    },
  }));
};
