<script setup lang="ts">
import {
  issueGiftCard,
  NqDiscountsManager,
  NqGiftCardField,
  NqGiftCardsManager,
  NqShippingSettings,
  NqTaxSettings,
  type Discount,
  type GiftCard,
  type PickupLocation,
  type ShippingZone,
  type TaxRate,
} from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const now = new Date("2026-09-29T09:00:00");

const zones = ref<ShippingZone[]>([
  {
    id: "z1",
    name: "Cairo and Giza",
    countries: ["EG"],
    cities: ["Cairo", "Giza"],
    rates: [
      { id: "r1", label: "Standard", type: "flat", amount: 5000, etaDays: [2, 3], active: true },
      { id: "r2", label: "Express", type: "flat", amount: 12000, etaDays: [1, 1], express: true, active: true },
    ],
  },
  { id: "z2", name: "Rest of the world", countries: ["*"], rates: [{ id: "r3", label: "International", type: "free-over", freeOver: 200000, amount: 25000, active: true }] },
]);
const pickups = ref<PickupLocation[]>([{ id: "p1", name: "Maadi store", address: "12 Road 9, Maadi", country: "EG", city: "Cairo", readyInHours: 2, active: true }]);
const taxes = ref<TaxRate[]>([
  { id: "t1", name: "VAT", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true },
  { id: "t2", name: "Sales tax", country: "US", region: "CA", bps: 725, inclusive: false, active: true },
]);
const discounts = ref<Discount[]>([
  { id: "d1", title: "Summer 10", method: "code", code: "SUMMER10", kind: "percentage", value: 1000, active: true, combinesWith: {} },
  { id: "d2", title: "Free shipping over 500", method: "automatic", kind: "free-shipping", minSubtotal: 50000, active: true, combinesWith: {} },
]);
const products = [
  { id: "pr1", name: "Linen shirt", images: [], options: [], variants: [{ id: "v1", options: {}, price: 25000 }] },
  { id: "pr2", name: "Canvas tote", images: [], options: [], variants: [{ id: "v2", options: {}, price: 12000 }] },
];
const issued = issueGiftCard({ id: "gc1", code: "SEEDDEMOCARD0001", amount: 50000, currency: "USD", now });
const cards = ref<GiftCard[]>("error" in issued ? [] : [issued]);
const entered = ref<GiftCard[]>([]);

const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
const ok = async () => ({});

async function saveZone(z: ShippingZone) {
  zones.value = upsert(zones.value, z);
  return {};
}
async function savePickup(p: PickupLocation) {
  pickups.value = upsert(pickups.value, p);
  return {};
}
async function saveTax(r: TaxRate) {
  taxes.value = upsert(taxes.value, r);
  return {};
}
async function saveDiscount(d: Discount) {
  discounts.value = upsert(discounts.value, d);
  return {};
}
async function updateCard(c: GiftCard) {
  cards.value = upsert(cards.value, c);
  return {};
}
async function lookup(code: string) {
  return cards.value.find((c) => c.code === code) ?? { error: "not-found" as const };
}
</script>

<template>
  <div class="grid gap-10">
    <NqShippingSettings :zones="zones" :pickups="pickups" currency="USD" :on-save-zone="saveZone" :on-delete-zone="ok" :on-save-pickup="savePickup" :on-delete-pickup="ok" />
    <NqTaxSettings :rates="taxes" currency="USD" :on-save="saveTax" :on-delete="ok" />
    <NqDiscountsManager :discounts="discounts" :products="products" :usage="{ d1: 12 }" :now="now" currency="USD" :on-save="saveDiscount" :on-delete="ok" />
    <NqGiftCardsManager :cards="cards" :now="now" currency="USD" :on-issue="updateCard" :on-update="updateCard" />
    <NqGiftCardField :cards="entered" :total="30000" :now="now" currency="USD" :on-lookup="lookup" :on-cards-change="(c: GiftCard[]) => (entered = c)" />
  </div>
</template>
