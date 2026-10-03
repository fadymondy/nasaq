<script setup lang="ts">
import { useAttrs } from "vue";
import { useT } from "../../provider";

// The nav landmark. The label is localised by the provider locale; pass aria-label to override.
const t = useT();
const attrs = useAttrs();
defineOptions({ inheritAttrs: false });
</script>

<template>
  <nav data-slot="breadcrumb" v-bind="attrs" :aria-label="(attrs['aria-label'] as string | undefined) ?? t('Breadcrumb', 'مسار التنقل')"><slot /></nav>
</template>
