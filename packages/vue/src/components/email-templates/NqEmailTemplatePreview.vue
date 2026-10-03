<script setup lang="ts">
import { Monitor, Smartphone } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { fillVariables, renderEmailDocument, type EmailDirection, type EmailVariable } from "./email-render";
import { emailStrings, type EmailTemplatesLabelOverrides } from "./strings";
import type { EmailTemplate } from "./types";

/** The email as the reader sees it: sender line, subject and the body in a sandboxed frame, at desktop or phone width. */
interface Props {
  template: Pick<EmailTemplate, "subject" | "preheader" | "body" | "dir" | "footer">;
  variables?: readonly EmailVariable[];
  /** Shown in the header of the mock inbox. */
  sender?: { name: string; email: string };
  /** Shown in the header of the mock inbox. */
  recipient?: string;
  /** Start on the mobile width. */
  defaultDevice?: "desktop" | "mobile";
  labels?: EmailTemplatesLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variables: () => [], sender: undefined, recipient: undefined, defaultDevice: "desktop", labels: undefined });
const nq = useNasaq();
const t = computed(() => emailStrings(nq.locale.value, props.labels));
const device = ref<"desktop" | "mobile">(props.defaultDevice);
const dir = computed<EmailDirection | undefined>(() => props.template.dir);
const srcDoc = computed(() => renderEmailDocument({ body: props.template.body, preheader: props.template.preheader, dir: dir.value, variables: props.variables, footer: props.template.footer }));
</script>

<template>
  <div data-slot="email-template-preview" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div class="flex items-center justify-between gap-2">
      <span class="text-label text-foreground">{{ t.preview }}</span>
      <NqToggleGroup :model-value="[device]" :aria-label="t.preview" @update:model-value="(v: string[]) => v[0] && (device = v[0] as 'desktop' | 'mobile')">
        <NqToggle value="desktop" :aria-label="t.desktop"><Monitor aria-hidden="true" class="size-4" /></NqToggle>
        <NqToggle value="mobile" :aria-label="t.mobile"><Smartphone aria-hidden="true" class="size-4" /></NqToggle>
      </NqToggleGroup>
    </div>
    <div class="flex justify-center rounded-card border border-border bg-secondary p-3">
      <div :class="cn('flex w-full flex-col overflow-hidden rounded-card border border-border bg-card', device === 'mobile' ? 'max-w-[375px]' : 'max-w-[680px]')" :data-device="device">
        <div class="flex flex-col gap-0.5 border-b border-border px-4 py-3 text-body-sm">
          <span class="truncate text-label text-foreground">{{ fillVariables(props.template.subject, props.variables) || "—" }}</span>
          <span v-if="props.sender" class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
            {{ t.from }}: <span class="text-foreground">{{ props.sender.name }}</span> <bdi dir="ltr">&lt;{{ props.sender.email }}&gt;</bdi>
          </span>
          <span v-if="props.recipient" class="flex flex-wrap items-center gap-x-1 text-muted-foreground">
            {{ t.to }}: <bdi dir="ltr">{{ props.recipient }}</bdi>
          </span>
        </div>
        <iframe :title="t.previewFrame" sandbox="" :srcdoc="srcDoc" class="h-[520px] w-full border-0 bg-secondary" />
      </div>
    </div>
  </div>
</template>
