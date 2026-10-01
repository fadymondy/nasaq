import type { Component } from "vue";

/**
 * lucide icons whose meaning follows reading direction. These mirror in RTL; everything else
 * (clocks, checks, media play, brand marks, digits) never does.
 */
export const DIRECTIONAL_ICONS = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUpLeft", "ArrowUpRight", "ArrowDownLeft", "ArrowDownRight",
  "ChevronLeft", "ChevronRight", "ChevronsLeft", "ChevronsRight", "ChevronFirst", "ChevronLast",
  "CornerDownLeft", "CornerDownRight", "CornerUpLeft", "CornerUpRight",
  "Undo", "Undo2", "Redo", "Redo2", "Reply", "ReplyAll", "Forward", "Send", "SendHorizontal",
  "LogIn", "LogOut", "ExternalLink", "SquareArrowOutUpRight", "PanelLeft", "PanelRight",
  "PanelLeftClose", "PanelLeftOpen", "PanelRightClose", "PanelRightOpen", "TextAlignStart", "TextAlignEnd", "ListIndentIncrease", "ListIndentDecrease",
  "ArrowLeftToLine", "ArrowRightToLine", "ArrowLeftFromLine", "ArrowRightFromLine", "ArrowBigLeft", "ArrowBigRight",
  "MoveLeft", "MoveRight", "Indent", "IndentIncrease", "IndentDecrease", "Outdent", "ListStart", "ListEnd",
  "Sidebar", "SidebarOpen", "SidebarClose", "SquareArrowLeft", "SquareArrowRight", "CircleArrowLeft", "CircleArrowRight",
]);

const pascal = (s: string) => s.replace(/(^|-)([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

/** The PascalCase lucide name of an icon component ("arrow-right" or "ArrowRight" in, "ArrowRight" out). */
export function iconName(icon: Component | undefined, name?: string): string {
  if (name) return name.includes("-") || /^[a-z]/.test(name) ? pascal(name) : name;
  const fn = icon as unknown as ((p: object, ctx: object) => { props?: { name?: string } } | null) | undefined;
  const own = (icon as { displayName?: string; name?: string } | undefined)?.displayName || (icon as { name?: string } | undefined)?.name;
  if (own) return pascal(own);
  // lucide-vue-next icons are functional components that render <Icon name="arrow-right" />: ask one for its vnode.
  if (typeof fn === "function") {
    try {
      const vnode = fn({}, { slots: {}, attrs: {}, emit: () => {} });
      if (vnode?.props?.name) return pascal(vnode.props.name);
    } catch {
      // not a functional icon: no name, never mirrored unless `directional` is set
    }
  }
  return "";
}

const OPEN = { ltr: "⁦", rtl: "⁧", auto: "⁨" } as const;

/**
 * The plain-text `NqLtr` / `NqBdi`: wraps `text` in Unicode isolate marks (LRI/RLI/FSI ... PDI) for places that
 * take a string, not markup: `title`, `aria-label`, toasts, `document.title`, `<option>`, notifications.
 * `isolate(sku, "ltr")` for codes and keys, `isolate(name)` (first-strong) for user text.
 */
export function isolate(text: string, dir: "ltr" | "rtl" | "auto" = "auto"): string {
  return `${OPEN[dir]}${text}⁩`;
}
