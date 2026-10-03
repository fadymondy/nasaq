// Shared by the auth forms: the locale, the submit state, a resend timer and passkey helpers. The React auth-utils.tsx, as composables.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { useNasaq } from "../../provider";

/** What an auth form's `onSubmit` may resolve to: nothing on success, or a failure to show. */
export interface AuthSubmitFailure {
  /** A message for the whole form (wrong password, network down). Shown in the error summary. */
  error?: string;
  /** Messages keyed by field name (`email`, `password`, `code`…). Shown under the field. */
  fieldErrors?: Record<string, string>;
}
export type AuthSubmitResult = void | AuthSubmitFailure;
export type AuthLocale = "en" | "ar";

/** The built-in language for the current Nasaq locale. */
export function useAuthLocale(): ComputedRef<AuthLocale> {
  const nasaq = useNasaq();
  return computed(() => (nasaq.locale.value.startsWith("ar") ? "ar" : "en"));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (value: string) => EMAIL.test(value.trim());

/** 0:27 style countdown. */
export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Seconds left on a resend timer. `start(n)` restarts it. */
export function useCooldown(initial = 0) {
  const remaining = ref(initial);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    clearTimeout(timer);
    if (remaining.value <= 0) return;
    timer = setTimeout(() => {
      remaining.value = Math.max(0, remaining.value - 1);
      tick();
    }, 1000);
  };
  tick();
  onBeforeUnmount(() => clearTimeout(timer));
  return {
    remaining,
    start(seconds: number) {
      remaining.value = seconds;
      tick();
    },
  };
}

export interface UseAuthFormOptions<V, K extends string> {
  onSubmit: (values: V) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Local checks that run before `onSubmit`. Return messages keyed by field name. */
  validate?: (values: V) => Partial<Record<K, string>>;
  /** Shown when `onSubmit` throws. */
  fallbackError: string;
}

/**
 * Submit state shared by the auth forms: pending flag, whole-form error, per-field errors, and focus.
 * After a failed submit focus moves to the first `aria-invalid` control, or to the summary when there is none.
 */
export function useAuthForm<V, K extends string = string>({ onSubmit, validate, fallbackError }: UseAuthFormOptions<V, K>) {
  const formRef = ref<HTMLFormElement | null>(null);
  const summaryRef = ref<HTMLElement | null>(null);
  const pending = ref(false);
  const error = ref<string | undefined>();
  const fieldErrors = ref<Partial<Record<string, string>>>({});
  const focusTick = ref(0);
  let busy = false;
  let mounted = true;

  onBeforeUnmount(() => (mounted = false));

  watch(focusTick, async () => {
    await nextTick();
    const invalid = formRef.value?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (invalid ?? summaryRef.value)?.focus();
  });

  async function submit(values: V) {
    if (busy) return;
    error.value = undefined;
    const local = validate?.(values) ?? {};
    if (Object.values(local).some(Boolean)) {
      fieldErrors.value = local;
      focusTick.value++;
      return;
    }
    fieldErrors.value = {};
    busy = true;
    pending.value = true;
    try {
      const result = await onSubmit(values);
      if (result && mounted) {
        error.value = result.error;
        fieldErrors.value = result.fieldErrors ?? {};
        if (result.error || (result.fieldErrors && Object.keys(result.fieldErrors).length)) focusTick.value++;
      }
    } catch {
      if (mounted) {
        error.value = fallbackError;
        focusTick.value++;
      }
    } finally {
      busy = false;
      if (mounted) pending.value = false;
    }
  }

  /** Clears one field's message as soon as the person edits it. */
  const clear = (name: string) => {
    if (fieldErrors.value[name]) fieldErrors.value = { ...fieldErrors.value, [name]: undefined };
  };
  const focusField = (name: string) => formRef.value?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();

  return { formRef, summaryRef, pending, error, fieldErrors, submit, clear, focusField };
}

/** True when the browser can do WebAuthn. False on the server and on the first render, so markup matches. */
export function usePasskeySupport(): Ref<boolean> {
  const supported = ref(false);
  onMounted(() => (supported.value = typeof PublicKeyCredential !== "undefined"));
  return supported;
}

/**
 * Starts passkey autofill (WebAuthn conditional UI) when the browser offers it. `start` gets an
 * AbortSignal that fires on unmount; the input needs autocomplete="username webauthn".
 */
export function useConditionalPasskey(start?: (signal: AbortSignal) => void | Promise<unknown>) {
  const controller = new AbortController();
  onBeforeUnmount(() => controller.abort());
  onMounted(() => {
    if (!start || typeof PublicKeyCredential === "undefined") return;
    void (async () => {
      try {
        const available = await PublicKeyCredential.isConditionalMediationAvailable?.();
        if (available && !controller.signal.aborted) await start(controller.signal);
      } catch {
        // Autofill is a bonus: a cancelled or failed prompt must never break the form.
      }
    })();
  });
}
