<script setup lang="ts">
import { NqInterimBadge } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col gap-3">
    <h3 class="flex items-center gap-2">
      Revenue this month <NqInterimBadge />
    </h3>
    <h3 class="flex items-center gap-2">
      Orders today <NqInterimBadge label="Provisional" />
    </h3>
    <h3 class="flex items-center gap-2">
      Closed period <NqInterimBadge :pending="false" label="Final" />
    </h3>
  </div>
</template>
