// nqStatusLabelManager: the behaviour of the Blade status-label-manager. The rows are rendered by the server; this owns the create / edit
// dialog (validation, preview, busy), the delete confirmation and the reorder events. It talks to the server through events and waitUntil.
//
//   <section data-slot="status-label-manager" x-data="nqStatusLabelManager({ statuses: [...], tags: [...], copy: { ... } })"
//            x-on:nq-save-status="$event.detail.waitUntil(save($event.detail.draft))"> ... </section>
//
// Events, all bubbling from the root. Each carries detail.waitUntil(promise); resolve `{ error }` (or reject) to show it.
//   nq-save-status    detail.draft { id?, name, hue, stage }      nq-delete-status  detail.id
//   nq-reorder-statuses detail.ids (the full new order)           nq-save-label     detail.draft { id?, name, hue }
//   nq-delete-label   detail.id
// After success re-render with the updated lists.

import { NAME_MAX, moveWithinStage, validateName, type StatusHue, type StatusStage, type WorkStatus } from "./status-label-logic";
import type { Magics, Register } from "./types";

interface Item {
  id: string;
  name: string;
  hue: StatusHue;
  stage?: StatusStage;
  usage?: number;
  /** The delete dialog's title and body, worded by the server. */
  delTitle?: string;
  delBody?: string;
}
interface Copy {
  editStatus: string;
  editLabel: string;
  statusesBody: string;
  labelsBody: string;
  save: string;
  create: string;
  failed: string;
  empty: string;
  tooLong: string;
  duplicate: string;
}
interface Config {
  statuses?: Item[];
  tags?: Item[];
  copy?: Partial<Copy>;
}
interface Failure {
  error?: string;
}
interface State extends Magics {
  statuses: Item[];
  tags: Item[];
  copy: Copy;
  root: HTMLElement | undefined;
  error: string;
  editOpen: boolean;
  editKind: "status" | "label";
  editId: string | null;
  draft: { name: string; hue: StatusHue; stage: StatusStage };
  touched: boolean;
  busy: boolean;
  formError: string;
  delOpen: boolean;
  delKind: "status" | "label";
  delId: string;
  delTitle: string;
  delBody: string;
  delBusy: boolean;
  readonly nameCode: ReturnType<typeof validateName>;
  emit(event: string, detail: Record<string, unknown>): unknown[];
  settle(waits: unknown[]): Promise<Failure | undefined>;
}

const failure = (r: unknown): Failure | undefined => (r && typeof r === "object" && (r as Failure).error ? (r as Failure) : undefined);
const HUES: StatusHue[] = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"];
const DEFAULTS: Copy = {
  editStatus: "Edit status",
  editLabel: "Edit label",
  statusesBody: "",
  labelsBody: "",
  save: "Save",
  create: "Create",
  failed: "Could not save. Try again.",
  empty: "Give it a name.",
  tooLong: "Use {n} characters or fewer.",
  duplicate: "That name is already used.",
};

export const statusLabelManager: Register = (Alpine) => {
  Alpine.data("nqStatusLabelManager", (config: Config = {}) => ({
    statuses: (config.statuses ?? []).map((s) => ({ ...s })) as Item[],
    tags: (config.tags ?? []).map((s) => ({ ...s })) as Item[],
    copy: { ...DEFAULTS, ...config.copy } as Copy,
    root: undefined as HTMLElement | undefined,
    error: "",
    editOpen: false,
    editKind: "status" as "status" | "label",
    editId: null as string | null,
    draft: { name: "", hue: "blue" as StatusHue, stage: "todo" as StatusStage },
    touched: false,
    busy: false,
    formError: "",
    delOpen: false,
    delKind: "status" as "status" | "label",
    delId: "",
    delTitle: "",
    delBody: "",
    delBusy: false,
    init(this: State) {
      this.root = this.$el;
    },
    // --- the edit dialog ---
    get isStatus(): boolean {
      return (this as unknown as State).editKind === "status";
    },
    get editTitle(): string {
      const self = this as unknown as State;
      return self.editKind === "status" ? self.copy.editStatus : self.copy.editLabel;
    },
    get editBody(): string {
      const self = this as unknown as State;
      return self.editKind === "status" ? self.copy.statusesBody : self.copy.labelsBody;
    },
    get submitLabel(): string {
      const self = this as unknown as State;
      return self.editId === null ? self.copy.create : self.copy.save;
    },
    get nameCode() {
      const self = this as unknown as State;
      const others = (self.editKind === "status" ? self.statuses : self.tags) as WorkStatus[];
      return validateName(self.draft.name, others, self.editId ?? undefined);
    },
    get nameBad(): boolean {
      const self = this as unknown as State;
      return self.touched && self.nameCode !== null;
    },
    get nameMsg(): string {
      const self = this as unknown as State;
      const code = self.nameCode;
      if (!code) return "";
      return code === "tooLong" ? self.copy.tooLong.replace("{n}", String(NAME_MAX)) : self.copy[code];
    },
    get previewName(): string {
      return (this as unknown as State).draft.name.trim() || "…";
    },
    tagStyle(hue: string) {
      return { "--tag-solid": `var(--nq-tag-${hue})`, "--tag-soft": `var(--nq-tag-${hue}-soft)` };
    },
    hueOf(value: string | null) {
      return HUES.find((h) => value === `--nq-tag-${h}`) ?? "gray";
    },
    onColor(this: State, event: CustomEvent<{ value: string }>) {
      this.draft.hue = (this as unknown as { hueOf(v: string): StatusHue }).hueOf(event.detail.value);
    },
    /** The colour picker keeps its own value; push the draft hue into it (opening on another item, or a reset). */
    syncPicker(this: State, wrap: HTMLElement) {
      const picker = wrap.querySelector<HTMLElement>('[data-slot="color-picker"]');
      const want = `--nq-tag-${this.draft.hue}`;
      // The picker initialises after this effect first runs; until it has its own scope there is nothing to set.
      const stack = (picker as unknown as { _x_dataStack?: Record<string, unknown>[] } | null)?._x_dataStack;
      if (!picker || !stack?.[0] || !("color" in stack[0])) return;
      const data = (Alpine as unknown as { $data(el: Element): { color: string | null } }).$data(picker);
      if (data.color !== want) data.color = want;
    },
    openCreate(this: State, kind: "status" | "label") {
      this.editKind = kind;
      this.editId = null;
      this.draft = { name: "", hue: "blue", stage: "todo" };
      this.touched = false;
      this.formError = "";
      this.editOpen = true;
    },
    openEdit(this: State, kind: "status" | "label", index: number) {
      const item = (kind === "status" ? this.statuses : this.tags)[index];
      if (!item) return;
      this.editKind = kind;
      this.editId = item.id;
      this.draft = { name: item.name, hue: item.hue, stage: item.stage ?? "todo" };
      this.touched = false;
      this.formError = "";
      this.editOpen = true;
    },
    async submit(this: State) {
      this.touched = true;
      if (this.nameCode) return;
      this.busy = true;
      this.formError = "";
      const id = this.editId ?? undefined;
      const name = this.draft.name.trim();
      try {
        const status = this.editKind === "status";
        const draft = status ? { id, name, hue: this.draft.hue, stage: this.draft.stage } : { id, name, hue: this.draft.hue };
        const result = await this.settle(this.emit(status ? "nq-save-status" : "nq-save-label", { draft }));
        if (result?.error) this.formError = result.error;
        else this.editOpen = false;
      } catch {
        this.formError = this.copy.failed;
      } finally {
        this.busy = false;
      }
    },
    // --- delete ---
    askDelete(this: State, kind: "status" | "label", index: number) {
      const item = (kind === "status" ? this.statuses : this.tags)[index];
      if (!item) return;
      this.delKind = kind;
      this.delId = item.id;
      this.delTitle = item.delTitle ?? item.name;
      this.delBody = item.delBody ?? "";
      this.delOpen = true;
    },
    async confirmDelete(this: State) {
      this.delBusy = true;
      this.error = "";
      try {
        const result = await this.settle(this.emit(this.delKind === "status" ? "nq-delete-status" : "nq-delete-label", { id: this.delId }));
        if (result?.error) this.error = result.error;
        else this.delOpen = false;
      } catch {
        this.error = this.copy.failed;
      } finally {
        this.delBusy = false;
      }
    },
    // --- reorder (statuses only) ---
    async move(this: State, index: number, delta: number) {
      const item = this.statuses[index];
      if (!item) return;
      this.error = "";
      try {
        const ids = moveWithinStage(this.statuses as WorkStatus[], item.id, delta < 0 ? -1 : 1);
        const result = await this.settle(this.emit("nq-reorder-statuses", { ids }));
        if (result?.error) this.error = result.error;
      } catch {
        this.error = this.copy.failed;
      }
    },
    emit(this: State, event: string, detail: Record<string, unknown>) {
      const waits: unknown[] = [];
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
      return waits;
    },
    /** Waits for what listeners handed to waitUntil; the first `{ error }` wins. */
    async settle(waits: unknown[]) {
      const results = await Promise.all(waits);
      return results.map(failure).find(Boolean);
    },
  }));
};
