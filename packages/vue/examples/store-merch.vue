<script setup lang="ts">
import { NqStoreCategoryTiles, NqStoreFlashDeals, NqStoreHeroBanner, NqStoreProductCarousel, merchViewedProducts, type CommerceProduct, type StoreBanner, type StoreCategoryTile, type StoreFlashDeal } from "@fadymondy/nasaq/vue";

const img = (seed: string) => [{ src: `https://picsum.photos/seed/${seed}/600/750`, alt: seed }];
const mk = (id: string, name: string, price: number, compareAt?: number): CommerceProduct => ({
  id,
  name,
  brand: "Nasaq Goods",
  category: "Clothing",
  images: img(id),
  options: [],
  variants: [{ id: `${id}-1`, options: {}, price, ...(compareAt ? { compareAt } : {}), stock: 12 }],
});
const all = [mk("tee", "Everyday tee", 2900, 3900), mk("hoodie", "Zip hoodie", 6900), mk("cap", "Canvas cap", 1900), mk("belt", "Leather belt", 3400), mk("scarf", "Linen scarf", 2700)];

const hero: StoreBanner[] = [
  { id: "summer", eyebrow: "New season", title: "Summer collection", description: "Light layers for warm days.", cta: "Shop now", href: "#summer", image: "https://picsum.photos/seed/hero-1/1200/700", tone: "brand" },
  { id: "sale", title: "Up to 40% off", description: "Last chance on winter favourites.", href: "#sale", image: "https://picsum.photos/seed/hero-2/1200/700", tone: "dark" },
];
const tiles: StoreCategoryTile[] = [
  { id: "tops", label: "Tops", count: 42, image: "https://picsum.photos/seed/tops/400/400" },
  { id: "bottoms", label: "Bottoms", count: 28, image: "https://picsum.photos/seed/bottoms/400/400" },
  { id: "accessories", label: "Accessories", count: 64, image: "https://picsum.photos/seed/acc/400/400" },
];
const hour = 3_600_000;
const t0 = Date.now();
const deals: StoreFlashDeal[] = [
  { id: "d1", product: all[0]!, endsAt: t0 + 5 * hour, sold: 34, total: 50 },
  { id: "d2", product: all[1]!, endsAt: t0 + 9 * hour, sold: 12, total: 40 },
];
const add = (_p: CommerceProduct, variant: { id: string }, qty: number) => console.log("add", variant.id, qty);
</script>

<template>
  <div class="flex flex-col gap-10">
    <NqStoreHeroBanner :items="hero" />
    <NqStoreCategoryTiles :items="tiles" />
    <NqStoreFlashDeals :deals="deals" currency="USD" @add-to-cart="add" />
    <NqStoreProductCarousel title="Recently viewed" :products="merchViewedProducts(all, ['tee', 'cap', 'belt'], 'hoodie')" currency="USD" @add-to-cart="add" />
  </div>
</template>
