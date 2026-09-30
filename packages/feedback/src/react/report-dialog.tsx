"use client";

// Ported from mahaam-feedback registry/react/feedback/report-dialog.tsx (MIT) onto Nasaq components.
// The behaviour (hide-while-capturing, non-modal picking, create vs edit payloads) is upstream's.
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useNasaq,
} from "@nasaq/web";
import { Camera, Crosshair, Image, Send, X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import {
  captureElement,
  captureViewport,
  consoleSnapshot,
  diagnosticsCounts,
  type FeedbackPayload,
  HIDE_MARKER,
  OWN_MARKER,
  networkSnapshot,
  pageContext,
  pickElement,
  selectorFor,
} from "../core";
import { FEEDBACK_LABELS, type FeedbackLabels, fillLabel } from "./labels";

/** What the form edits. In edit mode the host seeds it from the stored report. */
export type FeedbackDraft = {
  title?: string | null;
  body?: string | null;
  issue_type?: string | null;
  priority?: string | null;
  screenshot?: string | null;
  selector?: string | null;
};

/**
 * What `onSubmit` receives. In create mode this is the full wire payload: page context plus the console and
 * network recorded since the app mounted. In edit mode it carries only the form fields.
 */
export type FeedbackSubmission = FeedbackPayload & { priority?: string };

export type BodyEditorProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  rows: number;
};

export type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Throw to keep the dialog open and show the error. */
  onSubmit: (submission: FeedbackSubmission) => Promise<unknown>;
  mode?: "create" | "edit";
  initial?: FeedbackDraft;
  /** Defaults to the Nasaq locale. */
  locale?: "en" | "ar";
  labels?: Partial<FeedbackLabels>;
  types?: readonly string[];
  typeLabels?: Record<string, string>;
  /** Omit (or pass []) to hide the priority field. */
  priorities?: readonly string[];
  priorityLabels?: Record<string, string>;
  defaultType?: string;
  defaultPriority?: string;
  /** Replace the plain Textarea, e.g. with a markdown editor. */
  renderBody?: (props: BodyEditorProps) => ReactNode;
  /** Host-only fields, rendered last in the form. The host owns their state. */
  extra?: ReactNode;
  /** Prefix for input ids, so two reporters on a page do not collide. */
  idPrefix?: string;
};

const DEFAULT_TYPES = ["bug", "feature", "question"];
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export function ReportDialog({
  open,
  onOpenChange,
  onSubmit,
  mode = "create",
  initial,
  locale,
  labels: overrides,
  types = DEFAULT_TYPES,
  typeLabels,
  priorities = [],
  priorityLabels,
  defaultType = "bug",
  defaultPriority = "medium",
  renderBody,
  extra,
  idPrefix = "feedback",
}: ReportDialogProps) {
  const nasaq = useNasaq();
  const labels = { ...FEEDBACK_LABELS[locale ?? (nasaq.locale === "ar" ? "ar" : "en")], ...overrides };
  const editing = mode === "edit";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [issueType, setIssueType] = useState(defaultType);
  const [priority, setPriority] = useState(defaultPriority);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [selector, setSelector] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"screenshot" | "element" | null>(null);
  // The dialog stays mounted during a capture and hides itself instead of closing, so nothing typed is lost.
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Read once per open: the counts describe what will be attached, not a ticker.
  const [diagnostics, setDiagnostics] = useState(() => diagnosticsCounts());

  // Reset whenever the dialog opens, so a cancelled edit does not leak into the next one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on open only
  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setIssueType(initial?.issue_type ?? defaultType);
    setPriority(initial?.priority ?? defaultPriority);
    setScreenshot(initial?.screenshot ?? null);
    setSelector(initial?.selector ?? null);
    setDiagnostics(diagnosticsCounts());
    setError(null);
  }, [open, initial]);

  const id = (name: string) => `${idPrefix}-${name}`;
  const showPriority = priorities.length > 0;
  const options = (values: readonly string[], names?: Record<string, string>) =>
    values.map((value) => ({ value, label: names?.[value] ?? labels.values[value] ?? value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const fields: FeedbackSubmission = {
        title: title.trim(),
        body: body.trim() || undefined,
        issue_type: issueType,
        priority: showPriority ? priority : undefined,
        screenshot: screenshot ?? undefined,
        selector: selector ?? undefined,
      };
      await onSubmit(
        editing
          ? fields
          : {
              ...fields,
              ...pageContext(),
              // Recorded since the app mounted, so this covers what happened before the dialog opened.
              console_log: consoleSnapshot() || undefined,
              network_log: networkSnapshot() || undefined,
            },
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.failed);
    } finally {
      setSaving(false);
    }
  }

  async function grabScreenshot() {
    setBusy("screenshot");
    setError(null);
    setHidden(true);
    // Two frames, so the dialog is off-screen before the rasteriser walks the DOM.
    await nextFrame();
    await nextFrame();
    try {
      setScreenshot(await captureViewport());
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.screenshotFailed);
    } finally {
      setHidden(false);
      setBusy(null);
    }
  }

  async function grabElement() {
    setBusy("element");
    setError(null);
    setHidden(true);
    await nextFrame();
    try {
      const picked = await pickElement({ hint: labels.pickHint });
      if (picked) {
        setSelector(selectorFor(picked.anchor));
        const shot = await captureElement(picked.element);
        if (shot) setScreenshot(shot);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.pickFailed);
    } finally {
      setHidden(false);
      setBusy(null);
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setScreenshot(String(reader.result));
    reader.readAsDataURL(file);
  }

  const bodyProps: BodyEditorProps = {
    id: id("body"),
    value: body,
    onValueChange: setBody,
    rows: 7,
    placeholder: labels.bodyPlaceholder,
  };

  const choice = (
    name: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    items: { value: string; label: string }[],
  ) => (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => v != null && onChange(v)} name={name}>
        <SelectTrigger id={id(name)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    // A modal dialog takes the page out of the pointer-event tree, so the picker could only ever hit the
    // backdrop. Going non-modal while hidden is what makes picking possible.
    <Dialog open={open} onOpenChange={onOpenChange} modal={!hidden}>
      <DialogContent
        {...{ [HIDE_MARKER]: hidden ? "" : undefined }}
        {...{ [OWN_MARKER]: "" }}
        className={hidden ? "pointer-events-none max-w-xl opacity-0" : "max-w-xl"}
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? labels.editTitle : labels.reportTitle}</DialogTitle>
            <DialogDescription>{editing ? labels.editHint : fillLabel(labels.reportHint, diagnostics)}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>{labels.title}</FieldLabel>
              <Input
                id={id("title")}
                dir={title ? "auto" : undefined}
                value={title}
                placeholder={labels.titlePlaceholder}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <div className={showPriority ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
              {choice("type", labels.type, issueType, setIssueType, options(types, typeLabels))}
              {showPriority ? choice("priority", labels.priority, priority, setPriority, options(priorities, priorityLabels)) : null}
            </div>

            <Field>
              <FieldLabel>{labels.details}</FieldLabel>
              {renderBody ? (
                renderBody(bodyProps)
              ) : (
                <Textarea
                  id={bodyProps.id}
                  dir={body ? "auto" : undefined}
                  value={body}
                  rows={bodyProps.rows}
                  placeholder={bodyProps.placeholder}
                  onChange={(e) => setBody(e.target.value)}
                />
              )}
            </Field>

            {!editing ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-label text-foreground">{labels.attach}</span>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={busy !== null} onClick={grabScreenshot}>
                    <Camera />
                    {busy === "screenshot" ? labels.capturing : labels.screenshot}
                  </Button>
                  <Button type="button" size="sm" disabled={busy !== null} onClick={grabElement}>
                    <Crosshair />
                    {busy === "element" ? labels.picking : labels.selectElement}
                  </Button>
                  <Button type="button" size="sm" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
                    <Image />
                    {labels.image}
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            ) : null}

            {selector ? (
              <p className="flex items-center gap-2 font-mono text-caption text-muted-foreground">
                <Crosshair className="size-3.5 shrink-0" />
                <span dir="ltr" className="truncate">
                  {selector}
                </span>
              </p>
            ) : null}

            {screenshot ? (
              <div className="relative overflow-hidden rounded-control border border-border">
                <img src={screenshot} alt={labels.attachedCapture} className="max-h-48 w-full bg-secondary object-contain" />
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label={labels.removeAttachment}
                  className="absolute end-2 top-2"
                  onClick={() => {
                    setScreenshot(null);
                    setSelector(null);
                  }}
                >
                  <X />
                </Button>
              </div>
            ) : null}

            {extra}
          </div>

          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" variant="primary" loading={saving} disabled={!title.trim()}>
              {saving ? null : <Send />}
              {saving ? labels.saving : editing ? labels.submitEdit : labels.submitReport}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
