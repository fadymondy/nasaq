// Tabs, accordion, breadcrumb, pagination, table.

import { computed, defineComponent, h, inject, provide, ref, useId, type InjectionKey, type PropType, type Ref } from "vue";
import { useNasaq } from "../provider";

interface TabsContext {
  active: Ref<string>;
  select(v: string): void;
  base: string;
}
const TABS_KEY: InjectionKey<TabsContext> = Symbol("nq-tabs");

/** v-model is the active tab value. */
export const NqTabs = defineComponent({
  name: "NqTabs",
  props: {
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit, slots }) {
    const own = ref(props.defaultValue);
    const active = computed({
      get: () => props.modelValue ?? own.value,
      set: (v: string) => {
        own.value = v;
        emit("update:modelValue", v);
      },
    });
    provide(TABS_KEY, { active, select: (v) => (active.value = v), base: `nq-tabs-${useId()}` });
    return () => h("div", slots.default?.());
  },
});

export const NqTabsList = defineComponent({
  name: "NqTabsList",
  props: { variant: { type: String as PropType<"default" | "underline">, default: "default" }, label: { type: String, default: undefined } },
  setup(props, { slots }) {
    const ctx = inject(TABS_KEY)!;
    const nasaq = useNasaq();
    const onKeydown = (e: KeyboardEvent) => {
      const list = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)'));
      const i = list.indexOf(document.activeElement as HTMLElement);
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      let to: HTMLElement | undefined;
      if (step) to = list[(i + (nasaq.isRtl.value ? -step : step) + list.length) % list.length];
      else if (e.key === "Home") to = list[0];
      else if (e.key === "End") to = list[list.length - 1];
      if (!to) return;
      e.preventDefault();
      ctx.select(to.dataset.value ?? "");
      to.focus();
    };
    return () =>
      h(
        "div",
        { class: "nq-tabs-list", role: "tablist", "aria-label": props.label, "data-variant": props.variant === "underline" ? "underline" : undefined, onKeydown },
        slots.default?.(),
      );
  },
});

export const NqTabsTrigger = defineComponent({
  name: "NqTabsTrigger",
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false } },
  setup(props, { slots }) {
    const ctx = inject(TABS_KEY)!;
    return () => {
      const on = ctx.active.value === props.value;
      return h(
        "button",
        {
          type: "button",
          class: "nq-tabs-trigger",
          role: "tab",
          id: `${ctx.base}-tab-${props.value}`,
          "aria-controls": `${ctx.base}-panel-${props.value}`,
          "aria-selected": String(on),
          tabindex: on ? 0 : -1,
          disabled: props.disabled,
          "data-value": props.value,
          onClick: () => ctx.select(props.value),
        },
        slots.default?.(),
      );
    };
  },
});

export const NqTabsPanel = defineComponent({
  name: "NqTabsPanel",
  props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    const ctx = inject(TABS_KEY)!;
    return () =>
      h(
        "div",
        {
          class: "nq-tabs-panel",
          role: "tabpanel",
          id: `${ctx.base}-panel-${props.value}`,
          "aria-labelledby": `${ctx.base}-tab-${props.value}`,
          tabindex: 0,
          hidden: ctx.active.value !== props.value,
        },
        ctx.active.value === props.value ? slots.default?.() : undefined,
      );
  },
});

/** Native <details>; items with the same `name` close each other (exclusive accordion). */
export const NqAccordionItem = defineComponent({
  name: "NqAccordionItem",
  props: {
    title: { type: String, required: true },
    open: { type: Boolean, default: false },
    /** Shared group name: opening one closes the others. */
    name: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h("details", { class: "nq-accordion", open: props.open, name: props.name }, [
        h("summary", props.title),
        h("div", { class: "nq-accordion-content" }, slots.default?.()),
      ]);
  },
});

export interface Crumb {
  label: string;
  href?: string;
}

export const NqBreadcrumb = defineComponent({
  name: "NqBreadcrumb",
  props: { items: { type: Array as PropType<Crumb[]>, required: true } },
  setup(props) {
    const ctx = useNasaq();
    return () =>
      h("nav", { "aria-label": ctx.locale.value.startsWith("ar") ? "مسار التنقل" : "Breadcrumb" }, [
        h(
          "ol",
          { class: "nq-breadcrumb" },
          props.items.map((c, i) =>
            h("li", i === props.items.length - 1 ? h("span", { "aria-current": "page" }, c.label) : c.href ? h("a", { href: c.href }, c.label) : c.label),
          ),
        ),
      ]);
  },
});

/** v-model is the 1-based page. Shows first, last and a window around the current page. */
export const NqPagination = defineComponent({
  name: "NqPagination",
  props: {
    modelValue: { type: Number, required: true },
    pageCount: { type: Number, required: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const ctx = useNasaq();
    const pages = computed(() => {
      const n = props.pageCount;
      const cur = props.modelValue;
      const out: (number | "gap")[] = [];
      for (let p = 1; p <= n; p++) {
        if (p === 1 || p === n || Math.abs(p - cur) <= 1) out.push(p);
        else if (out[out.length - 1] !== "gap") out.push("gap");
      }
      return out;
    });
    const go = (p: number) => p >= 1 && p <= props.pageCount && emit("update:modelValue", p);
    return () => {
      const ar = ctx.locale.value.startsWith("ar");
      const link = (label: string, page: number, attrs: Record<string, unknown> = {}) =>
        h("button", { type: "button", class: "nq-pagination-link", onClick: () => go(page), ...attrs }, label);
      return h("nav", { class: "nq-pagination", "aria-label": ar ? "ترقيم الصفحات" : "Pagination" }, [
        link(ar ? "السابق" : "Previous", props.modelValue - 1, { disabled: props.modelValue <= 1 }),
        ...pages.value.map((p) =>
          p === "gap"
            ? h("span", { class: "nq-pagination-link", "aria-hidden": "true" }, "…")
            : link(String(p), p, { "aria-current": p === props.modelValue ? "page" : undefined }),
        ),
        link(ar ? "التالي" : "Next", props.modelValue + 1, { disabled: props.modelValue >= props.pageCount }),
      ]);
    };
  },
});

export interface TableColumn<Row = Record<string, unknown>> {
  key: string;
  label: string;
  numeric?: boolean;
  /** Custom cell text; or use the `cell-<key>` slot for markup. */
  format?: (row: Row) => string;
}

/** A simple data table. Slots: `cell-<key>` ({ row }) and `empty`. */
export const NqTable = defineComponent({
  name: "NqTable",
  props: {
    columns: { type: Array as PropType<TableColumn<any>[]>, required: true },
    rows: { type: Array as PropType<Record<string, unknown>[]>, required: true },
    rowKey: { type: String, default: "id" },
    density: { type: String as PropType<"compact" | "default" | "comfortable">, default: "default" },
    caption: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () =>
      h("div", { class: "nq-table-wrap" }, [
        h("table", { class: "nq-table", "data-density": props.density === "default" ? undefined : props.density }, [
          props.caption ? h("caption", { class: "nq-sr-only" }, props.caption) : null,
          h("thead", [h("tr", props.columns.map((c) => h("th", { scope: "col", "data-numeric": c.numeric ? "" : undefined }, c.label)))]),
          h(
            "tbody",
            props.rows.length
              ? props.rows.map((row, i) =>
                  h(
                    "tr",
                    { key: String(row[props.rowKey] ?? i) },
                    props.columns.map((c) =>
                      h("td", { "data-numeric": c.numeric ? "" : undefined }, slots[`cell-${c.key}`]?.({ row }) ?? (c.format ? c.format(row) : String(row[c.key] ?? ""))),
                    ),
                  ),
                )
              : [h("tr", [h("td", { colspan: props.columns.length }, slots.empty?.())])],
          ),
        ]),
      ]);
  },
});
