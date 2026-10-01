<script setup lang="ts">
import { Copy, Mail, Plus, Search, Trash2 } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import { fillVariables, renderEmailDocument, type EmailVariable } from "./email-render";
import { emailStrings, type EmailTemplatesLabelOverrides } from "./strings";
import { CATEGORY_ORDER, type EmailTemplate, type EmailTemplateCategory, type EmailTemplateResult } from "./types";

/** A searchable grid of template cards, each with a thumbnail of the rendered email, filterable by category. */
interface Props {
  templates: EmailTemplate[];
  /** Used to fill `{{variables}}` in the thumbnails. */
  variables?: readonly EmailVariable[];
  onOpen?: (template: EmailTemplate) => void;
  onCreate?: () => void;
  onDuplicate?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  onDelete?: (template: EmailTemplate) => Promise<EmailTemplateResult>;
  labels?: EmailTemplatesLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variables: () => [], onOpen: undefined, onCreate: undefined, onDuplicate: undefined, onDelete: undefined, labels: undefined });
const nq = useNasaq();
const t = computed(() => emailStrings(nq.locale.value, props.labels));
const id = useId();
const query = ref("");
const category = ref<"all" | EmailTemplateCategory>("all");
const pendingDelete = ref<EmailTemplate | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

const shown = computed(() =>
  props.templates.filter((tpl) => {
    if (category.value !== "all" && tpl.category !== category.value) return false;
    const q = query.value.trim().toLowerCase();
    return !q || `${tpl.name} ${tpl.subject}`.toLowerCase().includes(q);
  }),
);
const present = computed(() => CATEGORY_ORDER.filter((c) => props.templates.some((tpl) => tpl.category === c)));
const srcDoc = (tpl: EmailTemplate) => renderEmailDocument({ body: tpl.body, preheader: tpl.preheader, dir: tpl.dir, variables: props.variables, footer: tpl.footer });

async function run(fn: () => Promise<EmailTemplateResult> | undefined): Promise<boolean> {
  busy.value = true;
  error.value = null;
  try {
    const result = await fn();
    if (result && result.error) error.value = result.error;
    return !(result && result.error);
  } catch {
    error.value = t.value.failed;
    return false;
  } finally {
    busy.value = false;
  }
}
async function confirmDelete() {
  const tpl = pendingDelete.value;
  if (tpl && (await run(() => props.onDelete?.(tpl)))) pendingDelete.value = null;
}
</script>

<template>
  <div data-slot="email-template-gallery" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-48 flex-1 sm:max-w-sm">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :aria-label="t.search" :placeholder="t.search" class="ps-9" />
      </div>
      <NqButton v-if="props.onCreate" variant="primary" class="ms-auto" @click="props.onCreate?.()">
        <Plus aria-hidden="true" />
        {{ t.newTemplate }}
      </NqButton>
    </div>
    <NqTabs v-if="present.length > 1" :model-value="category" @update:model-value="(v) => (category = v as 'all' | EmailTemplateCategory)">
      <NqTabsList :aria-label="t.category">
        <NqTabsTab value="all">{{ t.all }}</NqTabsTab>
        <NqTabsTab v-for="c in present" :key="c" :value="c">{{ t.categories[c] }}</NqTabsTab>
      </NqTabsList>
    </NqTabs>
    <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
    <NqEmptyState v-if="shown.length === 0" :icon="Mail" :title="templates.length === 0 ? t.noneTitle : t.noMatchTitle" :description="templates.length === 0 ? t.noneHint : t.noMatchHint" />
    <ul v-else :aria-label="t.gallery" class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      <li v-for="tpl in shown" :key="tpl.id" class="min-w-0">
        <NqCard class="group h-full gap-0 overflow-hidden p-0">
          <button
            type="button"
            :aria-labelledby="`${id}-${tpl.id}`"
            class="flex flex-col text-start outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
            @click="props.onOpen?.(tpl)"
          >
            <div dir="ltr" aria-hidden="true" class="relative flex h-44 justify-center overflow-hidden border-b border-border bg-secondary" :data-name="tpl.name" :title="t.thumbnail(tpl.name)">
              <iframe tabindex="-1" sandbox="" :srcdoc="srcDoc(tpl)" class="pointer-events-none absolute top-0 h-[440px] w-[600px] shrink-0 origin-top scale-[0.4] border-0" style="inset-inline-start: 50%; margin-inline-start: -300px" title="" />
            </div>
            <span class="flex flex-col gap-1.5 p-3">
              <span :id="`${id}-${tpl.id}`" class="truncate text-label text-foreground">{{ tpl.name || t.untitled }}</span>
              <span class="truncate text-body-sm text-muted-foreground">{{ fillVariables(tpl.subject, props.variables) }}</span>
              <span class="flex flex-wrap items-center gap-1.5">
                <NqStatus :tone="tpl.status === 'active' ? 'success' : 'neutral'">{{ t.statuses[tpl.status] }}</NqStatus>
                <NqBadge variant="outline">{{ t.categories[tpl.category] }}</NqBadge>
              </span>
            </span>
          </button>
          <div class="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <span v-if="tpl.updatedAt != null" class="truncate text-caption text-muted-foreground">
              {{ t.updated }} <NqDateTime :value="tpl.updatedAt" :format="{ dateStyle: 'medium' }" />
            </span>
            <span v-else />
            <span class="flex shrink-0 items-center">
              <NqButton v-if="props.onDuplicate" variant="ghost" size="icon-sm" :aria-label="`${t.duplicate}: ${tpl.name}`" :disabled="busy" @click="run(() => props.onDuplicate?.(tpl))">
                <Copy aria-hidden="true" />
              </NqButton>
              <NqButton v-if="props.onDelete" variant="ghost" size="icon-sm" :aria-label="`${t.delete}: ${tpl.name}`" :disabled="busy" @click="pendingDelete = tpl">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </span>
          </div>
        </NqCard>
      </li>
    </ul>
    <NqDialog :open="pendingDelete != null" @update:open="(open: boolean) => !open && (pendingDelete = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ t.deleteConfirm(pendingDelete?.name || t.untitled) }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="pendingDelete = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="confirmDelete">{{ t.delete }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
