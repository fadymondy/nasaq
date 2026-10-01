// useForm and the context NqForm shares with NqFormField. Same shape as the React `useForm`, with Vue refs inside a reactive object.
import { computed, reactive, ref, type ComputedRef, type InjectionKey, type Ref } from "vue";

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
  /** A form-level error from `onSubmit`, shown by `NqForm` above the fields. */
  formError: string | null;
  submitting: boolean;
  /** True once any value differs from `defaultValues`. */
  dirty: boolean;
  /** Props for a text control: `<NqInput v-bind="form.register('email')" />` (name, modelValue and update:modelValue). */
  register: <K extends keyof T & string>(name: K) => { name: K; modelValue: string; "onUpdate:modelValue": (value: string | number | undefined) => void };
  /** Bind on `NqForm`: `<NqForm v-bind="form.formProps">`. */
  formProps: { errors: FormErrors<T>; formError: string | null; onSubmit: (e: Event) => void; onClearErrors: (errors: Record<string, string | string[]>) => void };
  reset: (values?: T) => void;
}

/**
 * Small form state without a form library: values, validation, submit with a pending flag, and errors from the
 * server mapped onto fields. Pair it with `NqForm` and `NqFormField`. The result is reactive: read
 * `form.submitting`, `form.values.email` and `form.errors` directly, in script and in templates.
 */
export function useForm<T extends Record<string, unknown>>({ defaultValues, validate, onSubmit }: UseFormOptions<T>): UseFormResult<T> {
  let initial: T = { ...defaultValues };
  const values = ref({ ...defaultValues }) as Ref<T>;
  const errors = ref<FormErrors<T>>({}) as Ref<FormErrors<T>>;
  const formError = ref<string | null>(null);
  const submitting = ref(false);

  function setValue<K extends keyof T>(name: K, value: T[K]) {
    values.value = { ...values.value, [name]: value };
    if (name in errors.value) {
      const next = { ...errors.value };
      delete next[name as keyof T & string];
      errors.value = next;
    }
  }

  function register<K extends keyof T & string>(name: K) {
    return {
      name,
      modelValue: values.value[name] == null ? "" : String(values.value[name]),
      "onUpdate:modelValue": (value: string | number | undefined) => setValue(name, (value === undefined ? "" : String(value)) as T[K]),
    };
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (submitting.value) return;
    formError.value = null;
    const found = validate?.(values.value) ?? {};
    if (Object.keys(found).length) {
      errors.value = found;
      return;
    }
    submitting.value = true;
    try {
      const result = await onSubmit(values.value);
      if (result) {
        errors.value = result.fieldErrors ?? {};
        formError.value = result.error ?? null;
      } else {
        errors.value = {};
      }
    } catch (err) {
      formError.value = err instanceof Error ? err.message : String(err);
    } finally {
      submitting.value = false;
    }
  }

  const dirty = computed(() => Object.keys(values.value).some((k) => values.value[k] !== initial[k]));
  const formProps = computed(() => ({
    errors: errors.value,
    formError: formError.value,
    onSubmit: submit,
    onClearErrors: (next: Record<string, string | string[]>) => (errors.value = next as FormErrors<T>),
  }));

  return reactive({
    values,
    setValue,
    errors,
    setErrors: (next: FormErrors<T>) => (errors.value = next),
    formError,
    submitting,
    dirty: dirty as ComputedRef<boolean>,
    register,
    formProps,
    reset: (next?: T) => {
      if (next) initial = { ...next };
      values.value = { ...initial };
      errors.value = {};
      formError.value = null;
    },
  }) as unknown as UseFormResult<T>;
}

/** What NqForm shares with its NqFormField children. */
export interface FormContext {
  errors: ComputedRef<Record<string, string>>;
  /** Drops one field's error and tells the host through `clearErrors`. */
  clear(name: string): void;
}

export const FORM: InjectionKey<FormContext> = Symbol("nq-form");
