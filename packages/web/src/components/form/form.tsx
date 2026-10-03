"use client";
import { Form as BaseForm } from "@base-ui/react/form";
import { type ChangeEvent, type ComponentProps, type FormEvent, type ReactNode, useCallback, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";

export type FormErrors<T> = Partial<Record<keyof T & string, string>>;

/** What `onSubmit` may return: field errors (shown under each field) and/or one form-level error. */
export type FormSubmitResult<T> = void | { fieldErrors?: FormErrors<T>; error?: string };

export interface UseFormOptions<T extends Record<string, unknown>> {
  defaultValues: T;
  /** Runs before submit. Return an error per invalid field; an empty object submits. */
  validate?: (values: T) => FormErrors<T> | undefined;
  onSubmit: (values: T) => FormSubmitResult<T> | Promise<FormSubmitResult<T>>;
}

export interface UseFormResult<T extends Record<string, unknown>> {
  values: T;
  setValue: <K extends keyof T>(name: K, value: T[K]) => void;
  errors: FormErrors<T>;
  setErrors: (errors: FormErrors<T>) => void;
  /** A form-level error from `onSubmit`, shown by `Form` above the fields. */
  formError: string | null;
  submitting: boolean;
  /** True once any value differs from `defaultValues`. */
  dirty: boolean;
  /** Props for a text control: `<Input {...form.register("email")} />`. */
  register: <K extends keyof T & string>(name: K) => { name: K; value: string; onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void };
  /** Spread on `Form`. */
  formProps: { errors: FormErrors<T>; formError: string | null; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onClearErrors: (errors: Record<string, string | string[]>) => void };
  reset: (values?: T) => void;
}

/**
 * Small form state without a form library: values, validation, submit with a pending flag, and errors from the
 * server mapped onto fields. Pair it with `Form` and `FormField`.
 */
export function useForm<T extends Record<string, unknown>>({ defaultValues, validate, onSubmit }: UseFormOptions<T>): UseFormResult<T> {
  const initial = useRef(defaultValues);
  const [values, setValues] = useState<T>(defaultValues);
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!(name in e)) return e;
      const next = { ...e };
      delete next[name as keyof T & string];
      return next;
    });
  }, []);

  const register = useCallback(
    <K extends keyof T & string>(name: K) => ({
      name,
      value: values[name] == null ? "" : String(values[name]),
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValue(name, e.target.value as T[K]),
    }),
    [values, setValue],
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const found = validate?.(values) ?? {};
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
      } else {
        setErrors({});
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const dirty = Object.keys(values).some((k) => values[k] !== initial.current[k]);

  return {
    values,
    setValue,
    errors,
    setErrors,
    formError,
    submitting,
    dirty,
    register,
    formProps: {
      errors,
      formError,
      onSubmit: submit,
      onClearErrors: (next) => setErrors(next as FormErrors<T>),
    },
    reset: (next) => {
      const v = next ?? initial.current;
      if (next) initial.current = next;
      setValues(v);
      setErrors({});
      setFormError(null);
    },
  };
}

export interface FormProps extends Omit<ComponentProps<typeof BaseForm>, "errors"> {
  /** Errors by field name; each shows in the `FormField` (or `Field`) with that `name`. */
  errors?: Record<string, string | undefined>;
  /** One error for the whole form, shown above the fields. */
  formError?: string | null;
}

/**
 * A `<form>` that connects field errors to Nasaq fields by `name`: a field with an error is marked invalid and
 * shows the message, and it clears when the user edits it. Takes `useForm().formProps`, or `errors` from anywhere.
 */
export function Form({ errors, formError, className, children, ...props }: FormProps) {
  const clean = errors ? (Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>) : undefined;
  return (
    <BaseForm data-slot="form" noValidate errors={clean} className={cn("flex flex-col gap-4", className as string)} {...props}>
      {formError ? <Alert tone="danger">{formError}</Alert> : null}
      {children}
    </BaseForm>
  );
}

export interface FormFieldProps extends Omit<ComponentProps<typeof Field>, "children"> {
  /** The field name; matches the key in `errors`. */
  name: string;
  label?: ReactNode;
  description?: ReactNode;
  /** The control: `Input`, `Textarea`, `NativeSelect`… */
  children: ReactNode;
}

/** Label, control, description and error for one field, wired by `name`. */
export function FormField({ name, label, description, children, ...props }: FormFieldProps) {
  return (
    <Field name={name} {...props}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {children}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError />
    </Field>
  );
}
