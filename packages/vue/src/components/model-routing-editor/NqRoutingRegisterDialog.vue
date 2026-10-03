<script setup lang="ts">
import { CircleAlert } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { MODALITIES, validateProvider, type RoutingModality } from "./routing-math";
import type { STRINGS } from "./strings";
import type { RegisterProviderInput, RoutingProvider, RoutingResult } from "./types";

// The "Register a provider" dialog. Internal to NqModelRoutingEditor.
interface Props {
  open: boolean;
  providers: readonly RoutingProvider[];
  onRegister: (input: RegisterProviderInput) => Promise<RoutingResult> | RoutingResult;
  t: typeof STRINGS.en;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const id = useId();
const name = ref("");
const kind = ref<"cloud" | "node">("cloud");
const endpoint = ref("");
const mods = ref<RoutingModality[]>(["text"]);
const submitted = ref(false);
const busy = ref(false);
const failure = ref<string | null>(null);

const errors = computed(() => validateProvider({ name: name.value, endpoint: endpoint.value, modalities: mods.value }, props.providers));
const msg = computed(() => ({
  name: errors.value.name === "required" ? props.t.nameRequired : errors.value.name === "duplicate" ? props.t.nameDuplicate : undefined,
  endpoint: errors.value.endpoint === "required" ? props.t.endpointRequired : errors.value.endpoint === "invalid" ? props.t.endpointInvalid : undefined,
  modalities: errors.value.modalities ? props.t.modalitiesRequired : undefined,
}));

function reset() {
  name.value = "";
  kind.value = "cloud";
  endpoint.value = "";
  mods.value = ["text"];
  submitted.value = false;
  failure.value = null;
}

async function submit() {
  submitted.value = true;
  if (errors.value.name || errors.value.endpoint || errors.value.modalities) return;
  busy.value = true;
  failure.value = null;
  let error: string | undefined;
  try {
    const r = await props.onRegister({ name: name.value.trim(), kind: kind.value, endpoint: endpoint.value.trim(), modalities: mods.value });
    if (r && typeof r === "object" && r.error) error = r.error;
  } catch (e) {
    error = e instanceof Error && e.message ? e.message : props.t.registerFailed;
  }
  busy.value = false;
  if (error) {
    failure.value = error;
    return;
  }
  reset();
  emit("update:open", false);
}

function onOpen(o: boolean) {
  if (busy.value) return;
  if (!o) reset();
  emit("update:open", o);
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="onOpen">
    <NqDialogContent class="max-h-[90dvh] max-w-lg overflow-y-auto" data-slot="routing-register">
      <form novalidate class="flex flex-col gap-4" @submit.prevent.stop="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.dialogTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.dialogBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="submitted && !!msg.name">
          <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
          <NqInput v-model="name" autocomplete="off" />
          <NqFieldError v-if="submitted && msg.name" match>{{ msg.name }}</NqFieldError>
        </NqField>
        <div class="flex flex-col gap-1.5">
          <span :id="`${id}-kind`" class="text-label text-foreground">{{ props.t.kind }}</span>
          <NqToggleGroup :aria-labelledby="`${id}-kind`" :model-value="[kind]" class="w-fit" @update:model-value="(v) => v[0] && (kind = v[0] as 'cloud' | 'node')">
            <NqToggle value="cloud">{{ props.t.cloud }}</NqToggle>
            <NqToggle value="node">{{ props.t.node }}</NqToggle>
          </NqToggleGroup>
        </div>
        <NqField :invalid="submitted && !!msg.endpoint">
          <NqFieldLabel>{{ props.t.endpoint }}</NqFieldLabel>
          <NqInput v-model="endpoint" ltr type="url" inputmode="url" placeholder="https://" autocomplete="off" />
          <NqFieldError v-if="submitted && msg.endpoint" match>{{ msg.endpoint }}</NqFieldError>
          <p v-else class="text-caption text-muted-foreground">{{ props.t.endpointHint }}</p>
        </NqField>
        <div class="flex flex-col gap-1.5">
          <span :id="`${id}-mod`" class="text-label text-foreground">{{ props.t.modalities }}</span>
          <NqToggleGroup multiple :aria-labelledby="`${id}-mod`" :model-value="mods" class="w-fit max-w-full flex-wrap" @update:model-value="(v) => (mods = MODALITIES.filter((m) => v.includes(m)))">
            <NqToggle v-for="m in MODALITIES" :key="m" :value="m">{{ props.t[m] }}</NqToggle>
          </NqToggleGroup>
          <p v-if="submitted && msg.modalities" role="alert" class="flex items-center gap-1.5 text-caption text-nq-danger-text">
            <CircleAlert aria-hidden="true" class="size-3.5" />{{ msg.modalities }}
          </p>
          <p v-else class="text-caption text-muted-foreground">{{ props.t.modalitiesHint }}</p>
        </div>
        <NqAlert v-if="failure" tone="danger">{{ failure }}</NqAlert>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">{{ props.t.register }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
