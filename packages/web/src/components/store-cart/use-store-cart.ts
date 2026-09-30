"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CommerceCartLine } from "../../lib/commerce";
import { toast } from "../toast";
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
import { type StoreCartLabels, useStoreCartStrings } from "./cart-strings";

/** What happens after `add`: open the mini cart, show a toast (needs a mounted Toaster), both, or nothing. */
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
 * local storage through `onChange`.
 */
export function useStoreCart({ initialLines = [], feedback = "drawer", labels, onChange }: UseStoreCartOptions = {}) {
  const { t, n } = useStoreCartStrings(labels);
  const [lines, setLinesState] = useState<CommerceCartLine[]>(() => [...initialLines]);
  const [removed, setRemoved] = useState<CartRemoval | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState<StoreCartMessage>({ id: 0, text: "" });
  const linesRef = useRef(lines);
  const counter = useRef(0);

  const commit = useCallback(
    (next: CommerceCartLine[]) => {
      linesRef.current = next;
      setLinesState(next);
      onChange?.(next);
    },
    [onChange],
  );
  const say = useCallback((text: string) => {
    counter.current += 1;
    setMessage({ id: counter.current, text });
  }, []);

  const nameOf = (id: string) => linesRef.current.find((l) => l.id === id)?.name ?? "";

  const add = useCallback(
    (item: CartNewLine, quantity = 1) => {
      const result = cartAdd(linesRef.current, item, quantity);
      commit(result.lines);
      setRemoved(undefined);
      say(result.clamped ? t.live.clamped(item.name, n(result.quantity)) : t.live.added(item.name, n(result.quantity)));
      if (feedback === "drawer" || feedback === "both") setDrawerOpen(true);
      if (feedback === "toast" || feedback === "both") {
        toast.success(t.toastAdded(item.name), { action: { label: t.toastView, onClick: () => setDrawerOpen(true) } });
      }
      return result;
    },
    [commit, feedback, n, say, t],
  );

  const setQuantity = useCallback(
    (lineId: string, quantity: number) => {
      const name = nameOf(lineId);
      const result = cartSetQuantity(linesRef.current, lineId, quantity);
      if (result.changed) commit(result.lines);
      if (result.changed || result.clamped) say(result.clamped ? t.live.clamped(name, n(result.quantity)) : t.live.quantity(name, n(result.quantity)));
      return result;
    },
    [commit, n, say, t],
  );

  const remove = useCallback(
    (lineId: string) => {
      const name = nameOf(lineId);
      const result = cartRemove(linesRef.current, lineId);
      if (!result.removed) return;
      commit(result.lines);
      setRemoved(result.removed);
      say(t.live.removed(name));
    },
    [commit, say, t],
  );

  const undo = useCallback(() => {
    if (!removed) return;
    commit(cartRestore(linesRef.current, removed));
    say(t.live.restored(removed.line.name));
    setRemoved(undefined);
  }, [commit, removed, say, t]);

  const saveForLater = useCallback(
    (lineId: string) => {
      const name = nameOf(lineId);
      commit(cartSaveForLater(linesRef.current, lineId));
      say(t.live.saved(name));
    },
    [commit, say, t],
  );

  const moveToCart = useCallback(
    (lineId: string) => {
      const name = nameOf(lineId);
      commit(cartMoveToCart(linesRef.current, lineId));
      say(t.live.moved(name));
    },
    [commit, say, t],
  );

  const fixStock = useCallback(() => commit(cartFixOverStock(linesRef.current)), [commit]);
  const replace = useCallback((next: readonly CommerceCartLine[]) => commit([...next]), [commit]);

  return useMemo(
    () => ({
      lines,
      active: cartActiveLines(lines),
      saved: cartSavedLines(lines),
      count: cartCount(lines),
      add,
      setQuantity,
      remove,
      undo,
      /** The last removed line, until it is undone or dismissed. */
      removed,
      dismissRemoved: () => setRemoved(undefined),
      saveForLater,
      moveToCart,
      fixStock,
      replace,
      drawerOpen,
      setDrawerOpen,
      message,
      announce: say,
    }),
    [lines, add, setQuantity, remove, undo, removed, saveForLater, moveToCart, fixStock, replace, drawerOpen, message, say],
  );
}

export type StoreCartController = ReturnType<typeof useStoreCart>;
