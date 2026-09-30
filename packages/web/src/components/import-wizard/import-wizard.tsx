"use client";

import { ArrowLeft, ArrowRight, CircleCheck, Download, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card } from "../card";
import { Checkbox } from "../checkbox";
import { Dropzone, formatFileSize } from "../file-upload";
import { Field, FieldLabel, Textarea } from "../field";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Stepper, StepperItem } from "../stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import {
  buildRows,
  type ColumnMapping,
  guessMapping,
  type ImportField,
  type IssueCode,
  type ParsedCsv,
  type ParsedRow,
  parseCsv,
  summarize,
  unmappedRequired,
} from "./import-wizard-csv";

export {
  buildRows,
  checkType,
  type ColumnMapping,
  detectDelimiter,
  guessMapping,
  type ImportField,
  type ImportFieldType,
  type IssueCode,
  type ParsedCsv,
  type ParsedRow,
  parseCsv,
  type RowIssue,
  summarize,
  unmappedRequired,
} from "./import-wizard-csv";

const STRINGS = {
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
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type ImportWizardLabels = Partial<typeof STRINGS.en>;

export interface ImportResult {
  imported: number;
  /** Rows the server refused, by source line. */
  failed?: { line: number; message: string }[];
  error?: string;
}

export interface ImportWizardProps extends Omit<ComponentProps<"div">, "onError"> {
  /** What each imported row can hold. Required fields must be mapped and filled. */
  fields: ImportField[];
  /** Runs the import for the valid rows (keyed by field key). Return counts, or `{ error }` to show a failure. */
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult | void>;
  /** Field key that must be unique (an email, a code). Repeats are flagged and skipped. */
  uniqueKey?: string;
  /** Most rows per import. Default 5000. */
  maxRows?: number;
  /** Largest file in bytes. Default 5 MB. */
  maxSize?: number;
  /** Called from the last step's Done button. */
  onDone?: () => void;
  labels?: ImportWizardLabels;
}

const PREVIEW_ROWS = 25;
const SKIP = "__skip__";

function templateCsv(fields: readonly ImportField[]) {
  return `﻿${fields.map((f) => `"${f.label.replace(/"/g, '""')}"`).join(",")}\n`;
}

/**
 * A four step import: choose a CSV (or paste rows), match its columns to your fields, review the rows with
 * problems marked, then import. Excel users save as CSV first; no spreadsheet library is needed. It has no
 * backend: `onImport` receives the valid rows and returns the outcome.
 */
export function ImportWizard({ fields, onImport, uniqueKey, maxRows = 5000, maxSize = 5 * 1024 * 1024, onDone, labels, className, ...props }: ImportWizardProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels } as ReturnType<typeof strings>;
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<{ name: string; size?: number; csv: ParsedCsv } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [paste, setPaste] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const rows = useMemo(() => (source ? buildRows(source.csv.rows, mapping, fields, { uniqueKey }) : []), [source, mapping, fields, uniqueKey]);
  const summary = summarize(rows);
  const missing = unmappedRequired(mapping, fields);
  const toImport = skipInvalid ? rows.filter((r) => r.issues.length === 0) : rows;
  const problemRows = rows.filter((r) => r.issues.length > 0);
  const fieldLabel = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  const load = (name: string, text: string, size?: number) => {
    const csv = parseCsv(text);
    if (csv.headers.length === 0 || csv.rows.length === 0) {
      setUploadError(t.empty);
      return;
    }
    if (csv.rows.length > maxRows) {
      setUploadError(t.tooMany(maxRows));
      return;
    }
    setUploadError(null);
    setSource({ name, size, csv });
    setMapping(guessMapping(csv.headers, fields));
    setStep(1);
  };

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      load(file.name, await file.text(), file.size);
    } catch {
      setUploadError(t.readFailed);
    }
  };

  const runImport = async () => {
    setBusy(true);
    setRunError(null);
    setStep(3);
    try {
      const r = await onImport(toImport.map((row) => row.values));
      if (r && r.error) setRunError(r.error);
      else setResult(r ?? { imported: toImport.length });
    } catch {
      setRunError(t.failed);
    }
    setBusy(false);
  };

  const reset = () => {
    setStep(0);
    setSource(null);
    setMapping({});
    setPaste("");
    setResult(null);
    setRunError(null);
    setUploadError(null);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv(fields)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const NextIcon = ArrowRight;
  const BackIcon = ArrowLeft;

  return (
    <div data-slot="import-wizard" data-step={step} className={cn("flex flex-col gap-6", className)} {...props}>
      <Stepper current={step} aria-label={t.steps.join(", ")} className="max-sm:[&_li:not([data-status=current])_[data-slot=stepper-text]]:sr-only">
        {t.steps.map((s) => (
          <StepperItem key={s} title={s} />
        ))}
      </Stepper>

      {step === 0 ? (
        <Card className="gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3 text-foreground">{t.uploadTitle}</h2>
            <p className="text-body-sm text-muted-foreground">{t.uploadHint}</p>
          </div>
          <Dropzone
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            maxSize={maxSize}
            multiple={false}
            invalid={uploadError !== null}
            onFiles={(f) => void onFiles(f)}
            onReject={(rej) => {
              if (rej.length > 0) setUploadError(rej[0]?.code === "too-large" ? t.fileTooBig : t.wrongType);
            }}
            inputProps={{ "aria-label": t.uploadTitle }}
          >
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet aria-hidden className="size-4" />
              {t.dropPrompt}
            </span>
          </Dropzone>
          {uploadError ? <Alert tone="danger">{uploadError}</Alert> : null}
          <Field>
            <FieldLabel>{t.orPaste}</FieldLabel>
            <Textarea dir="ltr" className="text-start font-mono text-caption" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t.pastePlaceholder} />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download aria-hidden />
              {t.template}
            </Button>
            <Button variant="primary" disabled={paste.trim() === ""} onClick={() => load("pasted.csv", paste)}>
              {t.usePasted}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 && source ? (
        <Card className="gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-h3 text-foreground">{t.mapTitle}</h2>
            <p className="text-body-sm text-muted-foreground">{t.mapBody}</p>
            <p dir="auto" className="text-caption text-muted-foreground">
              {t.loaded(source.name, source.csv.rows.length, source.csv.headers.length)}
              {source.size ? ` · ${formatFileSize(source.size, locale)}` : ""}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-border rounded-control border border-border">
            {fields.map((f) => {
              const col = mapping[f.key] ?? null;
              const items = [{ value: SKIP, label: t.skip }, ...source.csv.headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` }))];
              const sample = col !== null ? (source.csv.rows[0]?.[col] ?? "") : "";
              return (
                <div key={f.key} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_1fr_1fr]">
                  <div className="flex items-center gap-2 text-label text-foreground">
                    {f.label}
                    {f.required ? <Badge variant={col === null ? "danger" : "outline"}>{t.required}</Badge> : null}
                  </div>
                  <Select
                    items={items}
                    value={col === null ? SKIP : String(col)}
                    onValueChange={(v) => v && setMapping((m) => ({ ...m, [f.key]: v === SKIP ? null : Number(v) }))}
                  >
                    <SelectTrigger aria-label={`${f.label}: ${t.sourceCol}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="min-w-0 truncate text-caption text-muted-foreground" dir="auto">
                    {sample ? (
                      <>
                        {t.example}: <bdi className="text-foreground">{sample}</bdi>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {missing.length > 0 ? <Alert tone="warning">{t.unmappedRequired(missing.map((f) => f.label).join(", "))}</Alert> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <BackIcon aria-hidden className="rtl:-scale-x-100" />
              {t.back}
            </Button>
            <Button variant="primary" disabled={missing.length > 0} onClick={() => setStep(2)}>
              {t.next}
              <NextIcon aria-hidden className="rtl:-scale-x-100" />
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 && source ? (
        <Card className="gap-4 p-4 sm:p-6">
          <h2 className="text-h3 text-foreground">{t.reviewTitle}</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                [t.total, summary.total, "text-foreground"],
                [t.ready, summary.valid, "text-nq-success-text"],
                [t.problems, summary.invalid, summary.invalid > 0 ? "text-nq-danger-text" : "text-foreground"],
                [t.duplicates, summary.duplicates, "text-foreground"],
              ] as const
            ).map(([label, n, tone]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-control border border-border p-3">
                <dt className="text-caption text-muted-foreground">{label}</dt>
                <dd className={cn("text-h3", tone)}>
                  <Num value={n} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2">
            <Table label={t.filePreview}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t.line}</TableHead>
                  {fields.map((f) => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <PreviewRow key={r.line} row={r} fields={fields} t={t} />
                ))}
              </TableBody>
            </Table>
            {rows.length > PREVIEW_ROWS ? <p className="text-caption text-muted-foreground">{t.showing(PREVIEW_ROWS, rows.length)}</p> : null}
          </div>

          {problemRows.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-label text-foreground">
                <TriangleAlert aria-hidden className="size-4 text-nq-warning-text" />
                {t.unresolved}
              </h3>
              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
                {problemRows.slice(0, 50).map((r) => (
                  <li key={r.line} className="flex flex-wrap items-center gap-x-2">
                    <span className="text-muted-foreground">
                      {t.line} <Num value={r.line} />
                    </span>
                    {r.issues.map((i) => (
                      <span key={`${i.field}-${i.code}`} className="text-nq-danger-text">
                        {fieldLabel(i.field)}: {t.issue[i.code]}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-2 text-body-sm text-foreground">
                <Checkbox className="mt-0.5" checked={skipInvalid} onCheckedChange={(v) => setSkipInvalid(v === true)} />
                <span className="flex flex-col">
                  {t.skipInvalid}
                  <span className="text-caption text-muted-foreground">{t.skipInvalidHint}</span>
                </span>
              </label>
            </div>
          ) : null}

          {toImport.length === 0 ? <Alert tone="danger" title={t.nothing}>{t.nothingBody}</Alert> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <BackIcon aria-hidden className="rtl:-scale-x-100" />
              {t.back}
            </Button>
            <Button variant="primary" disabled={toImport.length === 0} onClick={() => void runImport()}>
              {t.importN(toImport.length)}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="gap-4 p-4 sm:p-6" aria-live="polite">
          {busy ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-h3 text-foreground">{t.importing}</h2>
              <Progress value={null} label={t.importing} />
            </div>
          ) : runError ? (
            <div className="flex flex-col gap-3">
              <Alert tone="danger" title={t.failed}>
                {runError}
              </Alert>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <BackIcon aria-hidden className="rtl:-scale-x-100" />
                  {t.back}
                </Button>
                <Button variant="primary" onClick={() => void runImport()}>
                  {t.retry}
                </Button>
              </div>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
                  <CircleCheck aria-hidden className="size-5" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-h3 text-foreground">{t.done}</h2>
                  <p className="text-body-sm text-muted-foreground">
                    {t.imported(result.imported)}
                    {summary.total - toImport.length > 0 ? ` · ${t.skipped(summary.total - toImport.length)}` : ""}
                  </p>
                </div>
              </div>
              {result.failed && result.failed.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <h3 className="text-label text-foreground">{t.failedRows}</h3>
                  <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-control border border-border p-2 text-body-sm">
                    {result.failed.map((f) => (
                      <li key={f.line} className="flex gap-2">
                        <span className="text-muted-foreground">
                          {t.line} <Num value={f.line} />
                        </span>
                        <span className="text-nq-danger-text">{f.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={onDone}>
                  {t.finish}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {t.another}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function PreviewRow({ row, fields, t }: { row: ParsedRow; fields: readonly ImportField[]; t: ReturnType<typeof strings> }) {
  const bad = row.issues.length > 0;
  return (
    <TableRow data-invalid={bad || undefined} className={cn(bad && "bg-nq-danger-soft/40")}>
      <TableCell className="text-muted-foreground">
        <Num value={row.line} />
      </TableCell>
      {fields.map((f) => {
        const issue = row.issues.find((i) => i.field === f.key);
        return (
          <TableCell key={f.key} className={cn(issue && "text-nq-danger-text")}>
            <bdi>{row.values[f.key] || (issue ? "" : "—")}</bdi>
            {issue ? <span className="ms-1 text-caption">({t.issue[issue.code]})</span> : null}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
