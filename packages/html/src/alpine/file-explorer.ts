// nqFileExplorer: the folder tree, breadcrumbs, search, list or grid, preview and dialogs of the file explorer.
// The markup is the React FileExplorer's (rendered by Blade); the folders, rows and previews are static HTML, this module
// decides which of them are shown and how they are ordered. It stores nothing: every change fires an event on the root.
//
//   <section x-data="nqFileExplorer({ folder: '', picked: null, view: 'list', nodes: [...], labels: {...} })"
//            @nq-file-upload="$event.detail.wait(…)" @nq-file-create-folder="…" @nq-file-delete="…" @nq-file-download="…"> … </section>
//
// Events on the root (all bubble):
//   nq-file-upload         { files, folder, wait }   folder is the open folder id or null at the root; resolve, or resolve { error }
//   nq-file-create-folder  { name, parent, wait }    resolve, or resolve { error } (the dialog stays open and shows it)
//   nq-file-delete         { id, wait }              runs after the confirm; resolve, or resolve { error }. On success the row is hidden.
//   nq-file-download       { id }                    no wait
//   nq-file-open           { id }                    the open folder changed (null is the root)
//   nq-file-select         { id }                    the previewed file changed (null for none)
// A rejected promise, or nobody listening on an action, shows the generic error. After a create-folder or upload the host
// re-renders the component with the new nodes.

import { checkFolderName, itemsText, rankSiblings, type ItemsLabels, type NameProblem, type SortKey, type SortableNode } from "./file-explorer-logic";
import type { Magics, Register } from "./types";

interface ExplorerConfig {
  /** The open folder id, "" for the root. */
  folder: string;
  /** The previewed file id, or null. */
  picked: string | null;
  view: "list" | "grid";
  locale: string;
  rootLabel: string;
  nodes: SortableNode[];
  labels: {
    items: ItemsLabels;
    genericError: string;
    problems: Record<NameProblem, string>;
    /** "Delete {name}?" */
    deleteTitle: string;
    deleteFile: string;
    deleteFolder: { zero: string; one: string; many: string };
  };
}

type Outcome = { error?: string } | void | undefined;

interface ExplorerState extends Magics {
  config: ExplorerConfig;
  folder: string;
  pickedId: string | null;
  viewMode: "list" | "grid";
  needle: string;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  removed: string[];
  notice: string | null;
  uploading: boolean;
  dragging: boolean;
  newOpen: boolean;
  newName: string;
  newTouched: boolean;
  newInvalid: boolean;
  newFail: string | null;
  newBusy: boolean;
  delOpen: boolean;
  delTarget: string | null;
  delBusy: boolean;
  alive: boolean;
  root: HTMLElement | null;
  dragDepth: number;
  live(): SortableNode[];
  siblings(): SortableNode[];
  matches(id: string): boolean;
  trailIds(): string[];
  enter(id: string): void;
  pick(id: string | null): void;
  hasRows(): boolean;
  syncNew(): void;
  send(files: File[]): void;
  hasFiles(event: DragEvent): boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  fire(name: string, detail: Record<string, unknown>): void;
}

export const fileExplorer: Register = (Alpine) => {
  Alpine.data("nqFileExplorer", (config: ExplorerConfig) => {
    const byId = new Map(config.nodes.map((n) => [n.id, n]));
    let rankKey = "";
    let ranks: Record<string, number> = {};
    return {
      config,
      folder: config.folder,
      pickedId: config.picked,
      viewMode: config.view,
      needle: "",
      sortBy: "name" as SortKey,
      sortDir: "asc" as "asc" | "desc",
      removed: [] as string[],
      notice: null as string | null,
      uploading: false,
      dragging: false,
      newOpen: false,
      newName: "",
      newTouched: false,
      newInvalid: false,
      newFail: null as string | null,
      newBusy: false,
      delOpen: false,
      delTarget: null as string | null,
      delBusy: false,
      alive: true,
      root: null as HTMLElement | null,
      dragDepth: 0,
      init(this: ExplorerState) {
        this.root = this.$el;
      },
      destroy(this: ExplorerState) {
        this.alive = false;
      },

      // Which nodes exist, and which are shown.
      live(this: ExplorerState): SortableNode[] {
        return this.config.nodes.filter((n) => !this.removed.includes(n.id));
      },
      siblings(this: ExplorerState): SortableNode[] {
        return this.live().filter((n) => n.parent === this.folder);
      },
      matches(this: ExplorerState, id: string): boolean {
        const q = this.needle.trim().toLowerCase();
        return q === "" || (byId.get(id)?.name.toLowerCase().includes(q) ?? false);
      },
      inFolder(this: ExplorerState, id: string): boolean {
        const n = byId.get(id);
        return Boolean(n) && n!.parent === this.folder && !this.removed.includes(id) && this.matches(id);
      },
      isEmpty(this: ExplorerState): boolean {
        return this.siblings().length === 0;
      },
      isNoMatch(this: ExplorerState): boolean {
        const list = this.siblings();
        return list.length > 0 && !list.some((n) => this.matches(n.id));
      },
      hasRows(this: ExplorerState): boolean {
        return this.siblings().some((n) => this.matches(n.id));
      },
      countText(this: ExplorerState): string {
        return itemsText(this.siblings().length, this.config.labels.items);
      },

      // The path and the tree.
      trailIds(this: ExplorerState): string[] {
        const out: string[] = [];
        let at = this.folder;
        while (at) {
          out.unshift(at);
          at = byId.get(at)?.parent ?? "";
        }
        return out;
      },
      crumbs(this: ExplorerState): { id: string; name: string; last: boolean }[] {
        const trail = this.trailIds();
        const list = [{ id: "", name: this.config.rootLabel }, ...trail.map((id) => ({ id, name: byId.get(id)?.name ?? id }))];
        return list.map((c, i) => ({ ...c, last: i === list.length - 1 }));
      },
      treeShown(this: ExplorerState, id: string): boolean {
        const n = byId.get(id);
        if (!n || this.removed.includes(id)) return false;
        return n.parent === "" || this.trailIds().includes(n.parent);
      },
      treeOpen(this: ExplorerState, id: string): boolean {
        return id === "" || this.trailIds().includes(id);
      },
      isHere(this: ExplorerState, id: string): boolean {
        return this.folder === id;
      },

      // Moving around.
      enter(this: ExplorerState, id: string) {
        this.folder = id;
        this.pickedId = null;
        this.needle = "";
        this.fire("nq-file-open", { id: id || null });
        this.fire("nq-file-select", { id: null });
      },
      pick(this: ExplorerState, id: string | null) {
        this.pickedId = id;
        this.fire("nq-file-select", { id });
      },
      go(this: ExplorerState, id: string) {
        if (byId.get(id)?.folder) this.enter(id);
        else this.pick(id);
      },
      isPicked(this: ExplorerState, id: string): boolean {
        return this.pickedId === id;
      },
      showList(this: ExplorerState): boolean {
        return this.viewMode === "list" && this.hasRows();
      },
      showGrid(this: ExplorerState): boolean {
        return this.viewMode === "grid" && this.hasRows();
      },
      setView(this: ExplorerState, view: "list" | "grid") {
        this.viewMode = view;
      },

      // Sorting: rows are static, so the order is a CSS order value.
      sortOn(this: ExplorerState, key: SortKey) {
        if (this.sortBy === key) this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
        else {
          this.sortBy = key;
          this.sortDir = "asc";
        }
      },
      ariaSort(this: ExplorerState, key: SortKey): string | null {
        return this.sortBy === key ? (this.sortDir === "asc" ? "ascending" : "descending") : null;
      },
      rowOrder(this: ExplorerState, id: string): number {
        const key = `${this.sortBy}:${this.sortDir}`;
        if (key !== rankKey) {
          ranks = rankSiblings(this.config.nodes, this.sortBy, this.sortDir, this.config.locale);
          rankKey = key;
        }
        return ranks[id] ?? 0;
      },

      // Events: ask the host and wait for the promise it hands to wait().
      fire(this: ExplorerState, name: string, detail: Record<string, unknown>) {
        (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
      },
      async ask(this: ExplorerState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
        let pending: Promise<Outcome> | undefined;
        const event = new CustomEvent(name, {
          bubbles: true,
          detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
        });
        (this.root ?? this.$el).dispatchEvent(event);
        if (!pending) throw new Error("no listener");
        return pending;
      },
      download(this: ExplorerState, id: string) {
        this.fire("nq-file-download", { id });
      },

      // Upload by button or drop.
      onPick(this: ExplorerState, event: Event) {
        const el = event.target as HTMLInputElement;
        const files = [...(el.files ?? [])];
        el.value = "";
        void this.send(files);
      },
      async send(this: ExplorerState, files: File[]) {
        if (files.length === 0 || this.uploading) return;
        this.uploading = true;
        this.notice = null;
        try {
          const result = await this.ask("nq-file-upload", { files, folder: this.folder || null });
          if (this.alive && result && result.error !== undefined) this.notice = result.error;
        } catch {
          if (this.alive) this.notice = this.config.labels.genericError;
        } finally {
          if (this.alive) this.uploading = false;
        }
      },
      hasFiles(event: DragEvent): boolean {
        return Boolean(event.dataTransfer?.types.includes("Files"));
      },
      dragIn(this: ExplorerState, event: DragEvent) {
        if (!this.hasFiles(event)) return;
        this.dragDepth += 1;
        this.dragging = true;
      },
      dragOver(this: ExplorerState, event: DragEvent) {
        if (this.hasFiles(event)) event.preventDefault();
      },
      dragOut(this: ExplorerState) {
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (this.dragDepth === 0) this.dragging = false;
      },
      dropIn(this: ExplorerState, event: DragEvent) {
        if (!this.hasFiles(event)) return;
        event.preventDefault();
        this.dragDepth = 0;
        this.dragging = false;
        void this.send([...(event.dataTransfer?.files ?? [])]);
      },
      dismissNotice(this: ExplorerState) {
        this.notice = null;
      },

      // New folder.
      beginNew(this: ExplorerState) {
        this.newName = "";
        this.newTouched = false;
        this.newInvalid = false;
        this.newFail = null;
        this.newOpen = true;
      },
      /** Keeps the field's invalid flag (x-modelable) in step with the typed name. */
      syncNew(this: ExplorerState) {
        this.newFail = null;
        this.newInvalid = (this as unknown as { newShown: boolean }).newShown;
      },
      touchNew(this: ExplorerState) {
        this.newTouched = true;
        this.syncNew();
      },
      get newProblem(): NameProblem | null {
        const s = this as unknown as ExplorerState & { newName: string };
        return checkFolderName(s.newName, s.siblings().map((n) => n.name));
      },
      get newShown(): boolean {
        const s = this as unknown as ExplorerState & { newProblem: NameProblem | null };
        return s.newProblem !== null && (s.newTouched || s.newProblem === "duplicate" || s.newProblem === "invalid");
      },
      get newText(): string {
        const s = this as unknown as ExplorerState & { newProblem: NameProblem | null; newShown: boolean };
        return s.newShown && s.newProblem ? s.config.labels.problems[s.newProblem] : "";
      },
      async submitNew(this: ExplorerState & { newProblem: NameProblem | null }) {
        this.newTouched = true;
        this.syncNew();
        if (this.newProblem || this.newBusy) return;
        this.newBusy = true;
        this.newFail = null;
        try {
          const result = await this.ask("nq-file-create-folder", { name: this.newName.trim(), parent: this.folder || null });
          if (!this.alive) return;
          if (result && result.error !== undefined) this.newFail = result.error;
          else this.newOpen = false;
        } catch {
          if (this.alive) this.newFail = this.config.labels.genericError;
        } finally {
          if (this.alive) this.newBusy = false;
        }
      },

      // Delete.
      askDelete(this: ExplorerState, id: string) {
        this.delTarget = id;
        this.delOpen = true;
      },
      get delTitle(): string {
        const s = this as unknown as ExplorerState;
        const n = s.delTarget ? byId.get(s.delTarget) : null;
        return n ? s.config.labels.deleteTitle.replace("{name}", n.name) : "";
      },
      get delBody(): string {
        const s = this as unknown as ExplorerState;
        const n = s.delTarget ? byId.get(s.delTarget) : null;
        if (!n) return "";
        if (!n.folder) return s.config.labels.deleteFile;
        const count = (id: string): number => s.config.nodes.filter((c) => c.parent === id).reduce((sum, c) => sum + 1 + (c.folder ? count(c.id) : 0), 0);
        const total = count(n.id);
        const l = s.config.labels.deleteFolder;
        return (total === 0 ? l.zero : total === 1 ? l.one : l.many).replace("{n}", String(total));
      },
      async confirmDelete(this: ExplorerState) {
        const id = this.delTarget;
        if (!id || this.delBusy) return;
        this.delBusy = true;
        this.notice = null;
        try {
          const result = await this.ask("nq-file-delete", { id });
          if (!this.alive) return;
          if (result && result.error !== undefined) this.notice = result.error;
          else {
            this.removed = [...this.removed, id];
            if (this.pickedId === id) this.pick(null);
          }
        } catch {
          if (this.alive) this.notice = this.config.labels.genericError;
        } finally {
          if (this.alive) this.delBusy = false;
        }
      },
    };
  });
};
