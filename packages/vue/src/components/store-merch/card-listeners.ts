import { computed, getCurrentInstance } from "vue";
import type { CommerceProduct, CommerceVariant } from "../store-listing/commerce";

type Fn = (...args: never[]) => unknown;

/**
 * Internal. The product card turns its quick view, quick add, wishlist heart and link tracking on only when a handler is
 * bound, so a block that wraps the card passes on just the handlers its own caller bound (and a returned promise).
 */
export function useCardListeners() {
  const instance = getCurrentInstance();
  const listener = (name: string) => (instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name] as ((...args: unknown[]) => unknown) | undefined;
  return computed(() => {
    const out: Record<string, Fn> = {};
    if (listener("onAddToCart")) out.onAddToCart = ((p: CommerceProduct, v: CommerceVariant, q: number) => listener("onAddToCart")?.(p, v, q)) as Fn;
    if (listener("onQuickView")) out.onQuickView = ((p: CommerceProduct) => listener("onQuickView")?.(p)) as Fn;
    if (listener("onNavigate")) out.onNavigate = ((p: CommerceProduct) => listener("onNavigate")?.(p)) as Fn;
    if (listener("onToggleWishlist")) out.onToggleWishlist = ((p: CommerceProduct, next: boolean) => listener("onToggleWishlist")?.(p, next)) as Fn;
    return out;
  });
}
