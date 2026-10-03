import { Comment, Fragment, Text, type VNode } from "vue";

/** A slot's vnodes with fragments (v-for, template) expanded and comments dropped: React's `Children.toArray`. */
export function flattenSlot(nodes: VNode[] | undefined): VNode[] {
  const out: VNode[] = [];
  for (const node of nodes ?? []) {
    if (node.type === Fragment && Array.isArray(node.children)) out.push(...flattenSlot(node.children as VNode[]));
    else if (node.type !== Comment) out.push(node);
  }
  return out;
}

/** The text of a slot that holds only text, else undefined: React's `typeof children === "string"`. */
export function slotText(nodes: VNode[] | undefined): string | undefined {
  const flat = flattenSlot(nodes);
  if (!flat.length || !flat.every((n) => n.type === Text)) return undefined;
  return flat.map((n) => String(n.children)).join("").trim() || undefined;
}

/** A boolean prop as written on a raw vnode: `<NqAppNavItem active>` gives "", `:active="false"` gives false. */
export function isOn(value: unknown): boolean {
  return value !== undefined && value !== null && value !== false;
}

/** Renders vnodes that were pulled out of a slot. */
export const RenderNodes = (props: { nodes: VNode[] }) => props.nodes;
RenderNodes.props = ["nodes"];
