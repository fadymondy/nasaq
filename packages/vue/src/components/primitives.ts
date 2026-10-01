// Display primitives: thin Vue wrappers that render the .nq-* classes from @fadymondy/nasaq/html.css.
// Props mirror the React components (variant, size, tone), so a manual written for React reads the same.

import { formatMoney } from "@nasaq/html";
import { computed, defineComponent, h, type PropType } from "vue";
import { useCurrency, useNasaq } from "../provider";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";
export type Tone = "success" | "warning" | "danger" | "info";
export type BadgeVariant = "secondary" | "outline" | "brand" | "accent" | Tone;
export type TagColor = "gray" | "blue" | "green" | "amber" | "orange" | "red" | "pink" | "violet" | "teal";

export const NqButton = defineComponent({
  name: "NqButton",
  props: {
    variant: { type: String as PropType<ButtonVariant>, default: "secondary" },
    size: { type: String as PropType<ButtonSize>, default: "md" },
    /** Render as a link (`href`) or any tag. */
    as: { type: String, default: "button" },
    type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    full: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    return () =>
      h(
        props.as,
        {
          class: "nq-button",
          "data-variant": props.variant,
          "data-size": props.size,
          "data-full": props.full ? "" : undefined,
          type: props.as === "button" ? props.type : undefined,
          disabled: props.as === "button" ? props.disabled || props.loading : undefined,
          "aria-disabled": props.as !== "button" && props.disabled ? "true" : undefined,
          "aria-busy": props.loading ? "true" : undefined,
        },
        [props.loading ? h("span", { class: "nq-spinner", "aria-hidden": "true" }) : null, slots.default?.()],
      );
  },
});

export const NqBadge = defineComponent({
  name: "NqBadge",
  props: {
    variant: { type: String as PropType<BadgeVariant>, default: "secondary" },
    /** A tag colour; overrides variant. */
    tag: { type: String as PropType<TagColor>, default: undefined },
  },
  setup(props, { slots }) {
    return () => h("span", { class: "nq-badge", "data-variant": props.tag ? undefined : props.variant, "data-tag": props.tag }, slots.default?.());
  },
});

function slotted(name: string, tag: string, cls: string) {
  return defineComponent({
    name,
    setup(_, { slots }) {
      return () => h(tag, { class: cls }, slots.default?.());
    },
  });
}

export const NqCard = slotted("NqCard", "div", "nq-card");
export const NqCardHeader = slotted("NqCardHeader", "div", "nq-card-header");
export const NqCardTitle = slotted("NqCardTitle", "h3", "nq-card-title");
export const NqCardDescription = slotted("NqCardDescription", "p", "nq-card-description");
export const NqCardAction = slotted("NqCardAction", "div", "nq-card-action");
export const NqCardContent = slotted("NqCardContent", "div", "nq-card-content");
export const NqCardFooter = slotted("NqCardFooter", "div", "nq-card-footer");
export const NqKbd = slotted("NqKbd", "kbd", "nq-kbd");

export const NqSeparator = defineComponent({
  name: "NqSeparator",
  props: { orientation: { type: String as PropType<"horizontal" | "vertical">, default: "horizontal" } },
  setup(props) {
    return () => h("div", { class: "nq-separator", role: "separator", "aria-orientation": props.orientation, "data-orientation": props.orientation });
  },
});

export const NqSkeleton = defineComponent({
  name: "NqSkeleton",
  setup() {
    return () => h("div", { class: "nq-skeleton", "aria-hidden": "true" });
  },
});

export const NqSpinner = defineComponent({
  name: "NqSpinner",
  props: { label: { type: String, default: undefined } },
  setup(props) {
    const ctx = useNasaq();
    return () => h("span", { class: "nq-spinner", role: "status", "aria-label": props.label ?? (ctx.locale.value.startsWith("ar") ? "جارٍ التحميل" : "Loading") });
  },
});

export const NqAvatar = defineComponent({
  name: "NqAvatar",
  props: {
    src: { type: String, default: undefined },
    /** Full name: used for alt text and the initials fallback. */
    name: { type: String, required: true },
    size: { type: String as PropType<"xs" | "sm" | "md" | "lg">, default: "md" },
    shape: { type: String as PropType<"circle" | "square">, default: "circle" },
  },
  setup(props) {
    const initials = computed(() =>
      props.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase(),
    );
    return () =>
      h(
        "span",
        { class: "nq-avatar", "data-size": props.size === "md" ? undefined : props.size, "data-shape": props.shape === "square" ? "square" : undefined },
        props.src ? h("img", { src: props.src, alt: props.name }) : h("span", { "aria-label": props.name, role: "img" }, initials.value),
      );
  },
});

export const NqProgress = defineComponent({
  name: "NqProgress",
  props: {
    value: { type: Number, required: true },
    max: { type: Number, default: 100 },
    tone: { type: String as PropType<Tone>, default: undefined },
    label: { type: String, default: undefined },
  },
  setup(props) {
    return () => {
      const pct = Math.max(0, Math.min(100, (props.value / props.max) * 100));
      return h(
        "div",
        {
          class: "nq-progress",
          role: "progressbar",
          "aria-valuemin": 0,
          "aria-valuemax": props.max,
          "aria-valuenow": props.value,
          "aria-label": props.label,
          "data-tone": props.tone,
          style: { "--value": `${pct}%` },
        },
        h("span"),
      );
    };
  },
});

export const NqAlert = defineComponent({
  name: "NqAlert",
  props: {
    tone: { type: String as PropType<Tone>, default: "info" },
    title: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h("div", { class: "nq-alert", role: props.tone === "danger" ? "alert" : "status", "data-tone": props.tone }, [
        slots.icon?.(),
        h("div", [
          props.title ? h("p", { class: "nq-alert-title" }, props.title) : null,
          slots.default ? h("div", { class: "nq-alert-description" }, slots.default()) : null,
        ]),
        slots.action?.(),
      ]);
  },
});

export const NqEmpty = defineComponent({
  name: "NqEmpty",
  props: {
    title: { type: String, required: true },
    description: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h("div", { class: "nq-empty" }, [
        slots.icon?.(),
        h("p", { class: "nq-empty-title" }, props.title),
        props.description ? h("p", { class: "nq-empty-description" }, props.description) : null,
        slots.default?.(),
      ]);
  },
});

/** A price. Currency defaults to the provider's: USD, or SAR in Arabic. */
export const NqMoney = defineComponent({
  name: "NqMoney",
  props: {
    amount: { type: Number, required: true },
    currency: { type: String, default: undefined },
    /** The struck-through original price, for discounts. */
    compareAt: { type: Number, default: undefined },
    compact: { type: Boolean, default: false },
  },
  setup(props) {
    const ctx = useNasaq();
    const currency = useCurrency(() => props.currency);
    const fmt = (n: number) => formatMoney(n, { currency: currency.value, locale: ctx.locale.value, compact: props.compact });
    return () =>
      h("span", { class: "nq-price" }, [
        h("span", fmt(props.amount)),
        props.compareAt !== undefined ? h("s", fmt(props.compareAt)) : null,
      ]);
  },
});
