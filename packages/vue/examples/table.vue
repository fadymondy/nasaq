<script setup lang="ts">
import { NqBadge, NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "@fadymondy/nasaq/vue";

const rows = [
  { key: "MH-728", title: "هيكل التطبيق v2", status: "قيد التنفيذ", hours: "6.5" },
  { key: "MH-718", title: "خط إنتاج الرموز", status: "مكتملة", hours: "11.25" },
];
</script>

<template>
  <NqTable>
    <NqTableHeader>
      <NqTableRow>
        <NqTableHead>المفتاح</NqTableHead>
        <NqTableHead>العنوان</NqTableHead>
        <NqTableHead>الحالة</NqTableHead>
        <NqTableHead class="text-end">الساعات</NqTableHead>
      </NqTableRow>
    </NqTableHeader>
    <NqTableBody>
      <NqTableRow v-for="r in rows" :key="r.key">
        <NqTableCell class="font-mono text-caption text-muted-foreground" dir="ltr">{{ r.key }}</NqTableCell>
        <NqTableCell class="font-medium">{{ r.title }}</NqTableCell>
        <NqTableCell><NqBadge variant="info">{{ r.status }}</NqBadge></NqTableCell>
        <NqTableCell class="text-end tabular-nums">{{ r.hours }}</NqTableCell>
      </NqTableRow>
    </NqTableBody>
  </NqTable>
</template>
