// nqExportAction: export rows as CSV, Excel (.xlsx) or JSON, with an options dialog (format, rows, columns), a progress state and
// the result. The markup is the React ExportButton / ExportDialog's (see the Blade component); the state and the file building live here.
//
//   <div x-data="nqExportAction([{ id: 'name', label: 'Name' }], { all: [{ name: 'Sara' }] }, { filename: 'contacts' })">…</div>
//
// Scopes: each is an array of row objects (a cell is `row[column.id]`), or `{ count: 120 }` for rows that live on the server: then a
// bubbling "load" event fires with { scope, done(rows), fail(message) }. Options: formats (csv, xlsx, json, pdf), defaultFormat,
// defaultScope, filename (without extension), sheetName, mode ("dialog" | "menu").
//
// Events (bubbling): "load" { scope, done(rows), fail(message) }, "pdf" { request, signal, progress(0..1), done(blob?), fail(message) } (the
// PDF format is offered only when `pdf` is true and something answers), "download" { file } (preventDefault() to take over the browser
// download), "complete" { file }. `file` is { blob, filename, request }.

import {
  buildExportFile,
  EXPORT_MIME,
  saveExportBlob,
  strings,
  type ExportCell,
  type ExportFileFormat,
} from "./export-action-logic";
import type { Magics, Register } from "./types";

type Format = ExportFileFormat | "pdf";
type Scope = "selected" | "filtered" | "all";
type Phase = "idle" | "running" | "done" | "error";
type Row = Record<string, ExportCell>;
type Source = Row[] | { count: number };
interface Column {
  id: string;
  label: string;
}
interface Request {
  format: Format;
  scope: Scope;
  columns: Column[];
  rows: Row[];
  filename: string;
}
interface FileResult {
  blob: Blob;
  filename: string;
  request: Request;
}

export interface ExportActionOptions {
  formats?: Format[];
  defaultFormat?: Format;
  defaultScope?: Scope;
  filename?: string;
  sheetName?: string;
  pdf?: boolean;
  mode?: "dialog" | "menu";
}

const SCOPES: Scope[] = ["selected", "filtered", "all"];
const sourceCount = (source: Source | undefined) => (source == null ? 0 : Array.isArray(source) ? source.length : source.count);

interface State extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  columns: Column[];
  scopes: Partial<Record<Scope, Source>>;
  formats: Format[];
  filename: string;
  sheetName: string | undefined;
  dlg: boolean;
  format: Format;
  scope: Scope;
  picked: boolean[];
  phase: Phase;
  stage: "loading" | "building";
  progress: number | null;
  message: string;
  file: FileResult | null;
  abort: AbortController | null;
  root: HTMLElement;
  s(): ReturnType<typeof strings>;
  num(n: number): string;
  firstScope(defaultScope?: Scope): Scope;
  openDialog(auto?: Format): void;
  run(overrides?: { format: Format; scope: Scope }): Promise<void>;
  cancel(): void;
  deliver(file: FileResult): Promise<void>;
  pickedCount(): number;
  allPicked(): boolean;
  someSelected(): boolean;
  toggleAll(): void;
  countText(scope: Scope): string;
  canRun(): boolean;
  pct(): number;
  progressLabel(): string;
  readyText(): string;
  downloadAgain(): void;
}

export const exportAction: Register = (Alpine) => {
  Alpine.data("nqExportAction", (columns: Column[] = [], scopes: Partial<Record<Scope, Source>> = {}, options: ExportActionOptions = {}) => ({
    columns,
    scopes,
    formats: (options.formats ?? ["csv", "xlsx", "json"]).filter((f) => f !== "pdf" || options.pdf),
    filename: options.filename ?? "export",
    sheetName: options.sheetName,
    dlg: false,
    format: (options.defaultFormat ?? options.formats?.[0] ?? "csv") as Format,
    scope: "all" as Scope,
    picked: columns.map(() => true),
    phase: "idle" as Phase,
    stage: "loading" as "loading" | "building",
    progress: null as number | null,
    message: "",
    file: null as FileResult | null,
    abort: null as AbortController | null,
    root: null as unknown as HTMLElement,

    init(this: State) {
      this.root = this.$el;
      this.scope = this.firstScope(options.defaultScope);
      this.$watch<boolean>("dlg", (open) => {
        if (open) return;
        // A running export keeps the dialog open: Cancel is the way out.
        if (this.phase === "running") {
          this.dlg = true;
          return;
        }
        this.abort?.abort();
        this.phase = "idle";
        this.file = null;
      });
    },

    s(this: State) {
      return strings(this.$nq.locale);
    },
    num(this: State, n: number) {
      return new Intl.NumberFormat(this.$nq.locale, { numberingSystem: "latn" }).format(n);
    },
    firstScope(this: State, defaultScope?: Scope): Scope {
      return defaultScope && sourceCount(this.scopes[defaultScope]) > 0 ? defaultScope : (SCOPES.find((s) => sourceCount(this.scopes[s]) > 0) ?? "all");
    },
    openDialog(this: State, auto?: Format) {
      this.phase = "idle";
      this.scope = this.firstScope(options.defaultScope);
      this.dlg = true;
      if (auto) {
        this.format = auto;
        void this.run({ format: auto, scope: this.scope });
      }
    },

    async run(this: State, overrides?: { format: Format; scope: Scope }) {
      const fmt = overrides?.format ?? this.format;
      const scp = overrides?.scope ?? this.scope;
      const cols = this.columns.filter((_, i) => (overrides ? true : this.picked[i]));
      const source = this.scopes[scp];
      if (!source || !cols.length) return;
      const controller = new AbortController();
      this.abort = controller;
      const baseName = this.filename.replace(/\.[a-z0-9]+$/i, "");
      const failWith = (message: string) => {
        if (controller.signal.aborted) return;
        this.message = message || this.s().failed;
        this.phase = "error";
      };
      try {
        this.phase = "running";
        this.stage = "loading";
        this.progress = null;
        let rows: Row[];
        if (Array.isArray(source)) rows = source;
        else {
          rows = await new Promise<Row[]>((resolve, reject) => {
            this.root.dispatchEvent(
              new CustomEvent("load", { bubbles: true, detail: { scope: scp, done: (r: Row[]) => resolve(r ?? []), fail: (m?: string) => reject(new Error(m)) } }),
            );
          });
        }
        if (controller.signal.aborted) return;
        const request: Request = { format: fmt, scope: scp, columns: cols, rows, filename: `${baseName}.${fmt}` };
        this.stage = "building";
        this.progress = 0;
        const onProgress = (p: number) => (this.progress = p);
        let blob: Blob | undefined;
        if (fmt === "pdf") {
          blob = await new Promise<Blob | undefined>((resolve, reject) => {
            this.root.dispatchEvent(
              new CustomEvent("pdf", {
                bubbles: true,
                detail: { request, signal: controller.signal, progress: onProgress, done: (b?: Blob) => resolve(b), fail: (m?: string) => reject(new Error(m)) },
              }),
            );
          });
        } else {
          const bytes = await buildExportFile({
            format: fmt,
            columns: cols,
            rows,
            sheetName: this.sheetName ?? baseName,
            rtl: this.$nq.locale.startsWith("ar"),
            onProgress,
            signal: controller.signal,
          });
          blob = new Blob([bytes as BlobPart], { type: EXPORT_MIME[fmt] });
        }
        if (controller.signal.aborted) return;
        const file: FileResult = { blob: blob ?? new Blob([]), filename: request.filename, request };
        if (blob) await this.deliver(file);
        this.file = file;
        this.phase = "done";
        this.root.dispatchEvent(new CustomEvent("complete", { bubbles: true, detail: { file } }));
      } catch (error) {
        if (controller.signal.aborted || (error as Error)?.name === "AbortError") return;
        failWith((error as Error)?.message);
      }
    },
    async deliver(this: State, file: FileResult) {
      const event = new CustomEvent("download", { bubbles: true, cancelable: true, detail: { file } });
      this.root.dispatchEvent(event);
      if (!event.defaultPrevented) saveExportBlob(file.blob, file.filename);
    },
    cancel(this: State) {
      this.abort?.abort();
      this.phase = "idle";
    },

    pickedCount(this: State) {
      return this.picked.filter(Boolean).length;
    },
    allPicked(this: State) {
      return this.pickedCount() === this.columns.length;
    },
    someSelected(this: State) {
      return this.pickedCount() > 0 && !this.allPicked();
    },
    toggleAll(this: State) {
      const next = !this.allPicked();
      this.picked = this.columns.map(() => next);
    },
    countText(this: State, scope: Scope) {
      const n = sourceCount(this.scopes[scope]);
      return n === 1 ? this.s().rowCountOne : this.s().rowCount(this.num(n));
    },
    canRun(this: State) {
      return this.pickedCount() > 0 && sourceCount(this.scopes[this.scope]) > 0;
    },
    pct(this: State) {
      return Math.round((this.progress ?? 0) * 100);
    },
    progressLabel(this: State) {
      return this.stage === "loading" ? this.s().loadingRows : this.s().building(`${this.num(this.pct())}%`);
    },
    readyText(this: State) {
      return this.s().ready("");
    },
    downloadAgain(this: State) {
      if (this.file) void this.deliver(this.file);
    },
  }));
};
