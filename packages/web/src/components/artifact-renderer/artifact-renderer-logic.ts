/**
 * The artifact schema and its validator. An agent sends JSON, this turns it into typed data or a clear error.
 * Nothing here is React and nothing is trusted: every string stays a string, colours are limited to theme tokens,
 * and sizes are capped, so a hostile or broken payload cannot render more than a bounded page of text.
 */

/** Plain text, or one string per language. The renderer picks by the active locale and falls back to English. */
export type ArtifactText = string | { en?: string; ar?: string };
export type ArtifactCell = string | number | boolean | null;
export type ArtifactTone = "neutral" | "success" | "warning" | "danger" | "info";
export type ArtifactVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ArtifactAction {
  id: string;
  label: ArtifactText;
  variant?: ArtifactVariant;
  /** Ask first: a dialog with this text and a Confirm button. */
  confirm?: ArtifactText;
}

interface Base {
  /** Sent back with `onPick` so you know which artifact answered. */
  id?: string;
  title?: ArtifactText;
  description?: ArtifactText;
}

export interface CardArtifact extends Base {
  kind: "card";
  badges?: { label: ArtifactText; tone?: ArtifactTone }[];
  fields?: { label: ArtifactText; value: ArtifactCell }[];
  /** A short list: tasks, findings, line items. Each row may carry a value on the end side and a tone dot. */
  items?: { label: ArtifactText; description?: ArtifactText; value?: ArtifactCell; tone?: ArtifactTone }[];
  /** Markdown. Raw HTML is dropped. */
  body?: ArtifactText;
  /** A muted note at the bottom: a source, a timestamp, a caveat. */
  footer?: ArtifactText;
  actions?: ArtifactAction[];
}
export interface TableArtifact extends Base {
  kind: "table";
  columns: { key: string; label: ArtifactText; align?: "start" | "end" }[];
  rows: Record<string, ArtifactCell>[];
}
export interface ChartArtifact extends Base {
  kind: "chart";
  /** `pie` and `donut` use the first series as slice sizes and `xKey` as slice names. More than 8 slices fold into "Other". */
  chart?: "bar" | "line" | "area" | "pie" | "donut";
  xKey: string;
  series: { key: string; label: ArtifactText; color?: string }[];
  data: Record<string, string | number>[];
}
export interface MarkdownArtifact extends Base {
  kind: "markdown";
  text: string;
}
export interface CodeArtifact extends Base {
  kind: "code";
  code: string;
  language?: string;
  filename?: string;
}
export interface ActionsArtifact extends Base {
  kind: "actions";
  actions: ArtifactAction[];
}
export interface PickerArtifact extends Base {
  kind: "picker";
  mode?: "single" | "multiple";
  options: { value: string; label: ArtifactText; description?: ArtifactText }[];
  defaultValue?: string[];
  submitLabel?: ArtifactText;
}
export interface StatsArtifact extends Base {
  kind: "stats";
  items: {
    label: ArtifactText;
    value: string | number;
    delta?: number;
    invert?: boolean;
    /** A dot before the label, with the tone named for screen readers. */
    tone?: ArtifactTone;
    /** A trend line, oldest first. Up to 60 points. */
    sparkline?: number[];
  }[];
}
/** HTML from the agent. Rendered only when the renderer is told `allowHtml`, and then only in a sandboxed frame. */
export interface HtmlArtifact extends Base {
  kind: "html";
  html: string;
  height?: number;
}

export type Artifact = CardArtifact | TableArtifact | ChartArtifact | MarkdownArtifact | CodeArtifact | ActionsArtifact | PickerArtifact | StatsArtifact | HtmlArtifact;
export type ArtifactKind = Artifact["kind"];

export const ARTIFACT_KINDS: readonly ArtifactKind[] = ["card", "table", "chart", "markdown", "code", "actions", "picker", "stats", "html"];

export const ARTIFACT_LIMITS = {
  text: 20_000,
  short: 300,
  rows: 200,
  columns: 20,
  series: 8,
  points: 200,
  options: 50,
  actions: 8,
  fields: 30,
  items: 12,
  slices: 8,
  sparkline: 60,
  html: 60_000,
} as const;

export type ArtifactParse = { ok: true; artifact: Artifact } | { ok: false; error: string; kind?: string };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const TONES: readonly ArtifactTone[] = ["neutral", "success", "warning", "danger", "info"];
const VARIANTS: readonly ArtifactVariant[] = ["primary", "secondary", "ghost", "danger"];
type ChartType = NonNullable<ChartArtifact["chart"]>;
const CHARTS: readonly ChartType[] = ["bar", "line", "area", "pie", "donut"];

class Bad extends Error {}
const fail = (msg: string): never => {
  throw new Bad(msg);
};

function str(v: unknown, path: string, max: number = ARTIFACT_LIMITS.short): string {
  if (typeof v !== "string") return fail(`${path} must be a string`);
  if (v.length > max) return fail(`${path} is longer than ${max} characters`);
  return v;
}

function text(v: unknown, path: string, max: number = ARTIFACT_LIMITS.short): ArtifactText {
  if (typeof v === "string") return str(v, path, max);
  if (isRecord(v)) {
    const out: { en?: string; ar?: string } = {};
    if (v.en !== undefined) out.en = str(v.en, `${path}.en`, max);
    if (v.ar !== undefined) out.ar = str(v.ar, `${path}.ar`, max);
    if (out.en === undefined && out.ar === undefined) return fail(`${path} needs an en or ar string`);
    return out;
  }
  return fail(`${path} must be a string or { en, ar }`);
}

function cell(v: unknown, path: string): ArtifactCell {
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : fail(`${path} must be a finite number`);
  return str(v, path, ARTIFACT_LIMITS.text);
}

function list<T>(v: unknown, path: string, max: number, each: (item: unknown, path: string) => T): T[] {
  if (!Array.isArray(v)) return fail(`${path} must be an array`);
  if (v.length > max) return fail(`${path} has more than ${max} items`);
  return v.map((x, i) => each(x, `${path}[${i}]`));
}

function obj(v: unknown, path: string): Record<string, unknown> {
  return isRecord(v) ? v : fail(`${path} must be an object`);
}

function tone(v: unknown, path: string): ArtifactTone {
  return TONES.includes(v as ArtifactTone) ? (v as ArtifactTone) : fail(`${path} is not one of ${TONES.join(", ")}`);
}

function action(v: unknown, path: string): ArtifactAction {
  const o = obj(v, path);
  const out: ArtifactAction = { id: str(o.id, `${path}.id`, 80), label: text(o.label, `${path}.label`) };
  if (o.variant !== undefined) {
    if (!VARIANTS.includes(o.variant as ArtifactVariant)) fail(`${path}.variant is not one of ${VARIANTS.join(", ")}`);
    out.variant = o.variant as ArtifactVariant;
  }
  if (o.confirm !== undefined) out.confirm = text(o.confirm, `${path}.confirm`, 500);
  return out;
}

/** Only theme tokens: `var(--nq-tag-teal)`. Anything else (hex, url(), expressions) is dropped so it cannot inject CSS. */
export function safeColor(v: unknown): string | undefined {
  return typeof v === "string" && /^var\(--[a-z0-9-]{1,40}\)$/i.test(v) ? v : undefined;
}

/** Accepts the older wire shape `title_en` / `title_ar` too. */
function withBilingual(o: Record<string, unknown>, key: "title" | "description"): unknown {
  if (o[key] !== undefined) return o[key];
  const en = o[`${key}_en`];
  const ar = o[`${key}_ar`];
  if (en === undefined && ar === undefined) return undefined;
  return { ...(en !== undefined ? { en } : {}), ...(ar !== undefined ? { ar } : {}) };
}

function build(input: unknown): Artifact {
  const o = obj(input, "artifact");
  const kind = o.kind;
  if (typeof kind !== "string") return fail("kind is required");
  if (!ARTIFACT_KINDS.includes(kind as ArtifactKind)) return fail(`kind "${kind.slice(0, 40)}" is not supported`);
  const base: Base = {};
  if (o.id !== undefined) base.id = str(o.id, "id", 80);
  const title = withBilingual(o, "title");
  if (title !== undefined) base.title = text(title, "title");
  const description = withBilingual(o, "description");
  if (description !== undefined) base.description = text(description, "description", 1000);

  switch (kind as ArtifactKind) {
    case "card": {
      const a: CardArtifact = { ...base, kind: "card" };
      if (o.badges !== undefined)
        a.badges = list(o.badges, "badges", ARTIFACT_LIMITS.items, (b, p) => {
          const bo = obj(b, p);
          return { label: text(bo.label, `${p}.label`, 80), ...(bo.tone !== undefined ? { tone: tone(bo.tone, `${p}.tone`) } : {}) };
        });
      if (o.fields !== undefined)
        a.fields = list(o.fields, "fields", ARTIFACT_LIMITS.fields, (f, p) => {
          const fo = obj(f, p);
          return { label: text(fo.label, `${p}.label`, 120), value: cell(fo.value, `${p}.value`) };
        });
      if (o.items !== undefined)
        a.items = list(o.items, "items", ARTIFACT_LIMITS.fields, (x, p) => {
          const xo = obj(x, p);
          return {
            label: text(xo.label, `${p}.label`, 200),
            ...(xo.description !== undefined ? { description: text(xo.description, `${p}.description`, 400) } : {}),
            ...(xo.value !== undefined ? { value: cell(xo.value, `${p}.value`) } : {}),
            ...(xo.tone !== undefined ? { tone: tone(xo.tone, `${p}.tone`) } : {}),
          };
        });
      if (o.body !== undefined) a.body = text(o.body, "body", ARTIFACT_LIMITS.text);
      if (o.footer !== undefined) a.footer = text(o.footer, "footer", 500);
      if (o.actions !== undefined) a.actions = list(o.actions, "actions", ARTIFACT_LIMITS.actions, action);
      return a;
    }
    case "table": {
      const columns = list(o.columns, "columns", ARTIFACT_LIMITS.columns, (c, p) => {
        const co = obj(c, p);
        const align: "start" | "end" | undefined = co.align === undefined ? undefined : co.align === "start" ? "start" : co.align === "end" ? "end" : fail(`${p}.align must be start or end`);
        return { key: str(co.key, `${p}.key`, 80), label: text(co.label, `${p}.label`, 120), ...(align ? { align } : {}) };
      });
      const rows = list(o.rows, "rows", ARTIFACT_LIMITS.rows, (r, p) => {
        const ro = obj(r, p);
        return Object.fromEntries(columns.map((c) => [c.key, ro[c.key] === undefined ? null : cell(ro[c.key], `${p}.${c.key}`)]));
      });
      return { ...base, kind: "table", columns, rows };
    }
    case "chart": {
      const chart = o.chart === undefined ? undefined : CHARTS.includes(o.chart as ChartType) ? (o.chart as ChartType) : fail(`chart must be ${CHARTS.join(", ")}`);
      const xKey = str(o.xKey, "xKey", 80);
      const series = list(o.series, "series", ARTIFACT_LIMITS.series, (s, p) => {
        const so = obj(s, p);
        const color = safeColor(so.color);
        return { key: str(so.key, `${p}.key`, 80), label: text(so.label, `${p}.label`, 120), ...(color ? { color } : {}) };
      });
      if (series.length === 0) fail("series needs at least one entry");
      const data = list(o.data, "data", ARTIFACT_LIMITS.points, (d, p) => {
        const dobj = obj(d, p);
        const row: Record<string, string | number> = {};
        const x = dobj[xKey];
        row[xKey] = typeof x === "number" || typeof x === "string" ? (typeof x === "string" ? str(x, `${p}.${xKey}`, 120) : x) : fail(`${p}.${xKey} must be a string or number`);
        for (const s of series) {
          const y = dobj[s.key];
          if (typeof y !== "number" || !Number.isFinite(y)) fail(`${p}.${s.key} must be a finite number`);
          row[s.key] = y as number;
        }
        return row;
      });
      return { ...base, kind: "chart", ...(chart ? { chart } : {}), xKey, series, data };
    }
    case "markdown":
      return { ...base, kind: "markdown", text: str(o.text, "text", ARTIFACT_LIMITS.text) };
    case "code":
      return {
        ...base,
        kind: "code",
        code: str(o.code, "code", ARTIFACT_LIMITS.text),
        ...(o.language !== undefined ? { language: str(o.language, "language", 40) } : {}),
        ...(o.filename !== undefined ? { filename: str(o.filename, "filename", 200) } : {}),
      };
    case "actions": {
      const actions = list(o.actions, "actions", ARTIFACT_LIMITS.actions, action);
      if (actions.length === 0) fail("actions needs at least one entry");
      return { ...base, kind: "actions", actions };
    }
    case "picker": {
      const mode = o.mode === undefined ? undefined : o.mode === "single" || o.mode === "multiple" ? o.mode : fail("mode must be single or multiple");
      const options = list(o.options, "options", ARTIFACT_LIMITS.options, (x, p) => {
        const xo = obj(x, p);
        return {
          value: str(xo.value, `${p}.value`, 120),
          label: text(xo.label, `${p}.label`, 200),
          ...(xo.description !== undefined ? { description: text(xo.description, `${p}.description`, 400) } : {}),
        };
      });
      if (options.length === 0) fail("options needs at least one entry");
      const values = new Set(options.map((x) => x.value));
      if (values.size !== options.length) fail("options must have unique values");
      const defaultValue = o.defaultValue === undefined ? undefined : list(o.defaultValue, "defaultValue", ARTIFACT_LIMITS.options, (v, p) => str(v, p, 120)).filter((v) => values.has(v));
      return {
        ...base,
        kind: "picker",
        ...(mode ? { mode } : {}),
        options,
        ...(defaultValue ? { defaultValue } : {}),
        ...(o.submitLabel !== undefined ? { submitLabel: text(o.submitLabel, "submitLabel", 80) } : {}),
      };
    }
    case "stats": {
      const items = list(o.items, "items", ARTIFACT_LIMITS.items, (x, p) => {
        const xo = obj(x, p);
        const value = typeof xo.value === "number" ? (Number.isFinite(xo.value) ? xo.value : fail(`${p}.value must be finite`)) : str(xo.value, `${p}.value`, 80);
        const delta = xo.delta === undefined ? undefined : typeof xo.delta === "number" && Number.isFinite(xo.delta) ? xo.delta : fail(`${p}.delta must be a number`);
        const sparkline =
          xo.sparkline === undefined
            ? undefined
            : list(xo.sparkline, `${p}.sparkline`, ARTIFACT_LIMITS.sparkline, (n, q) => (typeof n === "number" && Number.isFinite(n) ? n : fail(`${q} must be a finite number`)));
        return {
          label: text(xo.label, `${p}.label`, 120),
          value,
          ...(delta !== undefined ? { delta } : {}),
          ...(xo.invert === true ? { invert: true } : {}),
          ...(xo.tone !== undefined ? { tone: tone(xo.tone, `${p}.tone`) } : {}),
          ...(sparkline && sparkline.length > 1 ? { sparkline } : {}),
        };
      });
      if (items.length === 0) fail("items needs at least one entry");
      return { ...base, kind: "stats", items };
    }
    case "html": {
      const height = o.height === undefined ? undefined : typeof o.height === "number" && Number.isFinite(o.height) ? o.height : fail("height must be a number");
      return { ...base, kind: "html", html: str(o.html, "html", ARTIFACT_LIMITS.html), ...(height !== undefined ? { height } : {}) };
    }
  }
}

/** Validates one payload. Returns the typed artifact, or the first problem in words. Never throws. */
export function parseArtifact(input: unknown): ArtifactParse {
  try {
    return { ok: true, artifact: build(input) };
  } catch (e) {
    const kind = isRecord(input) && typeof input.kind === "string" ? input.kind.slice(0, 40) : undefined;
    return { ok: false, error: e instanceof Bad ? e.message : "Invalid artifact", ...(kind ? { kind } : {}) };
  }
}

/** Picks the string for a locale. Falls back to the other language, then to an empty string. */
export function localize(value: ArtifactText | undefined, locale: string): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  const ar = locale.startsWith("ar");
  return (ar ? (value.ar ?? value.en) : (value.en ?? value.ar)) ?? "";
}

/** Height of an HTML frame clamped to a sane range. */
export function frameHeight(h: number | undefined): number {
  return Math.min(600, Math.max(80, Number.isFinite(h) ? (h as number) : 240));
}

/**
 * The document put in the sandboxed frame: your HTML behind a Content Security Policy that blocks scripts, network
 * and forms. The frame itself has an empty `sandbox`, so it has no script, no same-origin access and no navigation.
 */
export function frameDocument(html: string): string {
  const csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:";
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank">${html}`;
}

export interface ExtractedArtifacts {
  /** The text with every artifact block removed. */
  text: string;
  artifacts: ArtifactParse[];
}

const FENCE = /```(?:artifact|a2ui)[ \t]*\r?\n([\s\S]*?)```/g;

/**
 * Pulls ```artifact (or ```a2ui) JSON blocks out of a model's answer. Each block is validated on its own, so one bad
 * block does not hide the others. An unterminated block (still streaming) is left in the text.
 */
export function extractArtifacts(source: string): ExtractedArtifacts {
  const artifacts: ArtifactParse[] = [];
  const text = source.replace(FENCE, (_whole, body: string) => {
    try {
      artifacts.push(parseArtifact(JSON.parse(body)));
    } catch {
      artifacts.push({ ok: false, error: "The block is not valid JSON" });
    }
    return "";
  });
  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), artifacts };
}

export interface PieSlice {
  name: string;
  value: number;
  /** The folded remainder. Its name is empty; the renderer labels it "Other". */
  other?: true;
}

/**
 * The slices of a pie or donut: the first series by `xKey`, zero and negative values dropped. Past `max` slices the
 * smallest ones fold into one "Other" slice, so the palette never repeats a colour.
 */
export function pieSlices(artifact: ChartArtifact, max: number = ARTIFACT_LIMITS.slices): PieSlice[] {
  const key = artifact.series[0]?.key;
  if (key === undefined) return [];
  const all = artifact.data
    .map((row) => ({ name: String(row[artifact.xKey] ?? ""), value: Number(row[key]) }))
    .filter((s) => Number.isFinite(s.value) && s.value > 0);
  if (all.length <= max) return all;
  const keep = new Set([...all].sort((a, b) => b.value - a.value).slice(0, max - 1));
  const rest = all.filter((s) => !keep.has(s)).reduce((sum, s) => sum + s.value, 0);
  return [...all.filter((s) => keep.has(s)), { name: "", value: rest, other: true }];
}
