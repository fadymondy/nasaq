<script setup lang="ts">
import { computed } from "vue";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { certStatus, certTone, type CertThresholds, type CertTone } from "./format";
import { CERT_STRINGS, type CertMonitorLabels } from "./strings";

// The days-left figure as a badge: green above 30 days, amber at 30 or fewer, red at 7 or fewer or expired.
// Colour is backed by the text.
const props = withDefaults(
  defineProps<{
    days: number | null;
    host?: string;
    thresholds?: CertThresholds;
    labels?: CertMonitorLabels;
  }>(),
  { host: "", thresholds: undefined, labels: undefined },
);

const toneVariant: Record<CertTone, "success" | "warning" | "danger" | "neutral"> = { success: "success", warning: "warning", danger: "danger", neutral: "neutral" };
const nasaq = useNasaq();
const t = computed(() => ({ ...CERT_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const status = computed(() => certStatus(props.days, props.thresholds));
</script>

<template>
  <NqBadge data-slot="days-left-badge" :data-status="status" :variant="toneVariant[certTone(status)]" :aria-label="t.leftAria(props.host, props.days)">
    {{ t.leftLabel(props.days) }}
  </NqBadge>
</template>
