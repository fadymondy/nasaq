"use client";

import { CircleCheck } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { PhoneInput } from "../phone-input";
import { Radio, RadioGroup } from "../radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import {
  buildFormSubmission,
  contactFormDefinition,
  type ContactTopic,
  FORM_HONEYPOT,
  type FormDefinition,
  type FormErrorCode,
  type FormFieldDef,
  formFieldStates,
  formText,
  type FormValues,
  validateFormValues,
} from "./form-model";

const STRINGS = {
  en: {
    submit: "Send",
    sending: "Sending",
    choose: "Choose an option",
    optional: "optional",
    closed: "This form is not accepting responses right now.",
    another: "Send another response",
    failed: "Something went wrong. Please try again.",
    errors: {
      required: "This field is required.",
      email: "Enter a valid email address.",
      phone: "Enter a phone number with its country code.",
      number: "Enter a number.",
    },
    honeypot: "Leave this field empty",
    preview: "Preview: nothing is sent.",
  },
  ar: {
    submit: "إرسال",
    sending: "جارٍ الإرسال",
    choose: "اختر خيارًا",
    optional: "اختياري",
    closed: "هذا النموذج لا يستقبل ردودًا حاليًا.",
    another: "إرسال رد آخر",
    failed: "حدث خطأ. حاول مرة أخرى.",
    errors: {
      required: "هذا الحقل مطلوب.",
      email: "أدخل بريدًا إلكترونيًا صحيحًا.",
      phone: "أدخل رقم هاتف مع رمز الدولة.",
      number: "أدخل رقمًا.",
    },
    honeypot: "اترك هذا الحقل فارغًا",
    preview: "معاينة: لا يُرسل شيء.",
  },
} as const;
export type PublicFormLabels = Partial<{ [K in keyof (typeof STRINGS)["en"]]: (typeof STRINGS)["en"][K] extends string ? string : (typeof STRINGS)["en"][K] }>;

export interface PublicFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children" | "defaultValue"> {
  form: FormDefinition;
  /**
   * Called with the visible answers when the form is valid. Reject or resolve `{ error }` to show a message and keep
   * the form. Spam (honeypot filled) never reaches it; the visitor still sees the thank-you.
   */
  onSubmit?: (data: FormValues) => void | { error?: string } | Promise<void | { error?: string }>;
  defaultValues?: FormValues;
  /** Text of the submit button. Default "Send". */
  submitLabel?: ReactNode;
  /** Shown as it is, no submitting. For the builder's live preview. */
  preview?: boolean;
  locale?: string;
  labels?: PublicFormLabels;
}

function optionLabel(o: { label: string; labelAr?: string }, locale: string) {
  return formText(o.label, o.labelAr, locale);
}

/**
 * Renders a `FormDefinition` for visitors: text, email, phone, number, long text, select, radio and checkbox fields,
 * rules that show, hide or require fields as answers change, validation in the visitor's language, a hidden
 * honeypot, and a thank-you in Arabic or English.
 */
export function PublicForm({ form, onSubmit, defaultValues, submitLabel, preview, locale: localeProp, labels, className, ...props }: PublicFormProps) {
  const ambient = useOptionalNasaq()?.locale;
  const locale = localeProp ?? ambient ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } as (typeof STRINGS)["en"];
  const uid = useId();
  const [values, setValues] = useState<FormValues>(defaultValues ?? {});
  const [errors, setErrors] = useState<Record<string, FormErrorCode>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const states = formFieldStates(form, values);
  const idOf = (f: FormFieldDef) => `${uid}-${f.id}`;

  const set = (id: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [id]: value }));
    if (errors[id]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)));
  };

  if (!form.enabled && !preview) {
    return (
      <p data-slot="public-form" data-state="closed" role="status" className={cn("rounded-card border border-border bg-nq-surface-soft p-4 text-body-sm text-muted-foreground", className)}>
        {t.closed}
      </p>
    );
  }

  if (done) {
    return (
      <div data-slot="public-form" data-state="done" role="status" className={cn("flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5", className)}>
        <CircleCheck aria-hidden className="size-6 text-nq-success" />
        <p className="text-body">{formText(form.thanksEn, form.thanksAr, locale)}</p>
        <Button
          type="button"
          variant="link"
          className="px-0"
          onClick={() => {
            setValues(defaultValues ?? {});
            setDone(false);
          }}
        >
          {t.another}
        </Button>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateFormValues(form, values);
    setErrors(found);
    setFailure(null);
    const first = form.fields.find((f) => found[f.id]);
    if (first) {
      document.getElementById(idOf(first))?.focus();
      return;
    }
    if (preview) return;
    const { data, spam } = buildFormSubmission(form, values);
    if (spam) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      const result = await onSubmit?.(data);
      if (result && typeof result === "object" && result.error) setFailure(result.error);
      else setDone(true);
    } catch {
      setFailure(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const renderControl = (f: FormFieldDef, required: boolean, invalid: boolean) => {
    const id = idOf(f);
    const value = values[f.id];
    const text = typeof value === "string" ? value : "";
    const placeholder = formText(f.placeholder, f.placeholderAr, locale) || undefined;
    switch (f.kind) {
      case "textarea":
        return <Textarea id={id} rows={4} value={text} required={required} aria-invalid={invalid || undefined} placeholder={placeholder} onChange={(e) => set(f.id, e.target.value)} />;
      case "phone":
        return <PhoneInput value={text} invalid={invalid} onValueChange={(next) => set(f.id, next)} />;
      case "select":
        return (
          <Select items={(f.options ?? []).map((o) => ({ value: o.value, label: optionLabel(o, locale) }))} value={text || null} onValueChange={(next) => set(f.id, typeof next === "string" ? next : "")}>
            <SelectTrigger id={id} aria-invalid={invalid || undefined}>
              <SelectValue placeholder={placeholder ?? t.choose} />
            </SelectTrigger>
            <SelectContent>
              {(f.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {optionLabel(o, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <RadioGroup id={id} value={text} onValueChange={(next) => set(f.id, String(next))} aria-invalid={invalid || undefined}>
            {(f.options ?? []).map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-body">
                <Radio value={o.value} />
                {optionLabel(o, locale)}
              </label>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return null;
      default:
        return (
          <Input
            id={id}
            value={text}
            required={required}
            ltr={f.kind === "email" || f.kind === "number"}
            type="text"
            inputMode={f.kind === "email" ? "email" : f.kind === "number" ? "decimal" : undefined}
            autoComplete={f.kind === "email" ? "email" : undefined}
            aria-invalid={invalid || undefined}
            placeholder={placeholder}
            onChange={(e) => set(f.id, e.target.value)}
          />
        );
    }
  };

  return (
    <form
      data-slot="public-form"
      data-kind={form.kind}
      noValidate
      onSubmit={submit}
      className={cn("relative flex w-full flex-col gap-4", className)}
      {...props}
    >
      {form.fields.map((f) => {
        const state = states[f.id];
        if (!state?.visible) return null;
        const error = errors[f.id];
        const label = formText(f.label, f.labelAr, locale);
        const help = formText(f.help, f.helpAr, locale);
        if (f.kind === "checkbox") {
          return (
            <Field key={f.id} invalid={Boolean(error)} data-field={f.id}>
              <label className="flex items-start gap-2 text-body">
                <Checkbox id={idOf(f)} checked={values[f.id] === true} onCheckedChange={(c) => set(f.id, c === true)} aria-invalid={error ? true : undefined} className="mt-1" />
                <span>{label}</span>
              </label>
              {help ? <FieldDescription>{help}</FieldDescription> : null}
              {error ? <FieldError match>{t.errors[error]}</FieldError> : null}
            </Field>
          );
        }
        return (
          <Field key={f.id} invalid={Boolean(error)} data-field={f.id}>
            <FieldLabel htmlFor={f.kind === "radio" ? undefined : idOf(f)}>
              {label}
              {!state.required ? <span className="ms-1 font-normal text-muted-foreground">({t.optional})</span> : null}
            </FieldLabel>
            {renderControl(f, state.required, Boolean(error))}
            {help ? <FieldDescription>{help}</FieldDescription> : null}
            {error ? <FieldError match>{t.errors[error]}</FieldError> : null}
          </Field>
        );
      })}

      {form.honeypot ? (
        <div aria-hidden="true" className="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
          <label>
            {t.honeypot}
            <input
              type="text"
              name={FORM_HONEYPOT}
              tabIndex={-1}
              autoComplete="off"
              value={String(values[FORM_HONEYPOT] ?? "")}
              onChange={(e) => set(FORM_HONEYPOT, e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {failure ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {failure}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy}>
          {submitLabel ?? t.submit}
        </Button>
        {preview ? <span className="text-caption text-muted-foreground">{t.preview}</span> : null}
      </div>
    </form>
  );
}

export interface ContactFormProps extends Omit<PublicFormProps, "form"> {
  /** What people are writing about. Default: sales, support, something else. */
  topics?: readonly ContactTopic[];
  /** Change the fields, thank-you text or honeypot of the preset. */
  form?: FormDefinition;
}

/** Name, email, topic, message and a honeypot: `PublicForm` with the contact preset. */
export function ContactForm({ topics, form, ...props }: ContactFormProps) {
  return <PublicForm form={form ?? contactFormDefinition(topics)} {...props} />;
}
