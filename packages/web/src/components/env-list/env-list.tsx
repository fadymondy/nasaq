"use client";

import { Download, Eye, EyeOff, FileUp, Lock, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { CopyButton } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Switch } from "../switch";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "../tabs";
import {
  checkEnvKey,
  conflictingKeys,
  type EnvKeyProblem,
  type EnvParseIssue,
  type EnvVariable,
  looksPublic,
  MASK,
  parseEnv,
  serializeEnv,
} from "./env-list-format";

export {
  checkEnvKey,
  conflictingKeys,
  ENV_KEY,
  type EnvKeyProblem,
  type EnvParseIssue,
  type EnvParseResult,
  type EnvVariable,
  isValidEnvKey,
  looksPublic,
  MASK,
  parseEnv,
  quoteEnvValue,
  serializeEnv,
} from "./env-list-format";

const STRINGS = {
  en: {
    title: "Environment variables",
    description: "Values are hidden until you reveal them.",
    list: "Variables",
    search: "Filter variables",
    environment: "Environment",
    add: "Add variable",
    import: "Import .env",
    exportAll: "Download .env",
    copyAll: "Copy as .env",
    reveal: (key: string) => `Reveal ${key}`,
    hide: (key: string) => `Hide ${key}`,
    copyValue: (key: string) => `Copy value of ${key}`,
    edit: (key: string) => `Edit ${key}`,
    remove: (key: string) => `Delete ${key}`,
    secret: "Secret",
    plain: "Plain",
    hidden: "Value hidden",
    emptyValue: "(empty)",
    emptyTitle: "No variables yet",
    emptyBody: "Add one by hand or paste the contents of a .env file.",
    noMatch: "No variables match your filter.",
    count: (n: number) => (n === 1 ? "1 variable" : `${n} variables`),
    // add / edit
    addTitle: "Add variable",
    editTitle: (key: string) => `Edit ${key}`,
    keyLabel: "Name",
    keyHint: "Letters, digits and underscores. Cannot start with a digit.",
    keyEmpty: "Enter a name.",
    keyInvalid: "Use only letters, digits and underscores, and do not start with a digit.",
    keyDuplicate: "A variable with this name already exists.",
    valueLabel: "Value",
    showValue: "Show value",
    descriptionLabel: "Note (optional)",
    secretLabel: "Secret",
    secretHint: "Mask the value in the list until someone reveals it.",
    save: "Save",
    cancel: "Cancel",
    genericError: "Something went wrong. Try again.",
    // import
    importTitle: "Import from .env",
    importBody: "Paste the contents of a .env file or choose one. Nothing is sent until you import.",
    importLabel: ".env contents",
    importPlaceholder: "API_URL=https://api.example.com\nDATABASE_URL=postgres://...",
    chooseFile: "Choose file",
    found: (n: number) => (n === 1 ? "1 variable found" : `${n} variables found`),
    conflicts: (n: number) => (n === 1 ? "1 already exists" : `${n} already exist`),
    overwrite: "Overwrite existing values",
    skipNote: "Existing variables are skipped unless you overwrite them.",
    pasteDuplicates: (keys: string) => `Repeated in the paste, last value wins: ${keys}`,
    issuesTitle: "Lines that could not be read",
    issue: (i: EnvParseIssue) =>
      i.problem === "invalid-key"
        ? `Line ${i.line}: "${i.key}" is not a valid name`
        : i.problem === "unterminated-quote"
          ? `Line ${i.line}: quote is never closed${i.key ? ` (${i.key})` : ""}`
          : `Line ${i.line}: expected NAME=value`,
    importButton: (n: number) => (n === 1 ? "Import 1 variable" : `Import ${n} variables`),
    // delete
    deleteTitle: (key: string) => `Delete ${key}?`,
    deleteBody: "This removes the variable from this environment. Running deployments keep their current value until they restart.",
    deleteConfirm: "Delete",
    copied: "Copied to clipboard",
  },
  ar: {
    title: "متغيرات البيئة",
    description: "القيم مخفية إلى أن تكشفها.",
    list: "المتغيرات",
    search: "تصفية المتغيرات",
    environment: "البيئة",
    add: "إضافة متغير",
    import: "استيراد .env",
    exportAll: "تنزيل .env",
    copyAll: "نسخ بصيغة .env",
    reveal: (key: string) => `كشف ${key}`,
    hide: (key: string) => `إخفاء ${key}`,
    copyValue: (key: string) => `نسخ قيمة ${key}`,
    edit: (key: string) => `تعديل ${key}`,
    remove: (key: string) => `حذف ${key}`,
    secret: "سرّي",
    plain: "عادي",
    hidden: "القيمة مخفية",
    emptyValue: "(فارغ)",
    emptyTitle: "لا توجد متغيرات بعد",
    emptyBody: "أضف متغيرًا يدويًا أو الصق محتوى ملف .env.",
    noMatch: "لا توجد متغيرات تطابق التصفية.",
    count: (n: number) => (n === 1 ? "متغير واحد" : `${n} متغيرات`),
    addTitle: "إضافة متغير",
    editTitle: (key: string) => `تعديل ${key}`,
    keyLabel: "الاسم",
    keyHint: "أحرف لاتينية وأرقام وشرطات سفلية. لا يبدأ برقم.",
    keyEmpty: "أدخل اسمًا.",
    keyInvalid: "استخدم أحرفًا لاتينية وأرقامًا وشرطات سفلية فقط، ولا تبدأ برقم.",
    keyDuplicate: "يوجد متغير بهذا الاسم بالفعل.",
    valueLabel: "القيمة",
    showValue: "إظهار القيمة",
    descriptionLabel: "ملاحظة (اختياري)",
    secretLabel: "سرّي",
    secretHint: "أخفِ القيمة في القائمة إلى أن يكشفها أحد.",
    save: "حفظ",
    cancel: "إلغاء",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    importTitle: "الاستيراد من ملف .env",
    importBody: "الصق محتوى ملف .env أو اختر ملفًا. لا يُرسل شيء قبل أن تستورد.",
    importLabel: "محتوى ملف .env",
    importPlaceholder: "API_URL=https://api.example.com\nDATABASE_URL=postgres://...",
    chooseFile: "اختيار ملف",
    found: (n: number) => (n === 1 ? "تم العثور على متغير واحد" : `تم العثور على ${n} متغيرات`),
    conflicts: (n: number) => (n === 1 ? "واحد موجود بالفعل" : `${n} موجودة بالفعل`),
    overwrite: "استبدال القيم الموجودة",
    skipNote: "تُتخطى المتغيرات الموجودة ما لم تستبدلها.",
    pasteDuplicates: (keys: string) => `مكررة في النص الملصوق، تُعتمد القيمة الأخيرة: ${keys}`,
    issuesTitle: "أسطر تعذّرت قراءتها",
    issue: (i: EnvParseIssue) =>
      i.problem === "invalid-key"
        ? `السطر ${i.line}: "${i.key}" ليس اسمًا صالحًا`
        : i.problem === "unterminated-quote"
          ? `السطر ${i.line}: علامة الاقتباس غير مغلقة${i.key ? ` (${i.key})` : ""}`
          : `السطر ${i.line}: المتوقع NAME=value`,
    importButton: (n: number) => (n === 1 ? "استيراد متغير واحد" : `استيراد ${n} متغيرات`),
    deleteTitle: (key: string) => `حذف ${key}؟`,
    deleteBody: "يُزال المتغير من هذه البيئة. تحتفظ عمليات النشر الجارية بقيمتها الحالية حتى تُعاد تشغيلها.",
    deleteConfirm: "حذف",
    copied: "تم النسخ إلى الحافظة",
  },
};

export type EnvListLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<EnvListLabels>): EnvListLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

/** What a callback returns: nothing on success, or a message to show. */
export type EnvResult = void | { error?: string };

export interface EnvEnvironment {
  id: string;
  label: string;
}

export interface EnvImportOptions {
  /** Replace the value of keys that already exist. */
  overwrite: boolean;
}

export interface EnvListProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  /** The variables of the current environment. */
  variables: readonly EnvVariable[];
  title?: ReactNode;
  description?: ReactNode;
  /** Tabs for Development, Preview, Production... Load the matching `variables` when it changes. */
  environments?: readonly EnvEnvironment[];
  environment?: string;
  onEnvironmentChange?: (id: string) => void;
  /** Add (`previousKey` undefined) or edit a variable. Resolve with `{ error }` to keep the dialog open with a message. */
  onSave?: (variable: EnvVariable, previousKey?: string) => Promise<EnvResult>;
  onDelete?: (key: string) => Promise<EnvResult>;
  /** Import parsed variables. Imported values are marked secret unless the key is meant to be public (`NEXT_PUBLIC_*`, `VITE_*`). */
  onImport?: (variables: EnvVariable[], options: EnvImportOptions) => Promise<EnvResult>;
  /** Called by the download button with the current variables. Default: saves a `.env` file. */
  onExport?: (variables: readonly EnvVariable[]) => void;
  /** File name of the default download. Default ".env". */
  exportFilename?: string;
  /** Hide revealed values again after this many milliseconds. `0` keeps them shown. Default 30000. */
  revealTimeout?: number;
  /** No add, edit, delete or import; reveal and copy still work. */
  readOnly?: boolean;
  labels?: Partial<EnvListLabels>;
}

/**
 * A `.env` manager: key and value rows with masked values, reveal and copy, add and edit with duplicate and
 * invalid-name checks, delete with confirmation, import by pasting or choosing a file, export, and an
 * optional environment switcher. Values are only in the DOM while revealed, and nothing is logged.
 */
export function EnvList({
  variables,
  title,
  description,
  environments,
  environment,
  onEnvironmentChange,
  onSave,
  onDelete,
  onImport,
  onExport,
  exportFilename = ".env",
  revealTimeout = 30_000,
  readOnly = false,
  labels,
  className,
  ...props
}: EnvListProps) {
  const t = useLabels(labels);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<{ previous?: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const canEdit = !readOnly && Boolean(onSave);
  const canDelete = !readOnly && Boolean(onDelete);
  const canImport = !readOnly && Boolean(onImport);

  // Values go back to hidden after a while, and when the environment changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `revealed` is the trigger that restarts the timer
  useEffect(() => {
    if (revealed.size === 0 || revealTimeout <= 0) return;
    const id = setTimeout(() => setRevealed(new Set()), revealTimeout);
    return () => clearTimeout(id);
  }, [revealed, revealTimeout]);
  useEffect(() => setRevealed(new Set()), [environment]);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? variables.filter((v) => v.key.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)) : variables;
  }, [variables, filter]);
  const toggle = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const envText = () => serializeEnv(variables);
  const download = () => {
    if (onExport) return onExport(variables);
    const blob = new Blob([envText()], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = exportFilename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  };
  const editingVariable = editing?.previous ? variables.find((v) => v.key === editing.previous) : undefined;

  return (
    <section data-slot="env-list" aria-label={typeof title === "string" ? title : t.title} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h3 text-foreground">{title ?? t.title}</h3>
          <p className="text-body-sm text-muted-foreground">{description ?? t.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canImport ? (
            <Button type="button" size="sm" onClick={() => setImporting(true)}>
              <Upload aria-hidden />
              {t.import}
            </Button>
          ) : null}
          <CopyButton value={envText} variant="secondary" size="sm" label={t.copyAll} copiedLabel={t.copied} disabled={variables.length === 0}>
            {t.copyAll}
          </CopyButton>
          <Button type="button" size="sm" disabled={variables.length === 0} onClick={download}>
            <Download aria-hidden />
            {t.exportAll}
          </Button>
          {canEdit ? (
            <Button type="button" size="sm" variant="primary" onClick={() => setEditing({})}>
              <Plus aria-hidden />
              {t.add}
            </Button>
          ) : null}
        </div>
      </header>

      {environments && environments.length ? (
        <Tabs value={environment ?? environments[0]?.id} onValueChange={(v) => onEnvironmentChange?.(String(v))}>
          <TabsList aria-label={t.environment}>
            {environments.map((env) => (
              <TabsTab key={env.id} value={env.id}>
                {env.label}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
        </Tabs>
      ) : null}

      {variables.length > 5 ? (
        <InputGroup className="max-w-sm">
          <InputGroupAddon align="start">
            <Search aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput ltr type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.search} aria-label={t.search} />
        </InputGroup>
      ) : null}

      {variables.length === 0 ? (
        <EmptyState
          title={t.emptyTitle}
          description={t.emptyBody}
          actions={
            <>
              {canEdit ? (
                <Button type="button" variant="primary" onClick={() => setEditing({})}>
                  <Plus aria-hidden />
                  {t.add}
                </Button>
              ) : null}
              {canImport ? (
                <Button type="button" onClick={() => setImporting(true)}>
                  <FileUp aria-hidden />
                  {t.import}
                </Button>
              ) : null}
            </>
          }
        />
      ) : (
        <>
          <ul aria-label={t.list} className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
            {shown.map((v) => (
              <VariableRow
                key={v.key}
                variable={v}
                revealed={revealed.has(v.key)}
                onToggle={() => toggle(v.key)}
                onEdit={canEdit ? () => setEditing({ previous: v.key }) : undefined}
                onDelete={canDelete ? () => setDeleting(v.key) : undefined}
                t={t}
              />
            ))}
            {shown.length === 0 ? <li className="px-4 py-6 text-center text-body-sm text-muted-foreground">{t.noMatch}</li> : null}
          </ul>
          <p className="text-caption text-muted-foreground">{t.count(variables.length)}</p>
        </>
      )}

      {editing && onSave ? (
        <VariableDialog
          // A fresh dialog per target, so form state never leaks between variables.
          key={editing.previous ?? "new"}
          initial={editingVariable}
          existing={variables.filter((v) => v.key !== editing.previous).map((v) => v.key)}
          onSave={(variable) => onSave(variable, editing.previous)}
          onClose={() => setEditing(null)}
          t={t}
        />
      ) : null}
      {importing && onImport ? <ImportDialog current={variables} onImport={onImport} onClose={() => setImporting(false)} t={t} /> : null}
      {deleting && onDelete ? (
        <DeleteDialog
          name={deleting}
          onConfirm={async () => {
            const result = await onDelete(deleting);
            if (!result?.error) setRevealed((prev) => new Set([...prev].filter((k) => k !== deleting)));
            return result;
          }}
          onClose={() => setDeleting(null)}
          t={t}
        />
      ) : null}
    </section>
  );
}

function VariableRow({
  variable,
  revealed,
  onToggle,
  onEdit,
  onDelete,
  t,
}: {
  variable: EnvVariable;
  revealed: boolean;
  onToggle: () => void;
  onEdit: (() => void) | undefined;
  onDelete: (() => void) | undefined;
  t: EnvListLabels;
}) {
  const secret = variable.secret !== false;
  const visible = !secret || revealed;
  return (
    <li
      data-slot="env-row"
      data-secret={secret || undefined}
      data-revealed={revealed || undefined}
      className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-col gap-0.5 sm:w-2/5">
        <div className="flex min-w-0 items-center gap-2">
          <bdi dir="ltr" className="truncate font-mono text-code font-medium text-foreground">
            {variable.key}
          </bdi>
          {secret ? (
            <Badge variant="neutral" className="shrink-0">
              <Lock aria-hidden />
              {t.secret}
            </Badge>
          ) : null}
        </div>
        {variable.description ? <span className="truncate text-caption text-muted-foreground">{variable.description}</span> : null}
      </div>
      <div className="min-w-0 flex-1">
        {visible ? (
          <bdi dir="ltr" data-slot="env-value" className="block truncate font-mono text-code text-foreground" title={variable.value}>
            {variable.value === "" ? <span className="text-muted-foreground">{t.emptyValue}</span> : variable.value}
          </bdi>
        ) : (
          <span data-slot="env-value" dir="ltr" role="text" aria-label={t.hidden} className="block font-mono text-code text-muted-foreground">
            {MASK}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {secret ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={revealed ? t.hide(variable.key) : t.reveal(variable.key)}
            aria-pressed={revealed}
            onClick={onToggle}
          >
            {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        ) : null}
        <CopyButton value={() => variable.value} label={t.copyValue(variable.key)} copiedLabel={t.copied} />
        {onEdit ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.edit(variable.key)} onClick={onEdit}>
            <Pencil aria-hidden />
          </Button>
        ) : null}
        {onDelete ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.remove(variable.key)} onClick={onDelete} className="text-nq-danger-text">
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

const KEY_MESSAGE = (t: EnvListLabels, problem: EnvKeyProblem) => (problem === "empty" ? t.keyEmpty : problem === "invalid" ? t.keyInvalid : t.keyDuplicate);

function VariableDialog({
  initial,
  existing,
  onSave,
  onClose,
  t,
}: {
  initial?: EnvVariable | undefined;
  existing: string[];
  onSave: (variable: EnvVariable) => Promise<EnvResult>;
  onClose: () => void;
  t: EnvListLabels;
}) {
  const [key, setKey] = useState(initial?.key ?? "");
  const [value, setValue] = useState(initial?.value ?? "");
  const [note, setNote] = useState(initial?.description ?? "");
  const [secret, setSecret] = useState(initial ? initial.secret !== false : true);
  const [showValue, setShowValue] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const id = useId();
  const problem = checkEnvKey(key, existing);
  const showProblem = problem !== null && (touched || problem === "duplicate" || problem === "invalid");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (problem || pending) return;
    setPending(true);
    setError(null);
    try {
      const variable: EnvVariable = { key, value, secret, ...(note.trim() ? { description: note.trim() } : {}) };
      const result = await onSave(variable);
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{initial ? t.editTitle(initial.key) : t.addTitle}</DialogTitle>
            <DialogDescription>{t.keyHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={showProblem}>
            <FieldLabel>{t.keyLabel}</FieldLabel>
            <Input
              ltr
              name="key"
              value={key}
              onChange={(e) => setKey(e.target.value.trim())}
              onBlur={() => setTouched(true)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="DATABASE_URL"
              className="font-mono text-code"
              aria-invalid={showProblem || undefined}
              aria-describedby={showProblem ? `${id}-key-error` : undefined}
            />
            {showProblem && problem ? (
              <p id={`${id}-key-error`} role="alert" className="text-caption text-nq-danger-text">
                {KEY_MESSAGE(t, problem)}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>{t.valueLabel}</FieldLabel>
            <Textarea
              dir="ltr"
              name="value"
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={cn("min-h-20 font-mono text-code text-start", secret && !showValue && "[-webkit-text-security:disc]")}
            />
            {secret ? (
              <button
                type="button"
                onClick={() => setShowValue((s) => !s)}
                aria-pressed={showValue}
                className="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                {showValue ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
                {t.showValue}
              </button>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>{t.descriptionLabel}</FieldLabel>
            <Input name="description" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-control border border-border p-3">
            <div className="flex flex-col gap-0.5">
              <label htmlFor={`${id}-secret`} className="text-label text-foreground">
                {t.secretLabel}
              </label>
              <span className="text-caption text-muted-foreground">{t.secretHint}</span>
            </div>
            <Switch id={`${id}-secret`} checked={secret} onCheckedChange={setSecret} />
          </div>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending} disabled={problem !== null && touched}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  current,
  onImport,
  onClose,
  t,
}: {
  current: readonly EnvVariable[];
  onImport: NonNullable<EnvListProps["onImport"]>;
  onClose: () => void;
  t: EnvListLabels;
}) {
  const [text, setText] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const id = useId();
  const parsed = useMemo(() => parseEnv(text), [text]);
  const conflicts = useMemo(() => conflictingKeys(current, parsed.variables), [current, parsed.variables]);
  const importable = overwrite ? parsed.variables : parsed.variables.filter((v) => !conflicts.includes(v.key));

  const readFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (picked) setText(await picked.text());
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (importable.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await onImport(
        importable.map((v) => ({ key: v.key, value: v.value, secret: !looksPublic(v.key) })),
        { overwrite },
      );
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.importTitle}</DialogTitle>
            <DialogDescription>{t.importBody}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.importLabel}</FieldLabel>
            <Textarea
              dir="ltr"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.importPlaceholder}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-40 font-mono text-code text-start"
            />
          </Field>
          <div>
            <input ref={file} type="file" accept=".env,text/plain" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={readFile} />
            <Button type="button" size="sm" onClick={() => file.current?.click()}>
              <FileUp aria-hidden />
              {t.chooseFile}
            </Button>
          </div>
          {text.trim() ? (
            <div className="grid gap-2 text-body-sm" aria-live="polite">
              <p className="text-foreground">
                {t.found(parsed.variables.length)}
                {conflicts.length ? <span className="text-nq-warning-text"> · {t.conflicts(conflicts.length)}</span> : null}
              </p>
              {conflicts.length ? (
                <div className="flex items-center gap-2">
                  <Checkbox id={`${id}-overwrite`} checked={overwrite} onCheckedChange={(v) => setOverwrite(v === true)} />
                  <label htmlFor={`${id}-overwrite`} className="text-foreground">
                    {t.overwrite}
                  </label>
                </div>
              ) : null}
              {conflicts.length && !overwrite ? <p className="text-caption text-muted-foreground">{t.skipNote}</p> : null}
              {parsed.duplicates.length ? (
                <p className="text-caption text-nq-warning-text">
                  {t.pasteDuplicates(parsed.duplicates.join(", "))}
                </p>
              ) : null}
              {parsed.issues.length ? (
                <Alert tone="warning" title={t.issuesTitle}>
                  <ul className="m-0 list-disc ps-4">
                    {parsed.issues.slice(0, 5).map((issue) => (
                      <li key={`${issue.line}-${issue.problem}`}>{t.issue(issue)}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending} disabled={importable.length === 0}>
              {t.importButton(importable.length)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  name,
  onConfirm,
  onClose,
  t,
}: {
  name: string;
  onConfirm: () => Promise<EnvResult>;
  onClose: () => void;
  t: EnvListLabels;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <bdi dir="ltr" className="font-mono">
              {t.deleteTitle(name)}
            </bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.cancel}</AlertDialogCancel>
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await onConfirm();
                if (result?.error) setError(result.error);
                else onClose();
              } catch {
                setError(t.genericError);
              } finally {
                setPending(false);
              }
            }}
          >
            {t.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
