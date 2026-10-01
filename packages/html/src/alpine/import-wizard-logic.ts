/** Pure helpers for ImportWizard: CSV parsing, column mapping guesses and row validation. No dependencies. */

export type ImportFieldType = "text" | "email" | "phone" | "number" | "date" | "url";

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: ImportFieldType;
  /** Other header names that should map to this field (case-insensitive). Add the Arabic ones too. */
  aliases?: string[];
}

/** Column index per field key. `null` means the field is skipped. */
export type ColumnMapping = Record<string, number | null>;

export type IssueCode = "required" | "email" | "phone" | "number" | "date" | "url" | "duplicate";

export interface RowIssue {
  /** Field key the problem is on. */
  field: string;
  code: IssueCode;
}

export interface ParsedRow {
  /** 1-based line number in the source, counting the header as line 1. */
  line: number;
  values: Record<string, string>;
  issues: RowIssue[];
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

/** Picks the delimiter that splits the first line into the most cells: comma, semicolon, tab or pipe. */
export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  let best = ",";
  let bestCount = 0;
  for (const d of [",", ";", "\t", "|"]) {
    let count = 0;
    let quoted = false;
    for (const ch of first) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/** RFC 4180 style parser: quoted cells, doubled quotes, embedded newlines, CRLF or LF. Strips a leading BOM. */
export function parseCsv(input: string, delimiter?: string): ParsedCsv {
  const text = input.replace(/^﻿/, "");
  const sep = delimiter ?? detectDelimiter(text);
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      table.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    table.push(row);
  }
  const nonEmpty = table.filter((r) => r.some((c) => c.trim() !== ""));
  const [head = [], ...rows] = nonEmpty;
  return { headers: head.map((h) => h.trim()), rows, delimiter: sep };
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-./]+/g, "");

/** Maps each field to the header that matches its key, label or an alias. Each column is used once. */
export function guessMapping(headers: readonly string[], fields: readonly ImportField[]): ColumnMapping {
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const f of fields) {
    const names = [f.key, f.label, ...(f.aliases ?? [])].map(norm);
    const idx = headers.findIndex((h, i) => !used.has(i) && names.includes(norm(h)));
    mapping[f.key] = idx >= 0 ? idx : null;
    if (idx >= 0) used.add(idx);
  }
  return mapping;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9][0-9\s().-]{5,18}[0-9]$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;

/** Returns the issue code for a non-empty value that does not fit the type, else null. */
export function checkType(value: string, type: ImportFieldType = "text"): IssueCode | null {
  const v = value.trim();
  if (v === "") return null;
  switch (type) {
    case "email":
      return EMAIL.test(v) ? null : "email";
    case "phone":
      return PHONE.test(v) ? null : "phone";
    case "number":
      return Number.isFinite(Number(v.replace(/,/g, ""))) ? null : "number";
    case "date":
      return Number.isNaN(Date.parse(v)) ? "date" : null;
    case "url":
      return URL_RE.test(v) ? null : "url";
    default:
      return null;
  }
}

export interface BuildRowsOptions {
  /** Field key that must be unique across rows (an email, an id). Later repeats are flagged `duplicate`. */
  uniqueKey?: string;
}

/** Applies the mapping to every row, then validates required fields, types and duplicates. */
export function buildRows(rows: readonly (readonly string[])[], mapping: ColumnMapping, fields: readonly ImportField[], options: BuildRowsOptions = {}): ParsedRow[] {
  const seen = new Set<string>();
  return rows.map((cells, i) => {
    const values: Record<string, string> = {};
    const issues: RowIssue[] = [];
    for (const f of fields) {
      const col = mapping[f.key];
      const value = col === null || col === undefined ? "" : (cells[col] ?? "").trim();
      values[f.key] = value;
      if (value === "") {
        if (f.required) issues.push({ field: f.key, code: "required" });
        continue;
      }
      const code = checkType(value, f.type);
      if (code) issues.push({ field: f.key, code });
    }
    if (options.uniqueKey) {
      const v = (values[options.uniqueKey] ?? "").toLowerCase();
      if (v !== "") {
        if (seen.has(v)) issues.push({ field: options.uniqueKey, code: "duplicate" });
        seen.add(v);
      }
    }
    return { line: i + 2, values, issues };
  });
}

/** Required fields that no column is mapped to. */
export const unmappedRequired = (mapping: ColumnMapping, fields: readonly ImportField[]) =>
  fields.filter((f) => f.required && (mapping[f.key] === null || mapping[f.key] === undefined));

export interface Summary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}

export function summarize(rows: readonly ParsedRow[]): Summary {
  const invalid = rows.filter((r) => r.issues.length > 0);
  return {
    total: rows.length,
    valid: rows.length - invalid.length,
    invalid: invalid.length,
    duplicates: rows.filter((r) => r.issues.some((i) => i.code === "duplicate")).length,
  };
}

export const STRINGS = {
  en: {
    steps: ["Upload", "Match columns", "Review", "Import"],
    uploadTitle: "Choose a file",
    uploadHint: "CSV or TSV. Working in Excel? Use Save as, then CSV.",
    dropPrompt: "Drop a CSV file here, or click to choose one",
    orPaste: "Or paste the rows",
    pastePlaceholder: "name,email,phone",
    usePasted: "Use pasted rows",
    template: "Download a template",
    fileTooBig: "That file is too large.",
    wrongType: "Use a CSV or TSV file.",
    empty: "The file has no rows.",
    tooMany: (n: number) => `Import up to ${n} rows at a time. Split the file and try again.`,
    readFailed: "Could not read that file.",
    loaded: (name: string, rows: number, cols: number) => `${name}: ${rows} rows, ${cols} columns`,
    mapTitle: "Match your columns",
    mapBody: "Say which column holds each field. We matched the ones we could.",
    fieldCol: "Field",
    sourceCol: "Column in your file",
    example: "Example",
    skip: "Do not import",
    required: "Required",
    unmappedRequired: (names: string) => `Match the required fields first: ${names}.`,
    reviewTitle: "Review before you import",
    ready: "Ready",
    problems: "Need fixing",
    duplicates: "Duplicates",
    total: "Total",
    skipInvalid: "Skip rows with problems",
    skipInvalidHint: "Rows with problems are left out. Fix them in the file to bring them in.",
    line: "Line",
    unresolved: "Rows with problems",
    showing: (n: number, total: number) => `Showing the first ${n} of ${total} rows`,
    issue: { required: "Missing", email: "Not an email", phone: "Not a phone number", number: "Not a number", date: "Not a date", url: "Not a link", duplicate: "Repeated" } satisfies Record<IssueCode, string>,
    importN: (n: number) => (n === 1 ? "Import 1 row" : `Import ${n} rows`),
    nothing: "Nothing to import",
    nothingBody: "Every row has a problem. Fix the file and upload it again.",
    back: "Back",
    next: "Next",
    importing: "Importing",
    done: "Import finished",
    imported: (n: number) => (n === 1 ? "1 row imported" : `${n} rows imported`),
    skipped: (n: number) => (n === 1 ? "1 row skipped" : `${n} rows skipped`),
    failedRows: "Rows the server refused",
    finish: "Done",
    another: "Import another file",
    retry: "Try again",
    failed: "The import did not finish. Nothing was lost; try again.",
    filePreview: "Preview of your rows",
  },
  ar: {
    steps: ["الرفع", "مطابقة الأعمدة", "المراجعة", "الاستيراد"],
    uploadTitle: "اختر ملفًا",
    uploadHint: "ملف CSV أو TSV. تعمل في إكسل؟ احفظ باسم ثم اختر CSV.",
    dropPrompt: "أفلت ملف CSV هنا، أو اضغط لاختياره",
    orPaste: "أو الصق الصفوف",
    pastePlaceholder: "الاسم,البريد,الهاتف",
    usePasted: "استخدم الصفوف الملصقة",
    template: "تنزيل قالب",
    fileTooBig: "هذا الملف كبير جدًا.",
    wrongType: "استخدم ملف CSV أو TSV.",
    empty: "الملف لا يحتوي على صفوف.",
    tooMany: (n: number) => `استورد حتى ${n} صف في المرة. قسّم الملف وحاول مجددًا.`,
    readFailed: "تعذّرت قراءة هذا الملف.",
    loaded: (name: string, rows: number, cols: number) => `${name}: ${rows} صف، ${cols} عمود`,
    mapTitle: "طابق أعمدتك",
    mapBody: "حدّد العمود الذي يحمل كل حقل. طابقنا ما استطعنا.",
    fieldCol: "الحقل",
    sourceCol: "العمود في ملفك",
    example: "مثال",
    skip: "لا تستورد",
    required: "مطلوب",
    unmappedRequired: (names: string) => `طابق الحقول المطلوبة أولًا: ${names}.`,
    reviewTitle: "راجع قبل الاستيراد",
    ready: "جاهز",
    problems: "يحتاج إصلاحًا",
    duplicates: "مكرر",
    total: "الإجمالي",
    skipInvalid: "تخطَّ الصفوف التي بها مشكلات",
    skipInvalidHint: "تُستبعد الصفوف التي بها مشكلات. أصلحها في الملف لإدخالها.",
    line: "السطر",
    unresolved: "الصفوف التي بها مشكلات",
    showing: (n: number, total: number) => `عرض أول ${n} من ${total} صف`,
    issue: { required: "ناقص", email: "ليس بريدًا", phone: "ليس رقم هاتف", number: "ليس رقمًا", date: "ليس تاريخًا", url: "ليس رابطًا", duplicate: "مكرر" } satisfies Record<IssueCode, string>,
    importN: (n: number) => (n === 1 ? "استيراد صف واحد" : n === 2 ? "استيراد صفين" : n <= 10 ? `استيراد ${n} صفوف` : `استيراد ${n} صفًا`),
    nothing: "لا شيء للاستيراد",
    nothingBody: "كل الصفوف بها مشكلات. أصلح الملف وارفعه من جديد.",
    back: "رجوع",
    next: "التالي",
    importing: "جارٍ الاستيراد",
    done: "اكتمل الاستيراد",
    imported: (n: number) => (n === 1 ? "استُورد صف واحد" : n === 2 ? "استُورد صفان" : n <= 10 ? `استُوردت ${n} صفوف` : `استُورد ${n} صفًا`),
    skipped: (n: number) => (n === 1 ? "تُخطي صف واحد" : n === 2 ? "تُخطي صفان" : n <= 10 ? `تُخطيت ${n} صفوف` : `تُخطي ${n} صفًا`),
    failedRows: "صفوف رفضها الخادم",
    finish: "تم",
    another: "استيراد ملف آخر",
    retry: "حاول مرة أخرى",
    failed: "لم يكتمل الاستيراد. لم يضِع شيء؛ حاول مرة أخرى.",
    filePreview: "معاينة صفوفك",
  },
};
export const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];
