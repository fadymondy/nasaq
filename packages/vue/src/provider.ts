// NasaqProvider for Vue: writes lang, dir, data-theme, data-brand, data-density and data-expression to <html>
// (or a wrapping <div> with target="scope"), exactly like the React provider, so tokens.css and the Tailwind theme follow.

import { dirOf } from "./lib/locale";
import { defaultCurrency } from "./lib/money";
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watchEffect,
  type ComputedRef,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue";

export type ThemePreference = "light" | "dark" | "system";
export type ThemeName = "light" | "dark";
export type Direction = "ltr" | "rtl";

export interface NasaqContext {
  brand: ComputedRef<string>;
  theme: ComputedRef<ThemePreference>;
  resolvedTheme: ComputedRef<ThemeName>;
  setTheme(theme: ThemePreference): void;
  locale: ComputedRef<string>;
  setLocale(locale: string): void;
  direction: ComputedRef<Direction>;
  isRtl: ComputedRef<boolean>;
  /** The provider's currency; USD, or SAR in Arabic, when not set. */
  currency: ComputedRef<string>;
}

export const NASAQ_KEY: InjectionKey<NasaqContext> = Symbol("nasaq");
const THEME_KEY = "nq-theme";

export const NasaqProvider = defineComponent({
  name: "NasaqProvider",
  props: {
    /** A registered brand key (nasaq, yes-delivery, …). */
    brand: { type: String, default: "nasaq" },
    /** v-model:theme. Omit to let the provider own it (persisted in localStorage). */
    theme: { type: String as PropType<ThemePreference>, default: undefined },
    defaultTheme: { type: String as PropType<ThemePreference>, default: "system" },
    /** v-model:locale. Omit to let the provider own it. */
    locale: { type: String, default: undefined },
    defaultLocale: { type: String, default: "en" },
    /** Defaults to the locale's direction (rtl for Arabic). */
    direction: { type: String as PropType<Direction>, default: undefined },
    density: { type: String as PropType<"compact" | "comfortable">, default: "compact" },
    expression: { type: String as PropType<"grid" | "native">, default: "grid" },
    /** ISO 4217 code for every money component below. Defaults to USD, or SAR in Arabic. */
    currency: { type: String, default: undefined },
    /** document: attributes on <html> (apps). scope: a wrapping <div> (embeds, previews). */
    target: { type: String as PropType<"document" | "scope">, default: "document" },
  },
  emits: ["update:theme", "update:locale"],
  setup(props, { slots, emit }) {
    const storedTheme = ref<ThemePreference>(props.defaultTheme);
    const storedLocale = ref(props.defaultLocale);
    const system = ref<ThemeName>("light");

    const theme = computed(() => props.theme ?? storedTheme.value);
    const locale = computed(() => props.locale ?? storedLocale.value);
    const lang = computed(() => locale.value.split("-")[0] ?? "en");
    const direction = computed<Direction>(() => props.direction ?? dirOf(lang.value));
    const resolvedTheme = computed<ThemeName>(() => (theme.value === "system" ? system.value : theme.value));
    const currency = computed(() => props.currency ?? defaultCurrency(locale.value));

    const attrs = computed(() => ({
      "data-brand": props.brand,
      "data-theme": resolvedTheme.value,
      "data-density": props.density,
      "data-expression": props.expression,
      dir: direction.value,
      lang: lang.value,
    }));

    let mq: MediaQueryList | null = null;
    const onScheme = () => (system.value = mq?.matches ? "dark" : "light");
    onMounted(() => {
      if (props.theme === undefined) {
        try {
          const saved = localStorage.getItem(THEME_KEY);
          if (saved === "light" || saved === "dark" || saved === "system") storedTheme.value = saved;
        } catch {
          // storage blocked: keep the default
        }
      }
      if (typeof matchMedia === "function") {
        mq = matchMedia("(prefers-color-scheme: dark)");
        onScheme();
        mq.addEventListener("change", onScheme);
      }
      watchEffect(() => {
        if (props.target !== "document") return;
        const el = document.documentElement;
        for (const [k, v] of Object.entries(attrs.value)) el.setAttribute(k, v);
        el.classList.toggle("dark", resolvedTheme.value === "dark");
        el.style.colorScheme = resolvedTheme.value;
      });
    });
    onBeforeUnmount(() => mq?.removeEventListener("change", onScheme));

    const ctx: NasaqContext = {
      brand: computed(() => props.brand),
      theme,
      resolvedTheme,
      setTheme(next) {
        if (props.theme === undefined) {
          storedTheme.value = next;
          try {
            localStorage.setItem(THEME_KEY, next);
          } catch {
            // storage blocked
          }
        }
        emit("update:theme", next);
      },
      locale,
      setLocale(next) {
        if (props.locale === undefined) storedLocale.value = next;
        emit("update:locale", next);
      },
      direction,
      isRtl: computed(() => direction.value === "rtl"),
      currency,
    };
    provide(NASAQ_KEY, ctx);

    return () =>
      props.target === "scope"
        ? h("div", { ...attrs.value, class: resolvedTheme.value === "dark" ? "dark" : undefined }, slots.default?.())
        : slots.default?.();
  },
});

/** The provider context. Outside a provider it falls back to the document's lang and dir. */
export function useNasaq(): NasaqContext {
  const ctx = inject(NASAQ_KEY, null);
  if (ctx) return ctx;
  const lang = typeof document !== "undefined" ? document.documentElement.lang || "en" : "en";
  const fixed = <T>(v: T) => computed(() => v);
  return {
    brand: fixed("nasaq"),
    theme: fixed<ThemePreference>("system"),
    resolvedTheme: fixed<ThemeName>("light"),
    setTheme() {},
    locale: fixed(lang),
    setLocale() {},
    direction: fixed(dirOf(lang)),
    isRtl: fixed(dirOf(lang) === "rtl"),
    currency: fixed(defaultCurrency(lang)),
  };
}

/** Resolves a component's currency prop: the prop, else the provider's, else USD (SAR in Arabic). */
export function useCurrency(currency?: Ref<string | undefined> | (() => string | undefined)): ComputedRef<string> {
  const ctx = useNasaq();
  return computed(() => {
    const own = typeof currency === "function" ? currency() : currency?.value;
    return own ?? ctx.currency.value;
  });
}

/** Picks the English or Arabic built-in label by the provider (or document) locale: t("Close", "إغلاق"). */
export function useT(): (en: string, ar: string) => string {
  const ctx = useNasaq();
  return (en, ar) => (ctx.locale.value.startsWith("ar") ? ar : en);
}
