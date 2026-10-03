import { computed, h, toValue, type MaybeRefOrGetter } from "vue";
import { useNasaq } from "../../provider";
import { useRegisterCommands, type Command } from "../commands";
import NqProductIcon from "./NqProductIcon.vue";
import type { Product } from "./types";

/** Registers "Switch to <product>" in the palette's products section. */
export function useProductCommands(
  products: MaybeRefOrGetter<Product[]>,
  onSelect: (product: Product) => void,
  current?: MaybeRefOrGetter<string | undefined>,
) {
  const nq = useNasaq();
  const commands = computed<Command[]>(() => {
    const ar = nq.locale.value.startsWith("ar");
    return toValue(products)
      .filter((p) => p.id !== toValue(current))
      .map((p) => ({
        id: `nasaq.product.${p.id}`,
        section: "products",
        label: p.name,
        icon: h(NqProductIcon, { product: p, size: 16 }),
        hint: ar ? "تطبيق" : "App",
        keywords: [...(p.keywords ?? []), p.brand ?? "", ar ? "انتقل إلى" : "switch to", ar ? "تطبيق" : "app"],
        priority: p.pinned ? 1 : 0,
        perform: () => onSelect(p),
      }));
  });
  useRegisterCommands(commands);
}
