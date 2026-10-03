// nqVersionHistory: pick a saved version, compare it with another one and restore it. The markup is the React VersionHistory's
// (see <x-nq::version-history>); the server renders the list, the previews and the headers, this holds the selection and the diff.
//
//   <div x-data="nqVersionHistory({ versions: [{ id, version, content }], liveId, selected: null, restorable: true, t })"
//        x-on:nq-version-restore="$event.detail.waitUntil(save($event.detail.id))">…</div>
//
// Restoring is yours. It dispatches, from the root:
//   nq-version-restore  detail: { id, waitUntil(promise) }   resolve { error } or reject to show the message
//   nq-version-select   detail: { id }                       id is null when the selection is cleared

import { type DiffItem, type DiffLine, diffLines, diffStats, foldDiff } from "./version-history-logic";
import type { Magics, Register } from "./types";

interface Version {
  id: string;
  version: number;
  content: string;
}
interface Config {
  versions?: Version[];
  liveId?: string | null;
  selected?: string | null;
  restorable?: boolean;
  t?: { version?: string; restoreTitle?: string; failed?: string };
}
interface State extends Magics {
  versions: Version[];
  liveId: string | null;
  selected: string | null;
  baseline: string;
  busy: boolean;
  error: string;
  dialogOpen: boolean;
  root: HTMLElement;
  readonly current: Version | null;
  readonly base: Version | null;
  readonly lines: DiffLine[];
}

const fill = (s: string, n: number | string) => s.replace(":n", String(n));

export const versionHistory: Register = (Alpine) => {
  Alpine.data("nqVersionHistory", (cfg: Config = {}) => ({
    versions: cfg.versions ?? [],
    liveId: cfg.liveId ?? null,
    selected: cfg.selected ?? null,
    baseline: "previous",
    busy: false,
    error: "",
    dialogOpen: false,
    root: null as unknown as HTMLElement,
    init(this: State) {
      this.root = this.$el;
    },
    fill,
    toggle(this: State, id: string | null) {
      this.selected = id === this.selected ? null : id;
      this.error = "";
      this.baseline = "previous";
      this.root.dispatchEvent(new CustomEvent("nq-version-select", { bubbles: true, detail: { id: this.selected } }));
    },
    versionLabel(this: State, v: Version | null) {
      return v ? fill(cfg.t?.version ?? "Version :n", v.version) : "";
    },
    get current(): Version | null {
      const self = this as unknown as State;
      return self.versions.find((v) => v.id === self.selected) ?? null;
    },
    get canRestore(): boolean {
      const self = this as unknown as State;
      return !!cfg.restorable && self.selected !== null && self.selected !== self.liveId;
    },
    get restoreTitle(): string {
      const self = this as unknown as State;
      return self.current ? fill(cfg.t?.restoreTitle ?? "Restore version :n?", self.current.version) : "";
    },
    get base(): Version | null {
      const self = this as unknown as State;
      const i = self.versions.findIndex((v) => v.id === self.selected);
      if (i < 0) return null;
      if (self.baseline === "previous") return self.versions[i + 1] ?? null;
      if (self.baseline === "current") return self.versions.find((v) => v.id === self.liveId) ?? null;
      return self.versions.find((v) => v.id === self.baseline) ?? null;
    },
    get lines(): DiffLine[] {
      const self = this as unknown as State;
      return self.current && self.base ? diffLines(self.base.content, self.current.content) : [];
    },
    get stats() {
      return diffStats((this as unknown as State).lines);
    },
    get items(): DiffItem[] {
      return foldDiff((this as unknown as State).lines, 3);
    },
    get showStats(): boolean {
      const self = this as unknown as State;
      return self.base !== null && diffStats(self.lines).changed;
    },
    get showIdentical(): boolean {
      const self = this as unknown as State;
      return self.base !== null && !diffStats(self.lines).changed;
    },
    rowClass(it: DiffItem) {
      return ["flex min-w-max", it.type === "add" && "bg-nq-success-soft", it.type === "del" && "bg-nq-danger-soft"].filter(Boolean).join(" ");
    },
    async restore(this: State) {
      const v = this.current;
      if (!v || this.busy) return false;
      this.busy = true;
      this.error = "";
      const pending: unknown[] = [];
      this.root.dispatchEvent(new CustomEvent("nq-version-restore", { bubbles: true, detail: { id: v.id, waitUntil: (p: unknown) => void pending.push(p) } }));
      try {
        const results = await Promise.all(pending);
        const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
        if (failed) this.error = failed.error;
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : (cfg.t?.failed ?? "Could not restore. Try again.");
      } finally {
        this.busy = false;
        this.dialogOpen = false;
      }
      return !this.error;
    },
  }));
};
