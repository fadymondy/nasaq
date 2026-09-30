"use client";

import { type FormEvent, type ReactNode, useCallback, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { formatDate, formatNumber } from "../numeric";
import type { RelationPickerProps } from "../relation-picker";
import type { FormRule } from "../public-form/form-model";
import type { SchemaFormJson } from "./schema-fields";
import { SCHEMA_FORM_STRINGS, SchemaFormProvider, type SchemaFormContext, type SchemaFormStrings, SchemaNodes } from "./schema-nodes";
import { schemaPathInside, schemaPathSet } from "./schema-path";
import {
  SCHEMA_FORM_MESSAGES,
  schemaFormMapErrors,
  schemaFormPathLabel,
  schemaFormTree,
  schemaFormTreeInitial,
  schemaFormTreeOutput,
  schemaFormTreeStates,
  schemaFormTreeValidate,
} from "./schema-tree";

/** How a relation resource is searched. The same shape as RelationPicker's data props. */
export type SchemaFormRelationSource = Pick<RelationPickerProps, "search" | "options" | "resolve" | "onCreate" | "debounce" | "renderOption">;

/** Every string the form shows. Override any of them, for another language or wording. */
export type SchemaFormLabels = Partial<SchemaFormStrings>;

export interface SchemaFormSubmitResult {
  /** A message for the whole form. */
  error?: string;
  /** Server-side errors by field path ("email", "address.city", "contacts[1].phone"). */
  fieldErrors?: Record<string, string>;
}

export interface SchemaFormProps {
  /** A JSON Schema of type object. See the README for the supported subset and the `x-` extensions. */
  schema: SchemaFormJson;
  /** Controlled values in the shape of the schema (nested objects and arrays allowed). */
  value?: Record<string, unknown>;
  defaultValue?: Record<string, unknown>;
  /** Called on every change with the output shape: nested objects, numbers as numbers, empty text as null. */
  onValueChange?: (value: Record<string, unknown>) => void;
  /** Called with valid output. Resolve with `{ error, fieldErrors }` to show server errors. */
  onSubmit?: (value: Record<string, unknown>) => Promise<void | SchemaFormSubmitResult> | void;
  /** Show, hide and require rules, from RuleBuilder. Fields are addressed by path: "address.city", "contacts[].phone", "./type" inside an array item. */
  rules?: readonly FormRule[];
  /** Where each `x-relation` resource is searched, by resource name. */
  relations?: Record<string, SchemaFormRelationSource>;
  submitLabel?: ReactNode;
  /** Hides the Save and Reset buttons, for a form submitted from outside. */
  hideActions?: boolean;
  disabled?: boolean;
  /** Accessible name. */
  label?: string;
  locale?: string;
  labels?: SchemaFormLabels;
  className?: string;
}

type Values = Record<string, unknown>;

const FOCUSABLE = ':is(input, textarea, button, [role="combobox"], [role="switch"], [role="checkbox"]):not([disabled])';

/**
 * A form generated from a JSON Schema: text, numbers, enums, booleans, dates, foreign keys, objects nested to any depth,
 * lists of plain values (tags, repeated inputs, checkbox groups) and lists of objects (collapsible, reorderable groups).
 * Rules from RuleBuilder show, hide or require fields, by path. It validates on the client with functions you can run on
 * the server, and puts the server's field errors on the right nested field.
 */
export function SchemaForm({ schema, value, defaultValue, onValueChange, onSubmit, rules, relations, submitLabel, hideActions, disabled, label, locale: localeProp, labels, className }: SchemaFormProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const lang = ar ? "ar" : "en";
  const t: SchemaFormStrings = { ...SCHEMA_FORM_STRINGS[lang], ...labels };
  const messages = SCHEMA_FORM_MESSAGES[lang];
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const n = useCallback((v: number) => formatNumber(v, lang), [lang]);

  const { root } = useMemo(() => schemaFormTree(schema, { locale: lang }), [schema, lang]);
  const [inner, setInner] = useState<unknown>(() => schemaFormTreeInitial(root, value ?? defaultValue));
  const values = useMemo(() => (value ? schemaFormTreeInitial(root, value) : inner), [value, root, inner]);

  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<{ token: number; paths: readonly string[] } | null>(null);

  const states = useMemo(() => schemaFormTreeStates(root, values, rules), [root, values, rules]);
  const issues = useMemo(() => schemaFormTreeValidate(root, values, { messages, states, formatDate: (iso) => formatDate(iso, lang), formatIndex: n }), [root, values, messages, states, lang, n]);
  const mapped = useMemo(() => schemaFormMapErrors(root, values, serverErrors), [root, values, serverErrors]);

  /** What is on screen: server errors win, client errors show once edited or after a failed submit. */
  const shown = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [path, message] of Object.entries(issues)) if (showAll || touched.has(path)) out[path] = message;
    for (const [path, message] of Object.entries(mapped.fields)) out[path] = message;
    return out;
  }, [issues, showAll, touched, mapped]);
  const shownPaths = Object.keys(shown);
  const issueCount = Object.keys(issues).length;

  const output = useCallback((next: unknown, st = states) => schemaFormTreeOutput(root, next, { visible: (p) => st[p]?.visible !== false }) as Values, [root, states]);

  const commit = (path: string, next: unknown, structural: boolean) => {
    const merged = schemaPathSet(values, path, next);
    if (!value) setInner(merged);
    setTouched((prev) => new Set(prev).add(path));
    setServerErrors((prev) => {
      const keys = Object.keys(prev).filter((k) => (structural ? schemaPathInside(k, path) : k === path));
      if (!keys.length) return prev;
      const copy = { ...prev };
      for (const k of keys) delete copy[k];
      return copy;
    });
    if (status !== "saving") setStatus("idle");
    onValueChange?.(schemaFormTreeOutput(root, merged, { visible: (p) => states[p]?.visible !== false }) as Values);
  };

  /** Opens the groups that hold a path, then puts focus on its field. */
  const focusPath = useCallback((path: string) => {
    setReveal((cur) => ({ token: (cur?.token ?? 0) + 1, paths: [path] }));
    let tries = 0;
    const attempt = () => {
      const scope = formRef.current;
      if (!scope) return;
      const holder = [...scope.querySelectorAll<HTMLElement>("[data-schema-path]")].find((el) => el.dataset.schemaPath === path);
      const target = holder ? (holder.matches(FOCUSABLE) ? holder : holder.querySelector<HTMLElement>(FOCUSABLE)) : null;
      if (target && target.closest("[hidden]") === null) {
        target.focus();
        target.scrollIntoView?.({ block: "center", behavior: "smooth" });
        return;
      }
      if ((tries += 1) < 6) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(() => requestAnimationFrame(attempt));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || status === "saving") return;
    setShowAll(true);
    if (issueCount > 0) {
      setStatus("idle");
      focusPath(Object.keys(issues)[0] as string);
      return;
    }
    setStatus("saving");
    setFormError(null);
    try {
      // Hidden fields are not part of what is submitted.
      const result = await onSubmit?.(output(values));
      if (result && (result.error || result.fieldErrors)) {
        const errors = result.fieldErrors ?? {};
        setServerErrors(errors);
        setFormError(result.error ?? null);
        setStatus("failed");
        const first = Object.keys(schemaFormMapErrors(root, values, errors).fields)[0];
        if (first) focusPath(first);
      } else {
        setStatus("saved");
      }
    } catch {
      setFormError(t.failed);
      setStatus("failed");
    }
  };

  const reset = () => {
    const fresh = schemaFormTreeInitial(root, defaultValue);
    if (!value) setInner(fresh);
    onValueChange?.(schemaFormTreeOutput(root, fresh, {}) as Values);
    setTouched(new Set());
    setShowAll(false);
    setServerErrors({});
    setFormError(null);
    setStatus("idle");
  };

  const ctx: SchemaFormContext = {
    uid,
    t,
    locale: lang,
    messages,
    states,
    messageFor: (path) => shown[path] || undefined,
    issueCount: (path) => shownPaths.filter((p) => schemaPathInside(p, path)).length,
    disabled: !!disabled,
    relations,
    showErrors: showAll,
    onChange: (path, next) => commit(path, next, false),
    onStructure: (path, next) => commit(path, next, true),
    reveal,
  };

  const busy = status === "saving";
  const summary = showAll ? shownPaths.filter((p) => shown[p]) : [];

  return (
    <SchemaFormProvider value={ctx}>
      <form ref={formRef} data-slot="schema-form" aria-label={label} noValidate onSubmit={submit} onReset={(e) => (e.preventDefault(), reset())} className={cn("flex min-w-0 flex-col gap-6", className)}>
        <SchemaNodes node={root} value={values} path="" depth={0} />
        {formError ? <Alert tone="danger">{formError}</Alert> : null}
        {mapped.unmatched.length ? (
          <Alert tone="danger" data-slot="schema-form-unmatched">
            <p>{t.unmatched}</p>
            <ul className="mt-1 list-disc ps-5">
              {mapped.unmatched.map((u) => (
                <li key={u.path}>
                  {u.path}: {u.message}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {status === "saved" ? <Alert tone="success">{t.saved}</Alert> : null}
        {showAll && issueCount > 0 ? (
          <Alert tone="warning" data-slot="schema-form-summary">
            <p>{t.fix(issueCount)}</p>
            {issueCount > 1 || summary.length ? (
              <ul aria-label={t.goTo} className="mt-1 flex flex-col items-start gap-0.5">
                {summary.slice(0, 8).map((p) => (
                  <li key={p}>
                    <button type="button" data-path={p} onClick={() => focusPath(p)} className="rounded-control text-start underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                      {schemaFormPathLabel(root, p, n) || p}: {shown[p]}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}
        {hideActions ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" loading={busy} disabled={disabled}>
              {busy ? t.saving : (submitLabel ?? t.submit)}
            </Button>
            <Button type="reset" variant="ghost" disabled={disabled || busy}>
              {t.reset}
            </Button>
          </div>
        )}
      </form>
    </SchemaFormProvider>
  );
}
