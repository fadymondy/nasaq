<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout";
import { NqLoginForm, type LoginValues } from "../login-form";
import { NqProductMark } from "../product-mark";
import { STRINGS, type DesktopLoginScreenLabels, type DesktopPowerAction } from "./strings";

// A desktop OS sign-in screen: wallpaper, a big clock with a greeting, and a card with the mark, the name and the Nasaq
// NqLoginForm. For a signed-in person coming back, use NqLockScreen instead.
// Slots: default (replaces the form), wallpaper, mark, title, description, footer.
interface Props {
  /** Signs in. Same contract as `NqLoginForm`: resolve with nothing, or `{ error, fieldErrors }`. Not needed with the default slot. */
  onSubmit?: (values: LoginValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Any other `NqLoginForm` prop: passkeys, providers, forgot password, labels. */
  formProps?: Record<string, unknown>;
  /** The product or machine name on the card. Default "Sign in". */
  title?: string;
  description?: string;
  /** Show the product mark on the card (the `mark` slot replaces it). Default true. */
  showMark?: boolean;
  /** Show the clock, the date and a greeting. Default true. */
  showClock?: boolean;
  /** Freeze the clock at this time (docs, tests). Default: now, ticking. */
  now?: Date | number | string;
  /** Round buttons at the bottom: sleep, restart, shut down. Omit for none. */
  powerActions?: readonly DesktopPowerAction[];
  labels?: DesktopLoginScreenLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onSubmit: undefined, formProps: undefined, title: undefined, description: undefined, showMark: true, showClock: true, now: undefined, powerActions: undefined, labels: undefined });
defineSlots<{
  default?: () => unknown;
  wallpaper?: () => unknown;
  mark?: () => unknown;
  title?: () => unknown;
  description?: () => unknown;
  footer?: () => unknown;
}>();

const { locale: nasaqLocale } = useNasaq();
const authLocale = useAuthLocale();
const t = computed(() => ({ ...STRINGS[authLocale.value], ...props.labels }));
const lang = computed(() => String(nasaqLocale.value));

const clock = ref<number | null>(props.now === undefined ? null : new Date(props.now).getTime());
let timer: ReturnType<typeof setInterval> | undefined;
function startClock() {
  clearInterval(timer);
  if (props.now !== undefined) {
    clock.value = new Date(props.now).getTime();
    return;
  }
  clock.value = Date.now();
  timer = setInterval(() => (clock.value = Date.now()), 1000);
}
onMounted(startClock);
watch(() => props.now, startClock);
onBeforeUnmount(() => clearInterval(timer));

const hour = computed(() => (clock.value === null ? 12 : new Date(clock.value).getHours()));
const greeting = computed(() => (hour.value < 12 ? t.value.morning : hour.value < 18 ? t.value.afternoon : t.value.evening));
const time = computed(() => (clock.value === null ? "" : new Intl.DateTimeFormat(lang.value, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(clock.value)));
const date = computed(() => (clock.value === null ? "" : new Intl.DateTimeFormat(lang.value, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(clock.value)));
</script>

<template>
  <div data-slot="desktop-login-screen" :class="cn('relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-muted px-4 text-foreground', props.class)">
    <div aria-hidden="true" data-slot="desktop-login-screen-wallpaper" class="absolute inset-0 -z-10">
      <slot name="wallpaper" />
      <div class="absolute inset-0 bg-background/55 backdrop-blur-sm" />
    </div>

    <main class="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 py-10">
      <div v-if="showClock" data-slot="desktop-login-screen-clock" class="flex flex-col items-center gap-1 text-center">
        <p class="text-label tracking-wide text-muted-foreground uppercase">{{ clock === null ? " " : greeting }}</p>
        <time dir="ltr" class="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground">{{ time || " " }}</time>
        <p class="text-body text-muted-foreground first-letter:uppercase">{{ date || " " }}</p>
      </div>

      <section aria-labelledby="desktop-login-title" data-slot="desktop-login-screen-card" class="flex w-full flex-col gap-6 rounded-card border border-border bg-card/90 p-6 text-card-foreground backdrop-blur-md">
        <header class="flex flex-col items-center gap-3 text-center">
          <div v-if="$slots.mark" data-slot="desktop-login-screen-mark"><slot name="mark" /></div>
          <div v-else-if="showMark" data-slot="desktop-login-screen-mark"><NqProductMark :size="40" title="" /></div>
          <div class="flex flex-col gap-0.5">
            <h1 id="desktop-login-title" class="text-h3 text-foreground"><slot name="title">{{ title ?? t.signIn }}</slot></h1>
            <p v-if="description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ description }}</slot></p>
          </div>
        </header>
        <slot>
          <NqLoginForm v-if="onSubmit" v-bind="formProps" :on-submit="onSubmit" />
        </slot>
        <div v-if="$slots.footer" class="text-center text-body-sm text-muted-foreground"><slot name="footer" /></div>
      </section>
    </main>

    <nav v-if="powerActions?.length" :aria-label="t.power" data-slot="desktop-login-screen-power" class="flex items-center gap-4 pb-8">
      <button
        v-for="action in powerActions"
        :key="action.id"
        type="button"
        :aria-label="action.label"
        :title="action.label"
        class="grid size-10 place-items-center rounded-full border border-border bg-card/70 text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="action.onSelect()"
      >
        <component :is="action.icon" aria-hidden="true" class="size-4" />
      </button>
    </nav>
  </div>
</template>
