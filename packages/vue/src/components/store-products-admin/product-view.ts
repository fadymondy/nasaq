// Small view helpers shared by the product admin screens. Internal; not re-exported.
import type { CommerceProduct } from "./product-types";

export type ProductAdminStatus = NonNullable<CommerceProduct["status"]>;
export const productStatusOf = (p: CommerceProduct): ProductAdminStatus => p.status ?? "active";
export const productPriceRange = (p: CommerceProduct): [number, number] | null => {
  const prices = p.variants.map((v) => v.price);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : null;
};
