import { computed, reactive, ref } from "vue";
import { toast } from "../toast";
import type { CommerceCartLine } from "./commerce";
import {
  type CartNewLine,
  type CartRemoval,
  cartActiveLines,
  cartAdd,
  cartCount,
  cartFixOverStock,
  cartMoveToCart,
  cartRemove,
  cartRestore,
  cartSaveForLater,
  cartSavedLines,
  cartSetQuantity,
} from "./cart-logic";
import { type StoreCartLabels, useStoreCartStrings } from "./strings";

/** What happens after `add`: open the mini cart, show a toast (needs a mounted NqToaster), both, or nothing. */
export type StoreCartFeedback = "drawer" | "toast" | "both" | "none";

export interface UseStoreCartOptions {
  initialLines?: readonly CommerceCartLine[];
  feedback?: StoreCartFeedback;
  labels?: StoreCartLabels;
  /** Called after every change with the new lines, to persist the cart. */
  onChange?: (lines: CommerceCartLine[]) => void;
}

/** A sentence for the aria-live region. `id` changes on every announcement so the same words are read again. */
export interface StoreCartMessage {
  id: number;
  text: string;
}

/**
 * Cart state for a storefront: add, quantity (clamped to stock), remove with undo, save for later, the mini-cart
 * drawer and the sentence to announce for each change. It wraps the pure `cart-logic` functions; wire your server or
 * local storage through `onChange`. The result is reactive: use `cart.lines`, `cart.drawerOpen` (also with
 * `v-model:open`) and `cart.message` directly in a template.
 */
export function useStoreCart({ initialLines = [], feedback = "drawer", labels, onChange }: UseStoreCartOptions = {}) {
  const { t, n } = useStoreCartStrings(() => labels);
  const lines = ref<CommerceCartLine[]>([...initialLines]);
  const removed = ref<CartRemoval | undefined>();
  const drawerOpen = ref(false);
  const message = ref<StoreCartMessage>({ id: 0, text: "" });
  let counter = 0;

  const commit = (next: CommerceCartLine[]) => {
    lines.value = next;
    onChange?.(next);
  };
  const say = (text: string) => {
    counter += 1;
    message.value = { id: counter, text };
  };
  const nameOf = (id: string) => lines.value.find((l) => l.id === id)?.name ?? "";

  const add = (item: CartNewLine, quantity = 1) => {
    const result = cartAdd(lines.value, item, quantity);
    commit(result.lines);
    removed.value = undefined;
    say(result.clamped ? t.value.live.clamped(item.name, n(result.quantity)) : t.value.live.added(item.name, n(result.quantity)));
    if (feedback === "drawer" || feedback === "both") drawerOpen.value = true;
    if (feedback === "toast" || feedback === "both") {
      toast.success(t.value.toastAdded(item.name), { action: { label: t.value.toastView, onClick: () => (drawerOpen.value = true) } });
    }
    return result;
  };

  const setQuantity = (lineId: string, quantity: number) => {
    const name = nameOf(lineId);
    const result = cartSetQuantity(lines.value, lineId, quantity);
    if (result.changed) commit(result.lines);
    if (result.changed || result.clamped) say(result.clamped ? t.value.live.clamped(name, n(result.quantity)) : t.value.live.quantity(name, n(result.quantity)));
    return result;
  };

  const remove = (lineId: string) => {
    const name = nameOf(lineId);
    const result = cartRemove(lines.value, lineId);
    if (!result.removed) return;
    commit(result.lines);
    removed.value = result.removed;
    say(t.value.live.removed(name));
  };

  const undo = () => {
    const last = removed.value;
    if (!last) return;
    commit(cartRestore(lines.value, last));
    say(t.value.live.restored(last.line.name));
    removed.value = undefined;
  };

  const saveForLater = (lineId: string) => {
    const name = nameOf(lineId);
    commit(cartSaveForLater(lines.value, lineId));
    say(t.value.live.saved(name));
  };

  const moveToCart = (lineId: string) => {
    const name = nameOf(lineId);
    commit(cartMoveToCart(lines.value, lineId));
    say(t.value.live.moved(name));
  };

  return reactive({
    lines,
    active: computed(() => cartActiveLines(lines.value)),
    saved: computed(() => cartSavedLines(lines.value)),
    count: computed(() => cartCount(lines.value)),
    add,
    setQuantity,
    remove,
    undo,
    /** The last removed line, until it is undone or dismissed. */
    removed,
    dismissRemoved: () => {
      removed.value = undefined;
    },
    saveForLater,
    moveToCart,
    fixStock: () => commit(cartFixOverStock(lines.value)),
    replace: (next: readonly CommerceCartLine[]) => commit([...next]),
    drawerOpen,
    setDrawerOpen: (open: boolean) => {
      drawerOpen.value = open;
    },
    message,
    announce: say,
  });
}

export type StoreCartController = ReturnType<typeof useStoreCart>;
