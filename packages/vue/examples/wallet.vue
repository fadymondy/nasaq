<script setup lang="ts">
import { NqWallet } from "@fadymondy/nasaq/vue";

const sources = [{ id: "visa", label: "Visa ending 4242" }];
const destinations = [{ id: "bank", label: "Al Rajhi Bank", description: "SA03 **** 1234" }];
const transactions = [{ id: "t1", type: "topup", amount: 200, status: "completed", date: new Date("2024-03-05T10:30:00"), description: "Top-up" }] as const;

async function topUp(_input: { amount: number; sourceId: string }) {}
async function payout(_input: { amount: number; destinationId: string }) {}
</script>

<template>
  <NqWallet
    :balance="1250.5"
    :pending="100"
    currency="USD"
    :sources="sources"
    :destinations="destinations"
    :transactions="transactions"
    :on-top-up="topUp"
    :on-payout="payout"
  />
</template>
