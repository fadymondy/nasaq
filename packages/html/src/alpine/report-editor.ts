// nqReportEditor: the state of the report editor (the report, the Edit / Preview tab, dirty tracking, Save) and the block operations.
// The markup is <x-nq::report-editor>; the Preview tab is rendered here (report-editor-logic.ts) so it follows every keystroke.
//
//   <div x-data="nqReportEditor(report, words, { locale: 'en', defaultView: 'edit', readOnly: false, canSave: true })"> … </div>
//
// Events (bubbling, from the root):
//   nq-change  { report }          after every edit.
//   nq-save    { report, promise } Save was pressed. A listener may set detail.promise to a Promise resolving to nothing or { error }; without one
//                                  the report counts as saved at once.
//   nq-print   (cancelable)        Print was pressed in the preview. Not cancelled: window.print().

import type { Magics, Register } from "./types";
import {
  BLOCK_TYPES,
  blockHasIssue,
  cloneBlock,
  convertBlock,
  fitBlock,
  issueCount,
  makeId,
  newBlock,
  parseNumber,
  readingMinutes,
  renderPreview,
  wordCount,
  type Block,
  type BlockType,
  type Report,
  type Words,
} from "./report-editor-logic";

interface Options {
  locale?: string;
  defaultView?: "edit" | "preview";
  readOnly?: boolean;
  canSave?: boolean;
}

interface EditorState extends Magics {
  report: Report;
  t: Words;
  locale: string;
  view: "edit" | "preview";
  readOnly: boolean;
  canSave: boolean;
  saved: string;
  status: "idle" | "saving" | "error";
  message: string;
  uid: string;
  failed: string;
  types: readonly BlockType[];
  readonly dirty: boolean;
  readonly words: number;
  readonly minutes: number;
  readonly issues: number;
  readonly preview: string;
  save(): Promise<void>;
}

const rows = (b: Block) => b.rows as { label: string; values: number[] }[];
const cells = (b: Block) => b.rows as unknown as string[][];

export const reportEditor: Register = (Alpine) => {
  Alpine.data("nqReportEditor", (initial: Report, t: Words, options: Options = {}) => ({
    report: { ...initial, title: initial?.title ?? "", blocks: (initial?.blocks ?? []).map((b) => ({ ...b })) } as Report,
    t,
    locale: options.locale ?? "en",
    view: options.readOnly ? "preview" : (options.defaultView ?? "edit"),
    readOnly: !!options.readOnly,
    canSave: !!options.canSave,
    saved: JSON.stringify(initial ?? { title: "", blocks: [] }),
    status: "idle" as "idle" | "saving" | "error",
    message: "",
    uid: makeId(),
    failed: "",
    types: BLOCK_TYPES,

    init(this: EditorState) {
      // Normalise what the host passed: rows as wide as the columns, values as long as the series.
      this.report.blocks.forEach(fitBlock);
      this.saved = JSON.stringify(this.report);
      this.$watch("report", () => {
        if (this.status === "error" && JSON.stringify(this.report) !== this.failed) this.status = "idle";
        this.$dispatch("nq-change", { report: this.report });
      });
    },

    get dirty(): boolean {
      return JSON.stringify((this as unknown as EditorState).report) !== (this as unknown as EditorState).saved;
    },
    get words(): number {
      return wordCount((this as unknown as EditorState).report);
    },
    get minutes(): number {
      return readingMinutes(wordCount((this as unknown as EditorState).report));
    },
    get issues(): number {
      return issueCount((this as unknown as EditorState).report);
    },
    get preview(): string {
      const s = this as unknown as EditorState;
      return renderPreview(s.report, s.t, s.locale, s.uid);
    },

    // The Edit / Preview toggle group binds to this (it holds an array; clicking the pressed item clears it, which is undone).
    get viewSel(): string[] {
      return [(this as unknown as EditorState).view];
    },
    set viewSel(value: string[]) {
      const s = this as unknown as EditorState;
      if (value[0] === "edit" || value[0] === "preview") s.view = value[0];
      else {
        const keep = s.view;
        s.view = "" as "edit";
        void s.$nextTick(() => (s.view = keep));
      }
    },

    num(n: number): string {
      return new Intl.NumberFormat(this.locale).format(n);
    },
    say(sentence: string, ...values: (string | number)[]): string {
      return sentence.replace(/:([nabc])/g, (_: string, k: string) => String(values["nabc".indexOf(k)] ?? ""));
    },
    typeName(type: BlockType): string {
      return this.t[`type${type[0]!.toUpperCase()}${type.slice(1)}`] ?? type;
    },
    hasIssue(b: Block): boolean {
      return blockHasIssue(b);
    },
    summary(b: Block): string {
      if (b.type === "metrics") return (b.items ?? []).map((m) => m.label).filter(Boolean).join(", ");
      if (b.type === "chart") return b.title ?? "";
      if (b.type === "table") return b.title || (b.columns ?? []).filter(Boolean).join(", ");
      return (b.type === "text" ? (b.html ?? "").replace(/<[^>]*>/g, " ") : (b.text ?? "")).replace(/\s+/g, " ").trim().slice(0, 90);
    },

    // Blocks
    add(this: EditorState, type: BlockType) {
      this.report.blocks.push(newBlock(type));
    },
    convert(this: EditorState, index: number, type: BlockType) {
      const current = this.report.blocks[index];
      if (current && current.type !== type) this.report.blocks.splice(index, 1, convertBlock(JSON.parse(JSON.stringify(current)) as Block, type));
    },
    newBlockExpr(type: BlockType): Block {
      return newBlock(type);
    },
    cloneBlockExpr(b: Block): Block {
      return cloneBlock(JSON.parse(JSON.stringify(b)) as Block);
    },

    // Key figures
    addFigure(b: Block) {
      (b.items ??= []).push({ id: makeId(), label: "", value: 0 });
    },
    removeFigure(b: Block, i: number) {
      if ((b.items ?? []).length > 1) b.items!.splice(i, 1);
    },
    setDelta(item: { delta?: number | null }, text: string) {
      item.delta = text.trim() === "" ? null : parseNumber(text) / 100;
    },
    deltaText(item: { delta?: number | null }): string {
      return typeof item.delta === "number" ? String(Math.round(item.delta * 10000) / 100) : "";
    },
    setNumber(target: Record<string, unknown>, key: string, text: string) {
      target[key] = parseNumber(text);
    },
    setValue(row: { values: number[] }, i: number, text: string) {
      row.values[i] = parseNumber(text);
    },

    // Chart
    addSeries(b: Block) {
      (b.series ??= []).push(this.say(this.t.defaultSeries ?? "", this.num((b.series ?? []).length + 1)));
      fitBlock(b);
    },
    removeSeries(b: Block, i: number) {
      if ((b.series ?? []).length <= 1) return;
      b.series!.splice(i, 1);
      for (const r of rows(b)) r.values.splice(i, 1);
    },
    addRow(b: Block) {
      if (b.type === "chart") rows(b).push({ label: "", values: (b.series ?? []).map(() => 0) });
      else cells(b).push((b.columns ?? []).map(() => ""));
    },
    removeRow(b: Block, i: number) {
      if (b.rows!.length > 1) b.rows!.splice(i, 1);
    },

    // Table
    addColumn(b: Block) {
      (b.columns ??= []).push("");
      fitBlock(b);
    },
    removeColumn(b: Block, i: number) {
      if ((b.columns ?? []).length <= 1) return;
      b.columns!.splice(i, 1);
      for (const r of cells(b)) r.splice(i, 1);
    },

    // Save and print
    async save(this: EditorState) {
      if (!this.canSave) return;
      const snapshot = JSON.stringify(this.report);
      this.status = "saving";
      this.message = "";
      const detail: { report: Report; promise?: Promise<void | { error?: string }> } = { report: this.report };
      this.$el.dispatchEvent(new CustomEvent("nq-save", { bubbles: true, detail }));
      try {
        const result = await detail.promise;
        if (result && result.error) {
          this.status = "error";
          this.message = result.error;
          this.failed = snapshot;
          return;
        }
        this.saved = snapshot;
        this.status = "idle";
      } catch (error) {
        this.failed = snapshot;
        this.status = "error";
        this.message = error instanceof Error && error.message ? error.message : (this.t.saveFailed ?? "");
      }
    },
    print(this: EditorState) {
      const event = new CustomEvent("nq-print", { bubbles: true, cancelable: true });
      if (this.$el.dispatchEvent(event)) window.print();
    },
  }));
};
