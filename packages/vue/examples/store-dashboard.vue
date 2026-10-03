<script setup lang="ts">
import { NqStoreDashboard } from "@fadymondy/nasaq/vue";

// Money is integer minor units (cents), so 4_820_000 is $48,200.
const totals = { sales: 4_820_000, orders: 312, sessions: 9_400, customers: 280, returningCustomers: 96, addToCart: 1_320, checkouts: 540 };
const previousTotals = { sales: 4_210_000, orders: 288, sessions: 8_900, customers: 262, returningCustomers: 80, addToCart: 1_190, checkouts: 500 };
const series = [
  { date: "2026-09-27", sales: 1_520_000, orders: 98, sessions: 3_000 },
  { date: "2026-09-28", sales: 1_610_000, orders: 104, sessions: 3_100 },
  { date: "2026-09-29", sales: 1_690_000, orders: 110, sessions: 3_300 },
];
const previousSeries = [
  { date: "2026-09-20", sales: 1_300_000, orders: 90, sessions: 2_900 },
  { date: "2026-09-21", sales: 1_400_000, orders: 96, sessions: 3_000 },
  { date: "2026-09-22", sales: 1_510_000, orders: 102, sessions: 3_000 },
];
const topProducts = [
  { id: "p1", name: "Linen shirt", units: 120, revenue: 960_000, previousRevenue: 800_000 },
  { id: "p2", name: "Canvas tote", units: 90, revenue: 450_000 },
];
const categories = [
  { id: "c1", label: "Shirts", value: 2_100_000, previous: 1_900_000 },
  { id: "c2", label: "Bags", value: 1_300_000 },
];
const channels = [
  { id: "web", label: "Website", value: 3_000_000 },
  { id: "app", label: "App", value: 1_200_000 },
  { id: "pos", label: "Store", value: 620_000 },
];
const cities = [
  { id: "ny", label: "New York", value: 1_800_000 },
  { id: "la", label: "Los Angeles", value: 1_100_000 },
];
const products = [
  {
    id: "p1",
    name: "Linen shirt",
    status: "active",
    images: [],
    options: [{ id: "size", values: [{ id: "m", label: "M" }] }],
    variants: [
      { id: "v1", sku: "LS-M", options: { size: "m" }, stock: 2 },
      { id: "v2", sku: "LS-L", options: { size: "m" }, stock: 0 },
    ],
  },
];
const orders = [
  { id: "o1", number: "#1042", placedAt: "2026-09-29T08:12:00Z", status: "paid" as const, customer: { name: "Sara Ali" }, totals: { total: 18_500 } },
  { id: "o2", number: "#1041", placedAt: "2026-09-29T07:40:00Z", status: "shipped" as const, customer: { name: "Omar Khan" }, totals: { total: 9_900 } },
];
const history = [60, 64, 70, 68, 74];
const open = (id: string) => console.log("open product", id);
</script>

<template>
  <NqStoreDashboard
    currency="USD"
    :totals="totals"
    :previous-totals="previousTotals"
    :series="series"
    :previous-series="previousSeries"
    :top-products="topProducts"
    :categories="categories"
    :channels="channels"
    :cities="cities"
    :products="products"
    :recent-orders="orders"
    :live-visitors="{ count: 74, history }"
    :on-open-product="open"
    :on-restock="(item) => console.log('restock', item.variantId)"
  />
</template>
