<script setup lang="ts">
import { ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatus } from "../status";
import { canReplay, prettyJson } from "./format";
import type { WebhookDelivery, WebhooksManagerStrings } from "./strings";
import { statusTone } from "./tones";

// One delivery with its request and response, and a replay button. Internal.
const props = defineProps<{ delivery: WebhookDelivery | null; name: string; replayable: boolean; busy: boolean; t: WebhooksManagerStrings }>();
const emit = defineEmits<{ close: []; replay: [delivery: WebhookDelivery] }>();

const held = ref<{ delivery: WebhookDelivery; name: string } | null>(null);
watch(
  () => [props.delivery, props.name] as const,
  ([d, name]) => {
    if (d) held.value = { delivery: d, name };
  },
  { immediate: true },
);
</script>

<template>
  <NqDialog :open="props.delivery !== null" @update:open="(o: boolean) => !o && emit('close')">
    <NqDialogContent data-slot="webhooks-delivery" class="max-w-2xl">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.t.detailTitle }}</NqDialogTitle>
        <NqDialogDescription>
          <bdi dir="ltr" class="font-mono">{{ held?.delivery.event }}</bdi>{{ " " }}
          <span dir="auto">· {{ held?.name }}</span>
        </NqDialogDescription>
      </NqDialogHeader>
      <div v-if="held" class="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
        <div class="flex flex-wrap items-center gap-3 text-body-sm">
          <NqStatus :tone="statusTone[held.delivery.status]">{{ props.t.statuses[held.delivery.status] }}</NqStatus>
          <NqNum v-if="held.delivery.code !== undefined" :value="held.delivery.code" :format="{ useGrouping: false }" />
          <span v-if="held.delivery.durationMs !== undefined"><NqNum :value="held.delivery.durationMs" /> {{ props.t.ms }}</span>
          <span class="text-muted-foreground">{{ props.t.attempt }} <NqNum :value="held.delivery.attempt" /></span>
          <NqDateTime :value="held.delivery.at" class="text-muted-foreground" :format="{ dateStyle: 'medium', timeStyle: 'medium' }" />
        </div>
        <NqAlert v-if="held.delivery.error" tone="danger">{{ held.delivery.error }}</NqAlert>
        <section class="flex flex-col gap-1.5">
          <h4 class="text-label text-foreground">{{ props.t.request }}</h4>
          <NqCodeBlock v-if="held.delivery.request" :code="prettyJson(held.delivery.request)" language="json" />
          <p v-else class="text-caption text-muted-foreground">{{ props.t.noBody }}</p>
        </section>
        <section class="flex flex-col gap-1.5">
          <h4 class="text-label text-foreground">{{ props.t.responseBody }}</h4>
          <NqCodeBlock v-if="held.delivery.response" :code="prettyJson(held.delivery.response)" language="json" />
          <p v-else class="text-caption text-muted-foreground">{{ props.t.noBody }}</p>
        </section>
      </div>
      <NqDialogFooter>
        <NqButton variant="ghost" @click="emit('close')">{{ props.t.close }}</NqButton>
        <NqButton v-if="props.replayable && held" variant="primary" :loading="props.busy" :disabled="!canReplay(held.delivery.status)" @click="emit('replay', held.delivery)">
          {{ props.busy ? props.t.replaying : props.t.replay }}
        </NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
