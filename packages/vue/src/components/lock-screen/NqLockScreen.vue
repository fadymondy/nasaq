<script setup lang="ts">
import { BellOff, ChevronDown, Delete, Fingerprint, Hash, KeyRound, LockKeyhole, UserPlus, UserRoundCog } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { useAuthForm, useAuthLocale, useCooldown, type AuthSubmitResult } from "../auth-layout";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldLabel } from "../field";
import { NqOtpInput } from "../otp-input";
import { NqPasswordInput } from "../password-input";
import { NqProductMark } from "../product-mark";
import { type LockMethod, PIN_KEYS, pinAppend, pinBackspace, registerFailure } from "./lock-model";
import { STRINGS, type LockAttempt, type LockReason, type LockScreenLabels, type LockUser } from "./strings";

// An OS-style lock screen: a wallpaper with the clock, the person's avatar and one way to unlock at a time: PIN keypad, password
// (with an optional authenticator code) or biometrics. It counts wrong attempts and locks out for a while. It verifies nothing
// itself; `onUnlock` does.
interface Props {
  user: LockUser;
  /** Ways to unlock, in the order offered. Default `["pin"]`. */
  methods?: LockMethod[];
  /** Which method to open on. Default: the first of `methods`. */
  defaultMethod?: LockMethod;
  /** PIN digits. Default 6. */
  pinLength?: number;
  /** Ask for an authenticator code with the password. */
  requireCode?: boolean;
  /** Why the screen is up. `quiet` is the quiet-mode gate: notifications are paused until you unlock. Default `locked`. */
  reason?: LockReason;
  /** Resolve with nothing to unlock, or `{ error }` for a wrong secret. The host owns verification and session. */
  onUnlock: (attempt: LockAttempt) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows "Not you? Sign out". */
  onSignOut?: () => void;
  /** Other accounts signed in on this device, listed under "Switch account". */
  accounts?: LockUser[];
  /** Shows "Switch account". Called with the chosen account, or `null` for "Sign in to another account". */
  onSwitchAccount?: (account: LockUser | null) => void;
  /** Show the host's official mark above the user (the `mark` slot replaces it). Default true. */
  showMark?: boolean;
  /** Show the big clock and date. Default true. */
  showClock?: boolean;
  /** Freeze the clock at this time (docs, tests). Default: now, ticking. */
  now?: Date | number;
  /** Wrong PINs or passwords in a row before a timed lockout. Default 5. */
  maxAttempts?: number;
  /** Seconds of lockout. Default 30. */
  lockoutSeconds?: number;
  labels?: Partial<LockScreenLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  methods: () => ["pin"],
  defaultMethod: undefined,
  pinLength: 6,
  requireCode: false,
  reason: "locked",
  onSignOut: undefined,
  accounts: undefined,
  onSwitchAccount: undefined,
  showMark: true,
  showClock: true,
  now: undefined,
  maxAttempts: 5,
  lockoutSeconds: 30,
  labels: undefined,
});

defineSlots<{
  /** Your own mark above the user, in place of the product mark. */
  mark?: () => unknown;
  /** A full-bleed backdrop (an image, a gradient). It sits under a readable scrim. */
  wallpaper?: () => unknown;
  /** Small print at the bottom. */
  footer?: () => unknown;
}>();

const locale = useAuthLocale();
const t = computed<LockScreenLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const { locale: nasaqLocale } = useNasaq();

const method = ref<LockMethod>(props.defaultMethod && props.methods.includes(props.defaultMethod) ? props.defaultMethod : (props.methods[0] ?? "pin"));
const pin = ref("");
const password = ref("");
const code = ref("");
const failures = ref(0);
const cooldown = useCooldown(0);
const locked = computed(() => cooldown.remaining.value > 0);
const rootRef = ref<HTMLDivElement | null>(null);

// A clock that ticks each second, or stays on the frozen time.
const clock = ref<number | null>(props.now === undefined ? null : new Date(props.now).getTime());
let tickTimer: ReturnType<typeof setInterval> | undefined;
function startClock() {
  clearInterval(tickTimer);
  if (props.now !== undefined) {
    clock.value = new Date(props.now).getTime();
    return;
  }
  clock.value = Date.now();
  tickTimer = setInterval(() => (clock.value = Date.now()), 1000);
}
onMounted(() => {
  startClock();
  if (method.value === "pin") focusPad();
});
watch(() => props.now, startClock);
onBeforeUnmount(() => clearInterval(tickTimer));

const form = useAuthForm<LockAttempt, "secret" | "code">({
  fallbackError: t.value.failed,
  validate: (v) => ({
    secret: v.method === "password" && !v.secret ? t.value.passwordRequired : undefined,
    code: v.method === "password" && props.requireCode && (v.code ?? "").length !== 6 ? fill(t.value.codeRequired, { length: 6 }) : undefined,
  }),
  onSubmit: async (attempt) => {
    let result: AuthSubmitResult;
    try {
      result = await props.onUnlock(attempt);
    } catch (error) {
      pin.value = "";
      throw error;
    }
    if (result?.error || result?.fieldErrors) {
      pin.value = "";
      password.value = "";
      code.value = "";
      if (attempt.method !== "biometric") {
        const next = registerFailure(failures.value, props.maxAttempts);
        failures.value = next.failures;
        if (next.lockedOut) {
          cooldown.start(props.lockoutSeconds);
          return { error: fill(t.value.lockout, { time: formatCountdown(props.lockoutSeconds) }) };
        }
        if (attempt.method === "pin" && !result.error) return { error: fill(t.value.wrongPin, { left: props.maxAttempts - next.failures }) };
      }
    }
    return result;
  },
});
const { formRef, pending, fieldErrors: fe } = form;

function switchMethod(next: LockMethod) {
  method.value = next;
  pin.value = "";
  password.value = "";
  code.value = "";
  form.error.value = undefined;
  fe.value = {};
}

watch(locked, (isLocked) => {
  if (!isLocked) form.error.value = undefined;
});

function pressKey(key: string) {
  if (pending.value || locked.value) return;
  if (form.error.value) form.error.value = undefined;
  const next = pinAppend(pin.value, key, props.pinLength);
  const changed = next !== pin.value;
  pin.value = next;
  if (next.length === props.pinLength && changed) void form.submit({ method: "pin", secret: next });
}
function backspace() {
  if (pending.value || locked.value) return;
  pin.value = pinBackspace(pin.value);
}
function onKeyDown(event: KeyboardEvent) {
  if (method.value !== "pin" || event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    pressKey(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    backspace();
  }
}
async function focusPad() {
  await nextTick();
  rootRef.value?.querySelector<HTMLElement>('[data-slot="lock-screen-pad"]')?.focus({ preventScroll: true });
}
watch(method, (m) => {
  if (m === "pin") void focusPad();
});

const title = computed(() => (props.reason === "quiet" ? t.value.quietTitle : props.reason === "idle" ? t.value.idleTitle : t.value.lockedTitle));
const description = computed(() => (props.reason === "quiet" ? t.value.quietDescription : props.reason === "idle" ? t.value.idleDescription : t.value.lockedDescription));
const message = computed(() => (locked.value ? fill(t.value.lockout, { time: formatCountdown(cooldown.remaining.value) }) : (form.error.value ?? fe.value.secret ?? fe.value.code)));
const others = computed(() => props.methods.filter((m) => m !== method.value));
const otherLabel = computed<Record<LockMethod, string>>(() => ({ pin: t.value.usePin, password: t.value.usePassword, biometric: t.value.useBiometric, passkey: t.value.usePasskey }));
const otherIcon = { pin: Hash, password: KeyRound, biometric: Fingerprint, passkey: UserRoundCog } as const;

const lang = computed(() => String(nasaqLocale.value));
const time = computed(() => (clock.value === null ? "" : new Intl.DateTimeFormat(lang.value, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(clock.value)));
const date = computed(() => (clock.value === null ? "" : new Intl.DateTimeFormat(lang.value, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(clock.value)));
const keyClass = "h-14 w-full text-h3 font-normal tabular-nums pointer-coarse:h-16";
const hasSecretError = computed(() => Boolean(fe.value.secret ?? form.error.value));
</script>

<template>
  <div
    ref="rootRef"
    data-slot="lock-screen"
    :data-reason="reason"
    :data-method="method"
    :aria-busy="pending || undefined"
    :class="cn('relative isolate flex min-h-dvh flex-col overflow-hidden bg-muted text-foreground', props.class)"
  >
    <div aria-hidden="true" data-slot="lock-screen-wallpaper" class="absolute inset-0 -z-10">
      <slot name="wallpaper" />
      <div class="absolute inset-0 bg-background/55 backdrop-blur-sm" />
    </div>

    <div v-if="showClock" data-slot="lock-screen-clock" class="flex flex-col items-center gap-1 px-4 pt-10 text-center sm:pt-14">
      <time dir="ltr" class="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground">{{ time || " " }}</time>
      <p class="text-body text-muted-foreground first-letter:uppercase">{{ date || " " }}</p>
    </div>

    <main class="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <div v-if="$slots.mark" data-slot="lock-screen-mark"><slot name="mark" /></div>
      <div v-else-if="showMark" data-slot="lock-screen-mark"><NqProductMark :size="28" title="" /></div>
      <div class="flex flex-col items-center gap-2">
        <NqAvatar :name="user.name" :src="user.avatar" size="lg" />
        <div class="flex flex-col gap-0.5">
          <h1 class="text-h3 text-foreground">{{ user.name }}</h1>
          <p v-if="user.email" dir="ltr" class="text-caption text-muted-foreground">{{ user.email }}</p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-1">
        <p class="inline-flex items-center gap-1.5 text-label text-foreground">
          <BellOff v-if="reason === 'quiet'" aria-hidden="true" class="size-4" />
          <LockKeyhole v-else aria-hidden="true" class="size-4" />
          {{ title }}
        </p>
        <p class="text-body-sm text-muted-foreground">{{ description }}</p>
      </div>

      <div class="flex w-full flex-col items-center gap-4" @keydown="onKeyDown">
        <div
          v-if="method === 'pin'"
          data-slot="lock-screen-pad"
          role="group"
          :aria-label="t.pinGroup"
          tabindex="0"
          dir="ltr"
          class="flex w-full max-w-64 flex-col items-center gap-5 rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-nq-focus"
        >
          <div class="flex gap-3" aria-hidden="true" :data-invalid="Boolean(message) || undefined">
            <span
              v-for="i in pinLength"
              :key="i"
              :data-filled="i - 1 < pin.length || undefined"
              :class="
                cn(
                  'size-3 rounded-full border transition-colors duration-150 ease-nq motion-reduce:transition-none',
                  i - 1 < pin.length ? 'border-transparent bg-foreground' : 'border-nq-line-strong bg-transparent',
                  message && 'border-nq-danger',
                  message && i - 1 < pin.length && 'bg-nq-danger',
                )
              "
            />
          </div>
          <span role="status" class="sr-only">{{ fill(t.entered, { count: pin.length, length: pinLength }) }}</span>
          <div class="grid w-full grid-cols-3 gap-2">
            <NqButton v-for="key in PIN_KEYS" :key="key" type="button" variant="secondary" tabindex="-1" :aria-label="fill(t.digit, { digit: key })" :disabled="pending || locked" :class="keyClass" @click="pressKey(key)">{{ key }}</NqButton>
            <span aria-hidden="true" />
            <NqButton type="button" variant="secondary" tabindex="-1" :aria-label="fill(t.digit, { digit: '0' })" :disabled="pending || locked" :class="keyClass" @click="pressKey('0')">0</NqButton>
            <NqButton type="button" variant="ghost" tabindex="-1" :aria-label="t.backspace" :disabled="pending || locked || pin.length === 0" :class="keyClass" @click="backspace()">
              <Delete aria-hidden="true" class="size-5" />
            </NqButton>
          </div>
        </div>

        <form
          v-if="method === 'password'"
          ref="formRef"
          novalidate
          data-slot="lock-screen-password"
          class="flex w-full flex-col gap-3 text-start"
          @submit.prevent="form.submit({ method: 'password', secret: password, code: requireCode ? code : undefined })"
        >
          <NqField name="secret" :invalid="hasSecretError">
            <NqFieldLabel>{{ t.passwordLabel }}</NqFieldLabel>
            <NqPasswordInput
              v-model="password"
              name="secret"
              auto-focus
              autocomplete="current-password"
              :disabled="locked"
              :aria-invalid="hasSecretError ? true : undefined"
              @update:model-value="
                () => {
                  form.clear('secret');
                  if (form.error.value) form.error.value = undefined;
                }
              "
            />
          </NqField>
          <div v-if="requireCode" class="flex flex-col items-center gap-2">
            <span class="self-start text-label text-foreground">{{ t.codeLabel }}</span>
            <NqOtpInput
              v-model="code"
              name="code"
              :length="6"
              :disabled="locked"
              :invalid="Boolean(fe.code)"
              :aria-label="t.codeLabel"
              :get-box-label="(i: number, n: number) => fill(t.box, { index: i + 1, length: n })"
              @update:model-value="form.clear('code')"
            />
          </div>
          <NqButton type="submit" variant="primary" size="lg" :loading="pending" :disabled="locked">{{ t.unlock }}</NqButton>
        </form>

        <div v-if="method === 'biometric'" data-slot="lock-screen-biometric" class="flex flex-col items-center gap-3">
          <span class="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
            <Fingerprint aria-hidden="true" class="size-10" />
          </span>
          <p class="text-body-sm text-muted-foreground">{{ pending ? t.biometricPrompt : t.biometricHint }}</p>
          <NqButton variant="primary" size="lg" :loading="pending" :disabled="locked" @click="form.submit({ method: 'biometric', secret: '' })">{{ t.biometric }}</NqButton>
        </div>

        <div v-if="method === 'passkey'" data-slot="lock-screen-passkey" class="flex flex-col items-center gap-3">
          <span class="inline-flex size-20 items-center justify-center rounded-full border border-border bg-card text-foreground">
            <KeyRound aria-hidden="true" class="size-10" />
          </span>
          <p class="text-body-sm text-muted-foreground">{{ pending ? t.passkeyPrompt : t.passkeyHint }}</p>
          <NqButton variant="primary" size="lg" :loading="pending" :disabled="locked" @click="form.submit({ method: 'passkey', secret: '' })">{{ t.passkey }}</NqButton>
        </div>

        <div class="min-h-5 w-full" aria-live="polite">
          <p v-if="message && method !== 'password'" role="alert" class="text-caption text-nq-danger-text">{{ message }}</p>
          <NqAlert v-if="message && method === 'password'" tone="danger">{{ message }}</NqAlert>
        </div>
      </div>

      <div v-if="others.length" class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <NqButton v-for="m in others" :key="m" type="button" variant="link" size="sm" :disabled="pending" @click="switchMethod(m)">
          <component :is="otherIcon[m]" aria-hidden="true" />
          {{ otherLabel[m] }}
        </NqButton>
      </div>

      <NqDropdownMenu v-if="onSwitchAccount">
        <NqDropdownMenuTrigger as-child>
          <NqButton type="button" variant="link" size="sm" :disabled="pending" data-slot="lock-screen-switch">
            <UserPlus aria-hidden="true" />
            {{ t.switchAccount }}
            <ChevronDown aria-hidden="true" />
          </NqButton>
        </NqDropdownMenuTrigger>
        <NqDropdownMenuContent side="top" align="center" class="w-64" :aria-label="t.switchAccountMenu">
          <NqDropdownMenuItem v-for="account in accounts ?? []" :key="account.email ?? account.name" @select="onSwitchAccount(account)">
            <NqAvatar :name="account.name" :src="account.avatar" size="sm" />
            <span class="flex min-w-0 flex-col text-start">
              <span class="truncate text-label">{{ account.name }}</span>
              <bdi v-if="account.email" dir="ltr" class="truncate text-caption text-muted-foreground">{{ account.email }}</bdi>
            </span>
          </NqDropdownMenuItem>
          <NqDropdownMenuSeparator v-if="accounts?.length" />
          <NqDropdownMenuItem @select="onSwitchAccount(null)">
            <UserPlus />
            {{ t.anotherAccount }}
          </NqDropdownMenuItem>
        </NqDropdownMenuContent>
      </NqDropdownMenu>
      <NqButton v-if="onSignOut" type="button" variant="link" size="sm" :disabled="pending" @click="onSignOut()">{{ t.signOut }}</NqButton>
    </main>
    <div v-if="$slots.footer" class="px-4 pb-4 text-center text-caption text-muted-foreground"><slot name="footer" /></div>
  </div>
</template>
