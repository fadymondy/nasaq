// nqImportWizard: a four step import (upload, map columns, review, import). The markup is the React ImportWizard's (see the Blade component); the state lives here.
// Parsing and validation run in the browser with no dependencies (import-wizard-logic.ts). There is no backend: at the last step the
// wizard dispatches a bubbling "import" event and waits for you to report back.
//
//   <div data-slot="import-wizard" x-data="nqImportWizard([{ key: 'email', label: 'Email', type: 'email', required: true }], { uniqueKey: 'email' })"
//        @import="$event.detail.done({ imported: $event.detail.rows.length })">…</div>
//
// Events:
//   "import" { rows, done(result?), fail(message) }   the valid rows keyed by field key. Call done({ imported, failed?: [{ line, message }] }) or fail("why").
//   "done"                                            the last step's Done button.
// Options: uniqueKey, maxRows (5000), maxSize (5 MB).

import {
  buildRows,
  guessMapping,
  parseCsv,
  strings,
  summarize,
  unmappedRequired,
  type ColumnMapping,
  type ImportField,
  type ParsedCsv,
  type ParsedRow,
} from "./import-wizard-logic";
import type { Magics, Register } from "./types";

export interface ImportResult {
  imported: number;
  failed?: { line: number; message: string }[];
  error?: string;
}
interface Options {
  uniqueKey?: string;
  maxRows?: number;
  maxSize?: number;
}

const SKIP = "__skip__";
const PREVIEW_ROWS = 25;

interface WizardState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  fields: ImportField[];
  uniqueKey: string | undefined;
  maxRows: number;
  maxSize: number;
  step: number;
  source: { name: string; size?: number; csv: ParsedCsv } | null;
  mapping: ColumnMapping;
  rows: ParsedRow[];
  skipInvalid: boolean;
  paste: string;
  uploadError: string | null;
  dragging: boolean;
  depth: number;
  busy: boolean;
  result: ImportResult | null;
  runError: string | null;
  root: HTMLElement;
  t(): ReturnType<typeof strings>;
  recompute(): void;
  load(name: string, text: string, size?: number): void;
  toImport(): ParsedRow[];
  n(value: number): string;
  fieldLabel(key: string): string;
  fileSize(bytes: number): string;
  pickFiles(list: FileList | File[] | null): void;
  stepStatus(index: number): "complete" | "current" | "upcoming";
}

const num = (locale: string, n: number) => new Intl.NumberFormat(`${locale}-u-nu-latn`).format(n);

export const importWizard: Register = (Alpine) => {
  Alpine.data("nqImportWizard", (fields: ImportField[] = [], options: Options = {}) => ({
    fields,
    uniqueKey: options.uniqueKey,
    maxRows: options.maxRows ?? 5000,
    maxSize: options.maxSize ?? 5 * 1024 * 1024,
    step: 0,
    source: null as WizardState["source"],
    mapping: {} as ColumnMapping,
    rows: [] as ParsedRow[],
    skipInvalid: true,
    paste: "",
    uploadError: null as string | null,
    dragging: false,
    depth: 0,
    busy: false,
    result: null as ImportResult | null,
    runError: null as string | null,
    root: null as unknown as HTMLElement,

    init(this: WizardState) {
      this.root = this.$el;
    },

    t(this: WizardState) {
      return strings(this.$nq.locale);
    },
    n(this: WizardState, value: number) {
      return num(this.$nq.locale, value);
    },
    previewRows(this: WizardState) {
      return this.rows.slice(0, PREVIEW_ROWS);
    },
    hasMore(this: WizardState) {
      return this.rows.length > PREVIEW_ROWS;
    },
    summary(this: WizardState) {
      return summarize(this.rows);
    },
    cards(this: WizardState) {
      const s = summarize(this.rows);
      const t = this.t();
      return [
        { label: t.total, n: this.n(s.total), tone: "text-foreground" },
        { label: t.ready, n: this.n(s.valid), tone: "text-nq-success-text" },
        { label: t.problems, n: this.n(s.invalid), tone: s.invalid > 0 ? "text-nq-danger-text" : "text-foreground" },
        { label: t.duplicates, n: this.n(s.duplicates), tone: "text-foreground" },
      ];
    },
    missing(this: WizardState) {
      return unmappedRequired(this.mapping, this.fields);
    },
    missingText(this: WizardState) {
      return this.t().unmappedRequired(unmappedRequired(this.mapping, this.fields).map((f) => f.label).join(", "));
    },
    toImport(this: WizardState) {
      return this.skipInvalid ? this.rows.filter((r) => r.issues.length === 0) : this.rows;
    },
    problemRows(this: WizardState) {
      return this.rows.filter((r) => r.issues.length > 0).slice(0, 50);
    },
    hasProblems(this: WizardState) {
      return this.rows.some((r) => r.issues.length > 0);
    },
    fieldLabel(this: WizardState, key: string) {
      return this.fields.find((f) => f.key === key)?.label ?? key;
    },
    issueText(this: WizardState, issue: { field: string; code: keyof ReturnType<typeof strings>["issue"] }) {
      return `${this.fieldLabel(issue.field)}: ${this.t().issue[issue.code]}`;
    },
    rowBad(this: WizardState, i: number) {
      return (this.rows[i]?.issues.length ?? 0) > 0;
    },
    rowLine(this: WizardState, i: number) {
      const r = this.rows[i];
      return r ? this.n(r.line) : "";
    },
    cellIssue(this: WizardState, row: ParsedRow | undefined, key: string) {
      const issue = row?.issues.find((i) => i.field === key);
      return issue ? this.t().issue[issue.code] : "";
    },
    cellText(this: WizardState, row: ParsedRow | undefined, key: string) {
      if (!row) return "";
      return row.values[key] || (row.issues.some((i) => i.field === key) ? "" : "—");
    },

    /* step 0 */
    loadedText(this: WizardState) {
      const s = this.source;
      if (!s) return "";
      const size = s.size ? ` · ${this.fileSize(s.size)}` : "";
      return this.t().loaded(s.name, s.csv.rows.length, s.csv.headers.length) + size;
    },
    fileSize(this: WizardState, bytes: number) {
      const units = this.$nq.locale.startsWith("ar") ? ["ب", "ك.ب", "م.ب", "ج.ب"] : ["B", "KB", "MB", "GB"];
      let v = bytes;
      let i = 0;
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
      }
      return `${new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`, { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v)} ${units[i]}`;
    },
    pickFiles(this: WizardState, list: FileList | File[] | null) {
      const file = list ? Array.from(list)[0] : undefined;
      if (!file) return;
      const t = this.t();
      const okType = /\.(csv|tsv|txt)$/i.test(file.name) || /^(text\/csv|text\/tab-separated-values|text\/plain)$/.test(file.type);
      if (file.size > this.maxSize) this.uploadError = t.fileTooBig;
      else if (!okType) this.uploadError = t.wrongType;
      else
        file
          .text()
          .then((text) => this.load(file.name, text, file.size))
          .catch(() => (this.uploadError = this.t().readFailed));
    },
    onPick(this: WizardState, event: Event) {
      const input = event.target as HTMLInputElement;
      this.pickFiles(input.files);
      input.value = "";
    },
    dragEnter(this: WizardState, event: DragEvent) {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      this.depth++;
      this.dragging = true;
    },
    dragLeave(this: WizardState) {
      this.depth = Math.max(0, this.depth - 1);
      if (this.depth === 0) this.dragging = false;
    },
    drop(this: WizardState, event: DragEvent) {
      event.preventDefault();
      this.depth = 0;
      this.dragging = false;
      this.pickFiles(event.dataTransfer?.files ?? null);
    },
    zoneKey(this: WizardState, event: KeyboardEvent) {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.$refs.file?.click();
      }
    },
    usePasted(this: WizardState) {
      this.load("pasted.csv", this.paste);
    },
    load(this: WizardState, name: string, text: string, size?: number) {
      const csv = parseCsv(text);
      const t = this.t();
      if (csv.headers.length === 0 || csv.rows.length === 0) {
        this.uploadError = t.empty;
        return;
      }
      if (csv.rows.length > this.maxRows) {
        this.uploadError = t.tooMany(this.maxRows);
        return;
      }
      this.uploadError = null;
      this.source = { name, size, csv };
      this.mapping = guessMapping(csv.headers, this.fields);
      this.recompute();
      this.step = 1;
    },
    downloadTemplate(this: WizardState) {
      const csv = `﻿${this.fields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",")}\n`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "template.csv";
      a.click();
      URL.revokeObjectURL(url);
    },

    /* step 1 */
    recompute(this: WizardState) {
      this.rows = this.source ? buildRows(this.source.csv.rows, this.mapping, this.fields, { uniqueKey: this.uniqueKey }) : [];
    },
    options(this: WizardState) {
      const headers = this.source?.csv.headers ?? [];
      return [{ value: SKIP, label: this.t().skip }, ...headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` }))];
    },
    isSelected(this: WizardState, key: string, value: string) {
      const col = this.mapping[key] ?? null;
      return (col === null ? SKIP : String(col)) === value;
    },
    setMap(this: WizardState, key: string, value: string) {
      this.mapping = { ...this.mapping, [key]: value === SKIP ? null : Number(value) };
      this.recompute();
    },
    unmapped(this: WizardState, key: string) {
      return (this.mapping[key] ?? null) === null;
    },
    sample(this: WizardState, key: string) {
      const col = this.mapping[key] ?? null;
      return col !== null && this.source ? (this.source.csv.rows[0]?.[col] ?? "") : "";
    },

    /* step 2 and 3 */
    importLabel(this: WizardState) {
      return this.t().importN(this.toImport().length);
    },
    showingText(this: WizardState) {
      return this.t().showing(PREVIEW_ROWS, this.rows.length);
    },
    importedText(this: WizardState) {
      const r = this.result;
      if (!r) return "";
      const skipped = this.rows.length - this.toImport().length;
      return this.t().imported(r.imported) + (skipped > 0 ? ` · ${this.t().skipped(skipped)}` : "");
    },
    runImport(this: WizardState) {
      this.busy = true;
      this.runError = null;
      this.result = null;
      this.step = 3;
      const rows = this.toImport().map((row) => row.values);
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
        this.busy = false;
      };
      const done = (r?: ImportResult | void) =>
        finish(() => {
          if (r && r.error) this.runError = r.error;
          else this.result = r ?? { imported: rows.length };
        });
      const fail = (message?: string) => finish(() => (this.runError = message || this.t().failed));
      this.root.dispatchEvent(new CustomEvent("import", { bubbles: true, detail: { rows, done, fail } }));
    },
    finish(this: WizardState) {
      this.root.dispatchEvent(new CustomEvent("done", { bubbles: true }));
    },
    reset(this: WizardState) {
      this.step = 0;
      this.source = null;
      this.mapping = {};
      this.rows = [];
      this.paste = "";
      this.result = null;
      this.runError = null;
      this.uploadError = null;
    },

    /* stepper */
    stepStatus(this: WizardState, index: number) {
      return index < this.step ? "complete" : index === this.step ? "current" : "upcoming";
    },
    stepLabel(this: WizardState, index: number) {
      const s = this.stepStatus(index);
      const [en, ar] = s === "complete" ? ["Completed", "مكتملة"] : s === "current" ? ["Current step", "الخطوة الحالية"] : ["Upcoming", "قادمة"];
      return this.$nq.t(en, ar);
    },
    markerClass(this: WizardState, index: number) {
      return { complete: "border-transparent bg-primary text-primary-foreground", current: "border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30", upcoming: "border-border bg-background text-muted-foreground" }[this.stepStatus(index)];
    },
  }));
};
