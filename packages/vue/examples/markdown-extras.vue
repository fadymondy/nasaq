<script setup lang="ts">
import { NqRichMarkdown } from "@fadymondy/nasaq/vue";

const source = `---
title: Q3 numbers
tags: [finance, report]
published: 2026-09-01
---

| Region | Revenue |
| --- | ---: |
| Riyadh | $12,400 |
| Cairo | $8,900 |

\`\`\`ts title="sum.ts" showLineNumbers {2}
const a = 1;
const b = 2;
\`\`\`
`;
</script>

<template>
  <NqRichMarkdown :source="source" :tables="{ downloadable: true }" />
</template>
