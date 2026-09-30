"use client";

import { CircleCheck, Download, FileJson, FileSpreadsheet, FileText, type LucideIcon, Table2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button, type ButtonProps } from "../button";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { formatNumber } from "../numeric";
import { Progress } from "../progress";
import { Radio, RadioCard, RadioGroup } from "../radio-group";
import { buildExportFile, EXPORT_MIME, type ExportColumnSpec, type ExportFileFormat } from "./export-formats";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    export: "Export",
    title: "Export data",
    description: "Choose a format, the rows and the columns to include.",
    format: "Format",
    scope: "Rows",
    columns: "Columns",
    selectAllColumns: "All columns",
    csv: "CSV",
    csvHint: "Plain text, opens anywhere",
    xlsx: "Excel",
    xlsxHint: "A .xlsx workbook",
    json: "JSON",
    jsonHint: "Records for developers",
    pdf: "PDF",
    pdfHint: "A formatted document",
    selected: "Selected rows",
    filtered: "Current filter",
    all: "All rows",
    rowCount: (n: string) => `${n} rows`,
    rowCountOne: "1 row",
    cancel: "Cancel",
    close: "Close",
    done: "Done",
    run: "Export",
    preparing: "Preparing the file…",
    loadingRows: "Loading rows…",
    building: (pct: string) => `Building the file… ${pct}`,
    ready: (name: string) => `${name} is ready`,
    downloadAgain: "Download again",
    failed: "The export failed",
    retry: "Try again",
    noColumns: "Choose at least one column.",
    noRows: "There are no rows to export.",
    menuMore: "Export options…",
    menuLabel: "Export data",
    cancelled: "Export cancelled",
  },
  ar: {
    export: "تصدير",
    title: "تصدير البيانات",
    description: "اختر الصيغة والصفوف والأعمدة المراد تضمينها.",
    format: "الصيغة",
    scope: "الصفوف",
    columns: "الأعمدة",
    selectAllColumns: "كل الأعمدة",
    csv: "CSV",
    csvHint: "نص عادي يُفتح في أي مكان",
    xlsx: "Excel",
    xlsxHint: "مصنّف بصيغة xlsx",
    json: "JSON",
    jsonHint: "سجلات للمطوّرين",
    pdf: "PDF",
    pdfHint: "مستند منسّق",
    selected: "الصفوف المحددة",
    filtered: "نتيجة التصفية الحالية",
    all: "كل الصفوف",
    rowCount: (n: string) => `${n} صف`,
    rowCountOne: "صف واحد",
    cancel: "إلغاء",
    close: "إغلاق",
    done: "تم",
    run: "تصدير",
    preparing: "جارٍ تجهيز الملف…",
    loadingRows: "جارٍ تحميل الصفوف…",
    building: (pct: string) => `جارٍ إنشاء الملف… ${pct}`,
    ready: (name: string) => `الملف ${name} جاهز`,
    downloadAgain: "تنزيل مرة أخرى",
    failed: "تعذّر التصدير",
    retry: "إعادة المحاولة",
    noColumns: "اختر عمودًا واحدًا على الأقل.",
    noRows: "لا توجد صفوف للتصدير.",
    menuMore: "خيارات التصدير…",
    menuLabel: "تصدير البيانات",
    cancelled: "أُلغي التصدير",
  },
};
export type ExportActionLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export type ExportFormat = ExportFileFormat | "pdf";
export type ExportScope = "selected" | "filtered" | "all";
export type ExportColumn<T> = ExportColumnSpec<T>;

/** Rows for one scope: an array, or a count plus a loader (for rows that live on the server). */
export type ExportScopeSource<T> = readonly T[] | { count: number; load: () => readonly T[] | Promise<readonly T[]> };

export interface ExportRequest<T> {
  format: ExportFormat;
  scope: ExportScope;
  columns: ExportColumn<T>[];
  rows: readonly T[];
  /** The file name with its extension. */
  filename: string;
}

export interface ExportFile<T> {
  blob: Blob;
  filename: string;
  request: ExportRequest<T>;
}

export interface ExportActionProps<T> {
  /** The columns that can be exported. All are ticked at first. */
  columns: ExportColumn<T>[];
  /** Rows per scope. A scope with no rows (or that is left out) is disabled. */
  scopes: Partial<Record<ExportScope, ExportScopeSource<T>>>;
  /** Default `["csv", "xlsx", "json"]`. `"pdf"` needs `onExportPdf`. */
  formats?: ExportFormat[];
  defaultFormat?: ExportFormat;
  defaultScope?: ExportScope;
  /** The file name without extension. Default "export". */
  filename?: string;
  /** Sheet name for XLSX. Default the file name. */
  sheetName?: string;
  /**
   * Builds the PDF (a server call, or a print layout). Its presence adds the PDF format. Return the file as a
   * Blob and it is downloaded; return nothing if the callback already delivered it. Report progress with `onProgress(0..1)`.
   */
  onExportPdf?: (request: ExportRequest<T>, control: { signal: AbortSignal; onProgress: (fraction: number) => void }) => Promise<Blob | void>;
  /** Replaces the browser download (save through a native dialog, upload to storage). */
  onDownload?: (file: ExportFile<T>) => void | Promise<void>;
  /** Called after the file was built and handed over. */
  onComplete?: (file: ExportFile<T>) => void;
  /** `"dialog"` (default): a button that opens the options dialog. `"menu"`: a menu of formats that export straight away, plus "Export options…". */
  mode?: "dialog" | "menu";
  /** The trigger's text. Default "Export". */
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  className?: string;
  labels?: Partial<ExportActionLabels>;
}

/* ------------------------------------------------------------------ helpers */

const FORMAT_ICON: Record<ExportFormat, LucideIcon> = { csv: Table2, xlsx: FileSpreadsheet, json: FileJson, pdf: FileText };
const SCOPES: ExportScope[] = ["selected", "filtered", "all"];

const sourceCount = <T,>(source: ExportScopeSource<T> | undefined) => (source == null ? 0 : "count" in source ? source.count : source.length);

/** Saves a Blob through a temporary link. */
export function saveExportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type Phase = { name: "idle" } | { name: "running"; stage: "loading" | "building"; progress: number | null } | { name: "done"; file: ExportFile<unknown> } | { name: "error"; message: string };

function useStrings(labels?: Partial<ExportActionLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

/* ------------------------------------------------------------------ dialog */

export interface ExportDialogProps<T> extends Omit<ExportActionProps<T>, "mode" | "children" | "variant" | "size" | "className" | "disabled"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Start exporting as soon as the dialog opens, with these choices (used by the menu mode). */
  autoStart?: { format: ExportFormat; scope?: ExportScope } | null;
  onAutoStarted?: () => void;
}

/**
 * The options dialog: format, rows, columns, a progress state while the file is built, and the result with a
 * "Download again" button. Use `ExportButton` unless you open it from your own control.
 */
export function ExportDialog<T>({
  open,
  onOpenChange,
  columns,
  scopes,
  formats: formatsProp,
  defaultFormat,
  defaultScope,
  filename = "export",
  sheetName,
  onExportPdf,
  onDownload,
  onComplete,
  labels,
  autoStart,
  onAutoStarted,
}: ExportDialogProps<T>) {
  const { locale, t } = useStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  const formats = useMemo(() => (formatsProp ?? (["csv", "xlsx", "json"] as ExportFormat[])).filter((f) => f !== "pdf" || onExportPdf), [formatsProp, onExportPdf]);
  const firstScope = (): ExportScope => defaultScope && sourceCount(scopes[defaultScope]) > 0 ? defaultScope : (SCOPES.find((s) => sourceCount(scopes[s]) > 0) ?? "all");

  const [format, setFormat] = useState<ExportFormat>(defaultFormat && formats.includes(defaultFormat) ? defaultFormat : (formats[0] ?? "csv"));
  const [scope, setScope] = useState<ExportScope>(firstScope);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(columns.map((c) => c.id)));
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const abort = useRef<AbortController | null>(null);

  // A new column set (or a reopened dialog) starts from a clean slate.
  const columnKey = columns.map((c) => c.id).join("|");
  useEffect(() => setChosen(new Set(columns.map((c) => c.id))), [columnKey]); // eslint-disable-line
  useEffect(() => {
    if (!open) {
      abort.current?.abort();
      setPhase({ name: "idle" });
    } else setScope(firstScope());
  }, [open]); // eslint-disable-line

  const run = useCallback(
    async (overrides?: { format?: ExportFormat; scope?: ExportScope }) => {
      const fmt = overrides?.format ?? format;
      const scp = overrides?.scope ?? scope;
      const cols = columns.filter((c) => (overrides ? true : chosen.has(c.id)));
      const source = scopes[scp];
      if (!source || !cols.length) return;
      const controller = new AbortController();
      abort.current = controller;
      const baseName = filename.replace(/\.[a-z0-9]+$/i, "");
      try {
        setPhase({ name: "running", stage: "loading", progress: null });
        const rows = "count" in (source as object) ? await (source as { load: () => readonly T[] | Promise<readonly T[]> }).load() : (source as readonly T[]);
        if (controller.signal.aborted) return;
        const request: ExportRequest<T> = { format: fmt, scope: scp, columns: cols, rows, filename: `${baseName}.${fmt}` };
        setPhase({ name: "running", stage: "building", progress: 0 });
        const onProgress = (progress: number) => setPhase({ name: "running", stage: "building", progress });
        let blob: Blob | void;
        if (fmt === "pdf") {
          if (!onExportPdf) return;
          blob = await onExportPdf(request, { signal: controller.signal, onProgress });
        } else {
          const bytes = await buildExportFile({
            format: fmt,
            columns: cols,
            rows,
            sheetName: sheetName ?? baseName,
            rtl: locale.startsWith("ar"),
            onProgress,
            signal: controller.signal,
          });
          blob = new Blob([bytes as BlobPart], { type: EXPORT_MIME[fmt] });
        }
        if (controller.signal.aborted) return;
        const file: ExportFile<T> = { blob: blob ?? new Blob([]), filename: request.filename, request };
        if (blob) {
          if (onDownload) await onDownload(file);
          else saveExportBlob(blob, file.filename);
        }
        setPhase({ name: "done", file: file as ExportFile<unknown> });
        onComplete?.(file);
      } catch (error) {
        if (controller.signal.aborted || (error as Error)?.name === "AbortError") return;
        setPhase({ name: "error", message: (error as Error)?.message || t.failed });
      }
    },
    [format, scope, columns, chosen, scopes, filename, sheetName, onExportPdf, onDownload, onComplete, locale, t.failed],
  );

  // The menu mode opens the dialog already exporting.
  useEffect(() => {
    if (open && autoStart) {
      setFormat(autoStart.format);
      if (autoStart.scope) setScope(autoStart.scope);
      onAutoStarted?.();
      void run({ format: autoStart.format, scope: autoStart.scope ?? firstScope() });
    }
  }, [open, autoStart]); // eslint-disable-line

  const cancel = () => {
    abort.current?.abort();
    setPhase({ name: "idle" });
  };

  const busy = phase.name === "running";
  const noRows = SCOPES.every((s) => sourceCount(scopes[s]) === 0);
  const columnsPicked = chosen.size;
  const allPicked = columnsPicked === columns.length;
  const formatLabel = (f: ExportFormat) => t[f];
  const formatHint = (f: ExportFormat) => t[`${f}Hint` as "csvHint"];
  const countText = (c: number) => (c === 1 ? t.rowCountOne : t.rowCount(n(c)));

  return (
    <Dialog open={open} onOpenChange={(next) => (busy && !next ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-xl grid-cols-[minmax(0,1fr)]" data-slot="export-dialog">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {phase.name === "idle" || phase.name === "error" ? (
          <div className="flex flex-col gap-5">
            {phase.name === "error" ? (
              <Alert tone="danger" title={t.failed}>
                {phase.message}
              </Alert>
            ) : null}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-label text-foreground">{t.format}</legend>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)} className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t.format}>
                {formats.map((f) => {
                  const Icon = FORMAT_ICON[f];
                  return <RadioCard key={f} value={f} title={<span className="inline-flex items-center gap-2"><Icon aria-hidden className="size-4 text-muted-foreground" />{formatLabel(f)}</span>} description={formatHint(f)} className="p-3" />;
                })}
              </RadioGroup>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-label text-foreground">{t.scope}</legend>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as ExportScope)} aria-label={t.scope}>
                {SCOPES.map((s) => {
                  const count = sourceCount(scopes[s]);
                  if (scopes[s] === undefined) return null;
                  return (
                    <label key={s} className={cn("flex items-center gap-2.5 text-body", count === 0 && "opacity-50")}>
                      <Radio value={s} disabled={count === 0} />
                      <span className="flex-1">{t[s]}</span>
                      <span className="text-body-sm tabular-nums text-muted-foreground">{countText(count)}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 flex w-full items-center justify-between text-label text-foreground">
                {t.columns}
                <span className="text-caption font-normal tabular-nums text-muted-foreground">
                  {n(columnsPicked)} / {n(columns.length)}
                </span>
              </legend>
              <label className="flex items-center gap-2.5 border-b border-border pb-2 text-body">
                <Checkbox
                  checked={allPicked}
                  indeterminate={columnsPicked > 0 && !allPicked}
                  onCheckedChange={(v) => setChosen(v ? new Set(columns.map((c) => c.id)) : new Set())}
                />
                {t.selectAllColumns}
              </label>
              <div className="grid max-h-40 grid-cols-1 gap-x-4 gap-y-2 overflow-y-auto py-1 sm:grid-cols-2">
                {columns.map((c) => (
                  <label key={c.id} className="flex min-w-0 items-center gap-2.5 text-body">
                    <Checkbox
                      checked={chosen.has(c.id)}
                      onCheckedChange={() =>
                        setChosen((prev) => {
                          const next = new Set(prev);
                          if (!next.delete(c.id)) next.add(c.id);
                          return next;
                        })
                      }
                    />
                    <span className="truncate">{c.label}</span>
                  </label>
                ))}
              </div>
              {columnsPicked === 0 ? <p className="text-body-sm text-nq-danger-text">{t.noColumns}</p> : null}
            </fieldset>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
              <Button variant="primary" disabled={columnsPicked === 0 || sourceCount(scopes[scope]) === 0} onClick={() => run()}>
                <Download aria-hidden />
                {phase.name === "error" ? t.retry : t.run}
              </Button>
            </DialogFooter>
            {noRows ? <p className="text-body-sm text-muted-foreground">{t.noRows}</p> : null}
          </div>
        ) : null}

        {phase.name === "running" ? (
          <div className="flex flex-col gap-4 py-2" data-slot="export-progress">
            <Progress
              value={phase.progress == null ? null : Math.round(phase.progress * 100)}
              aria-label={t.preparing}
              label={phase.stage === "loading" ? t.loadingRows : t.building(n(Math.round((phase.progress ?? 0) * 100)) + "%")}
              showValue={false}
              tone="info"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={cancel}>
                {t.cancel}
              </Button>
            </DialogFooter>
          </div>
        ) : null}

        {phase.name === "done" ? (
          <div className="flex flex-col gap-4 py-2" data-slot="export-done">
            <p role="status" className="flex items-center gap-2 text-body text-foreground">
              <CircleCheck aria-hidden className="size-5 shrink-0 text-nq-success-text" />
              <bdi dir="ltr" className="sr-only">{phase.file.filename}</bdi>
              <span>
                {t.ready("")}
                {/* The file name stays left-to-right inside an Arabic sentence. */}
                <bdi dir="ltr" className="font-medium">
                  {phase.file.filename}
                </bdi>
              </span>
            </p>
            <DialogFooter>
              {phase.file.blob.size > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => (onDownload ? onDownload(phase.file as ExportFile<T>) : saveExportBlob(phase.file.blob, phase.file.filename))}
                >
                  <Download aria-hidden />
                  {t.downloadAgain}
                </Button>
              ) : null}
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                {t.done}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ button */

/**
 * The export action. A button that opens the options dialog (format, rows, columns, progress), or with
 * `mode="menu"` a menu of formats that export at once with every column and the first available scope.
 */
export function ExportButton<T>({ mode = "dialog", children, variant = "secondary", size = "sm", disabled, className, ...props }: ExportActionProps<T>) {
  const { t } = useStrings(props.labels);
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState<ExportDialogProps<T>["autoStart"]>(null);
  const formats = (props.formats ?? (["csv", "xlsx", "json"] as ExportFormat[])).filter((f) => f !== "pdf" || props.onExportPdf);
  const nothing = SCOPES.every((s) => sourceCount(props.scopes[s]) === 0);

  const trigger = (
    <Button variant={variant} size={size} disabled={disabled || nothing} className={className} data-slot="export-button">
      <Download aria-hidden />
      {children ?? t.export}
    </Button>
  );

  return (
    <>
      {mode === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={trigger} />
          <DropdownMenuContent align="end" className="min-w-48" aria-label={t.menuLabel}>
            {formats.map((f) => {
              const Icon = FORMAT_ICON[f];
              return (
                <DropdownMenuItem
                  key={f}
                  onClick={() => {
                    setAuto({ format: f });
                    setOpen(true);
                  }}
                >
                  <Icon aria-hidden />
                  {t[f]}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpen(true)}>{t.menuMore}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant={variant} size={size} disabled={disabled || nothing} className={className} data-slot="export-button" onClick={() => setOpen(true)}>
          <Download aria-hidden />
          {children ?? t.export}
        </Button>
      )}
      <ExportDialog<T> {...props} open={open} onOpenChange={setOpen} autoStart={auto} onAutoStarted={() => setAuto(null)} />
    </>
  );
}
