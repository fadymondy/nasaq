<script setup lang="ts">
import { Mail } from "lucide-vue-next";
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { NqAvailabilityBadge, type ProfileAvailability } from "../personal-widgets";
import { useProfileStrings, type ProfilePageLabels } from "./strings";

// The closing call to action: a headline, one sentence, the availability and a contact button.
// With `contactButton` the button emits `contact`; otherwise it opens mailto: to `email`.
interface Props {
  email?: string;
  availability?: ProfileAvailability;
  availabilityNote?: string;
  contactButton?: boolean;
  title?: string;
  description?: string;
  labels?: Partial<ProfilePageLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ contact: [] }>();
const { t } = useProfileStrings(() => props.labels);
const id = useId();
</script>

<template>
  <section data-slot="profile-contact" :aria-labelledby="id" :class="cn('flex flex-col items-start gap-4 rounded-card border border-border bg-card p-6 @2xl:flex-row @2xl:items-center @2xl:justify-between', props.class)">
    <div class="flex min-w-0 flex-col gap-2">
      <NqAvailabilityBadge v-if="props.availability" :status="props.availability" :note="props.availabilityNote" />
      <h2 :id="id" class="text-balance text-h1 text-foreground">{{ props.title ?? t.contactTitle }}</h2>
      <p class="max-w-xl text-pretty text-body text-muted-foreground">{{ props.description ?? t.contactBody }}</p>
    </div>
    <NqButton v-if="props.contactButton" variant="primary" size="lg" @click="emit('contact')"><NqIcon :icon="Mail" />{{ t.contact }}</NqButton>
    <NqButton v-else-if="props.email" as="a" :href="`mailto:${props.email}`" variant="primary" size="lg"><NqIcon :icon="Mail" />{{ t.contact }}</NqButton>
  </section>
</template>
