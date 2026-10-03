<script setup lang="ts">
import { NqLoyaltyCard, NqPointsHistory, NqPromoCodeField, NqPromoCodeManager, NqVisitHistory, type LoyaltyReward, type LoyaltyTier, type PointsEntry, type PromoApplied, type PromoCode, type Visit } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const tiers: LoyaltyTier[] = [
  { id: "bronze", name: "Bronze", minPoints: 0 },
  { id: "silver", name: "Silver", minPoints: 1000 },
  { id: "gold", name: "Gold", minPoints: 3000 },
];
const rewards: LoyaltyReward[] = [
  { id: "r1", title: "Free coffee", cost: 500 },
  { id: "r2", title: "10 off your next order", cost: 1500 },
];
const entries: PointsEntry[] = [
  { id: "e1", date: "2026-09-20T10:00:00", kind: "earn", points: 120, note: "Order #1042", balanceAfter: 1840 },
  { id: "e2", date: "2026-09-10T10:00:00", kind: "redeem", points: -500, note: "Free coffee", balanceAfter: 1720 },
];
const visits: Visit[] = [
  { id: "v1", date: "2026-09-20T10:00:00", place: "Downtown", spend: 4500, points: 45, status: "completed" },
  { id: "v2", date: "2026-09-12T15:30:00", place: "Mall", spend: 0, points: 0, status: "no-show" },
];
const applied = ref<PromoApplied | null>(null);
const promos = ref<PromoCode[]>([{ id: "p1", code: "WELCOME10", type: "percent", value: 1000, used: 3, active: true }]);

async function redeem(r: LoyaltyReward) {
  console.log("redeem", r.id);
}
async function apply(code: string) {
  if (code !== "WELCOME10") return { error: "That code is not valid." };
  applied.value = { code, discount: 500 };
}
async function save(input: Omit<PromoCode, "id" | "used">, id?: string) {
  if (id) promos.value = promos.value.map((p) => (p.id === id ? { ...p, ...input } : p));
  else promos.value = [...promos.value, { ...input, id: `p${promos.value.length + 1}`, used: 0 }];
}
async function setActive(p: PromoCode, active: boolean) {
  promos.value = promos.value.map((x) => (x.id === p.id ? { ...x, active } : x));
}
async function remove(p: PromoCode) {
  promos.value = promos.value.filter((x) => x.id !== p.id);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqLoyaltyCard name="Sara" :balance="1840" :tiers="tiers" member-code="NSQ-4821" :rewards="rewards" :on-redeem="redeem" />
    <NqPromoCodeField :applied="applied" currency="USD" :on-apply="apply" :on-remove="() => (applied = null)" />
    <NqPointsHistory :entries="entries" />
    <NqVisitHistory :visits="visits" currency="USD" />
    <NqPromoCodeManager :promos="promos" currency="USD" today="2026-09-29" :on-save="save" :on-set-active="setActive" :on-delete="remove" />
  </div>
</template>
