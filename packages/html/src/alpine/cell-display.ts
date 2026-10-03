// Cell display helpers shared by the list components that draw typed cells (the entity list). They are the DataTable's own helpers
// (see data-table.ts), written against a state with `locale` and `columns`; spread them into an Alpine.data object.
// A column is { id, key?, type?, options?, template?, format?, max?, warnAt?, dangerAt?, secondary?, src?, href?, currency? }.

type Row = Record<string, unknown>;
export interface CellOption {
  value: string;
  label: string;
  tone?: string;
  hue?: string;
}
export interface CellColumn {
  id: string;
  key?: string;
  type?: "text" | "number" | "date" | "datetime" | "currency" | "status" | "tag" | "boolean" | "mono" | "meter" | "avatar" | "link" | "html";
  options?: CellOption[];
  template?: string;
  format?: "absolute" | "relative";
  max?: number;
  warnAt?: number;
  dangerAt?: number;
  secondary?: string;
  src?: string;
  href?: string;
  currency?: string;
}
interface Host {
  locale: string;
  columns: CellColumn[];
  [k: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const cellHelpers = {
  col(this: Host, id: string): CellColumn | undefined {
    return this.columns.find((c) => c.id === id);
  },
  val(row: Row, col: CellColumn): unknown {
    return row[col.key ?? col.id];
  },
  opt(col: CellColumn, value: unknown): CellOption | undefined {
    return col.options?.find((o) => o.value === String(value));
  },
  nf(this: Host, n: number, o?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(`${this.locale}-u-nu-latn`, o).format(n);
  },
  display(this: Host, row: Row, col: CellColumn, raw?: unknown): string {
    const v = raw === undefined ? this.val(row, col) : raw;
    if (v === null || v === undefined || v === "") return "";
    if (col.type === "number") return this.nf(Number(v));
    if (col.type === "currency") return this.nf(Number(v), { style: "currency", currency: col.currency ?? (this.locale.startsWith("ar") ? "SAR" : "USD") });
    if (col.type === "date") return new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium" }).format(new Date(`${String(v)}T00:00:00`));
    if (col.type === "datetime") return col.format === "relative" ? this.relative(v) : this.absolute(v);
    if (col.type === "meter") return this.nf(Number(v) / (col.max ?? 100), { style: "percent", maximumFractionDigits: 0 });
    if (col.type === "status" || col.type === "tag") return this.opt(col, v)?.label ?? String(v);
    if (col.template && row && Object.keys(row).length) return this.fillRow(col.template, row);
    return String(v);
  },
  when(v: unknown): Date {
    const t = String(v);
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00` : t);
  },
  absolute(this: Host, v: unknown): string {
    const d = this.when(v);
    return Number.isNaN(d.getTime()) ? String(v) : new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "short" }).format(d);
  },
  relative(this: Host, v: unknown): string {
    const d = this.when(v);
    if (Number.isNaN(d.getTime())) return String(v);
    const secs = Math.round((d.getTime() - Date.now()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
    const [unit, size] = units.find(([, n]) => Math.abs(secs) >= n) ?? (["second", 1] as [Intl.RelativeTimeFormatUnit, number]);
    return new Intl.RelativeTimeFormat(`${this.locale}-u-nu-latn`, { numeric: "auto" }).format(Math.round(secs / size), unit);
  },
  absoluteOf(this: Host, row: Row, col: CellColumn): string {
    const v = this.val(row, col);
    return v === null || v === undefined || v === "" ? "" : this.absolute(v);
  },
  isoOf(this: Host, row: Row, col: CellColumn): string | null {
    const v = this.val(row, col);
    const d = v === null || v === undefined || v === "" ? null : this.when(v);
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  },
  fillRow(template: string, row: Row): string {
    return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(row[k] ?? ""));
  },
  initials(name: unknown): string {
    const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
    const first = (w: string) => [...new Intl.Segmenter().segment(w)][0]?.segment ?? "";
    return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1]!) : "")).toUpperCase();
  },
  secondary(row: Row, col: CellColumn): string {
    const v = col.secondary ? row[col.secondary] : "";
    return v === null || v === undefined ? "" : String(v);
  },
  avatarSrc(row: Row, col: CellColumn): string {
    const v = col.src ? row[col.src] : "";
    return v === null || v === undefined ? "" : String(v);
  },
  href(this: Host, row: Row, col: CellColumn): string | null {
    const h = col.href;
    const raw = this.val(row, col);
    const url = h ? (h.includes("{") ? this.fillRow(h, row) : String(row[h] ?? h)) : raw == null ? "" : String(raw);
    return !url || /^\s*(javascript|data|vbscript):/i.test(url) ? null : url;
  },
  meterFraction(this: Host, row: Row, col: CellColumn): number {
    const n = Number(this.val(row, col));
    const max = col.max ?? 100;
    return Number.isFinite(n) && max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
  },
  meterTone(this: Host, row: Row, col: CellColumn): string {
    const f = this.meterFraction(row, col);
    return f >= (col.dangerAt ?? 0.95) ? "danger" : f >= (col.warnAt ?? 0.8) ? "warning" : "default";
  },
  meterWidth(this: Host, row: Row, col: CellColumn): string {
    return `inset-inline-start:0;width:${Math.round(this.meterFraction(row, col) * 10000) / 100}%`;
  },
  tone(this: Host, row: Row, col: CellColumn): string {
    return this.opt(col, this.val(row, col))?.tone ?? "neutral";
  },
  hueStyle(this: Host, row: Row, col: CellColumn): string {
    const hue = this.opt(col, this.val(row, col))?.hue ?? "gray";
    return `--tag-solid: var(--nq-tag-${hue}); --tag-soft: var(--nq-tag-${hue}-soft)`;
  },
  shownValue(this: Host, row: Row, col: CellColumn): unknown {
    return this.val(row, col);
  },
  shownText(this: Host, row: Row, col: CellColumn): string {
    return this.display(row, col, this.val(row, col));
  },
};
