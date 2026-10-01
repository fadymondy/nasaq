// Dialog, menu, tooltip and toast. They reuse the vanilla behaviours from @fadymondy/nasaq/html,
// so focus, keyboard and RTL rules are the same in every framework.

import { dialog as bindDialog, menu as bindMenu, toast, tooltip as bindTooltip, type ToastOptions } from "@nasaq/html";
import { defineComponent, h, onBeforeUnmount, onMounted, ref, useId, watch, type PropType } from "vue";
import { useNasaq } from "../provider";

/** Modal on the native <dialog>: v-model:open. Slots: default (body), footer. */
export const NqDialog = defineComponent({
  name: "NqDialog",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    description: { type: String, default: undefined },
    size: { type: String as PropType<"sm" | "md" | "lg">, default: "md" },
    /** "sheet" slides in from the end edge. */
    variant: { type: String as PropType<"dialog" | "sheet">, default: "dialog" },
    /** Close on a backdrop click. Escape always closes. */
    dismissible: { type: Boolean, default: true },
    closeLabel: { type: String, default: undefined },
  },
  emits: ["update:open", "close"],
  setup(props, { emit, slots }) {
    const el = ref<HTMLDialogElement | null>(null);
    const id = `nq-dialog-${useId()}`;
    const ctx = useNasaq();
    let unbind: (() => void) | undefined;
    const sync = (open: boolean) => {
      const d = el.value;
      if (!d) return;
      if (open && !d.open) d.showModal();
      else if (!open && d.open) d.close();
    };
    onMounted(() => {
      if (!el.value) return;
      unbind = bindDialog(el.value);
      el.value.addEventListener("close", () => {
        emit("update:open", false);
        emit("close");
      });
      sync(props.open);
    });
    watch(() => props.open, sync);
    onBeforeUnmount(() => unbind?.());
    return () =>
      h(
        "dialog",
        {
          ref: el,
          class: "nq-dialog",
          "data-size": props.size === "md" ? undefined : props.size,
          "data-variant": props.variant === "sheet" ? "sheet" : undefined,
          "data-dismissible": props.dismissible ? undefined : "false",
          "aria-labelledby": `${id}-title`,
          "aria-describedby": props.description ? `${id}-desc` : undefined,
        },
        [
          h("div", { class: "nq-dialog-header" }, [
            h("h2", { class: "nq-dialog-title", id: `${id}-title` }, props.title),
            props.description ? h("p", { class: "nq-dialog-description", id: `${id}-desc` }, props.description) : null,
          ]),
          slots.default?.(),
          slots.footer ? h("div", { class: "nq-dialog-footer" }, slots.footer()) : null,
          h(
            "button",
            {
              type: "button",
              class: "nq-dialog-close",
              "aria-label": props.closeLabel ?? (ctx.locale.value.startsWith("ar") ? "إغلاق" : "Close"),
              onClick: () => emit("update:open", false),
            },
            "×",
          ),
        ],
      );
  },
});

export interface MenuItem {
  label: string;
  /** Called when chosen. */
  onSelect?: () => void;
  href?: string;
  variant?: "danger";
  disabled?: boolean;
  /** Renders a separator instead of an item. */
  separator?: boolean;
}

/** Dropdown menu. Slot `trigger` receives nothing; give it a NqButton. Items come from the `items` prop or the default slot. */
export const NqMenu = defineComponent({
  name: "NqMenu",
  props: {
    items: { type: Array as PropType<MenuItem[]>, default: () => [] },
    label: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const id = `nq-menu-${useId()}`;
    const wrap = ref<HTMLElement | null>(null);
    let unbind: (() => void) | undefined;
    onMounted(() => {
      const target = wrap.value?.querySelector<HTMLElement>("[data-nq-menu-trigger] > *");
      if (!target) return;
      target.setAttribute("aria-controls", id);
      unbind = bindMenu(target).destroy;
    });
    onBeforeUnmount(() => unbind?.());
    return () =>
      h("div", { ref: wrap, style: { display: "inline-block" } }, [
        h("span", { "data-nq-menu-trigger": "", style: { display: "contents" } }, slots.trigger?.()),
        h("div", { class: "nq-menu", id, role: "menu", "aria-label": props.label, hidden: true }, [
          ...props.items.map((item) =>
            item.separator
              ? h("div", { class: "nq-menu-separator", role: "separator" })
              : h(
                  item.href ? "a" : "button",
                  {
                    class: "nq-menu-item",
                    role: "menuitem",
                    href: item.href,
                    type: item.href ? undefined : "button",
                    tabindex: -1,
                    disabled: item.href ? undefined : item.disabled,
                    "aria-disabled": item.disabled ? "true" : undefined,
                    "data-variant": item.variant,
                    onClick: () => item.onSelect?.(),
                  },
                  item.label,
                ),
          ),
          slots.default?.(),
        ]),
      ]);
  },
});

/** Tooltip on its single child. Keep an aria-label on icon-only buttons; the tooltip only adds a description. */
export const NqTooltip = defineComponent({
  name: "NqTooltip",
  props: {
    content: { type: String, required: true },
    side: { type: String as PropType<"top" | "bottom">, default: "top" },
  },
  setup(props, { slots }) {
    const wrap = ref<HTMLElement | null>(null);
    let unbind: (() => void) | undefined;
    onMounted(() => {
      const target = wrap.value?.firstElementChild as HTMLElement | null;
      if (!target) return;
      target.dataset.nqTooltip = props.content;
      target.dataset.side = props.side;
      unbind = bindTooltip(target);
    });
    watch(
      () => props.content,
      (v) => {
        const target = wrap.value?.firstElementChild as HTMLElement | null;
        if (target) target.dataset.nqTooltip = v;
      },
    );
    onBeforeUnmount(() => unbind?.());
    return () => h("span", { ref: wrap, style: { display: "contents" } }, slots.default?.());
  },
});

/** Shows toasts in the shared polite region. */
export function useToast() {
  return {
    toast: (options: ToastOptions | string) => toast(options),
    success: (title: string, description?: string) => toast({ title, description, tone: "success" }),
    error: (title: string, description?: string) => toast({ title, description, tone: "danger" }),
  };
}
