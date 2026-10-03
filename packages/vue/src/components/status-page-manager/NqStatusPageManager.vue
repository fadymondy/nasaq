<script setup lang="ts">
import { ArrowDown, ArrowUp, ExternalLink, Megaphone } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { NqIncidentList, type Incident, type IncidentImpact, type IncidentStatus } from "../uptime-monitors";
import { isValidStatusSlug, moveStatusPageItem, type StatusPageSettingsDraft } from "./status-page-manager-format";

const STRINGS = {
  en: {
    title: "Status page",
    description: "Choose what customers see on your public status page, and post incidents to it.",
    view: "View public page",
    settings: "Page settings",
    pageTitle: "Page title",
    slug: "Address",
    slugHint: "Lowercase letters, numbers and dashes.",
    slugError: "Use lowercase letters, numbers and dashes only.",
    domain: "Custom domain",
    domainHint: "Optional. Point a CNAME at your status host first.",
    required: "This field is required.",
    services: "Services on the page",
    servicesHint: "Turn a service off to hide it. Use the arrows to change the order.",
    show: (n: string) => `Show ${n} on the status page`,
    up: (n: string) => `Move ${n} up`,
    down: (n: string) => `Move ${n} down`,
    save: "Save changes",
    saved: "Saved.",
    discard: "Discard",
    dirty: "Unsaved changes",
    post: "Post incident",
    dialogTitle: "Post an incident",
    dialogBody: "It appears on the public page right away. Customers see each update you add.",
    incTitle: "Title",
    incBody: "What is happening",
    incImpact: "Impact",
    incStatus: "Status",
    incServices: "Affected services",
    impact: { minor: "Minor", major: "Major", maintenance: "Maintenance" } as Record<IncidentImpact, string>,
    incidentStatus: { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" } as Record<IncidentStatus, string>,
    publish: "Publish",
    cancel: "Cancel",
    incidents: "Incidents",
    addUpdate: "Post an update",
    genericError: "Something went wrong. Try again.",
    hidden: "Hidden",
  },
  ar: {
    title: "صفحة الحالة",
    description: "اختر ما يراه العملاء في صفحة الحالة العامة، وانشر الحوادث عليها.",
    view: "عرض الصفحة العامة",
    settings: "إعدادات الصفحة",
    pageTitle: "عنوان الصفحة",
    slug: "العنوان",
    slugHint: "أحرف إنجليزية صغيرة وأرقام وشرطات.",
    slugError: "استخدم أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط.",
    domain: "نطاق مخصص",
    domainHint: "اختياري. وجّه سجل CNAME إلى مضيف الحالة أولًا.",
    required: "هذا الحقل مطلوب.",
    services: "الخدمات في الصفحة",
    servicesHint: "أوقف خدمة لإخفائها. استخدم الأسهم لتغيير الترتيب.",
    show: (n: string) => `إظهار ${n} في صفحة الحالة`,
    up: (n: string) => `نقل ${n} للأعلى`,
    down: (n: string) => `نقل ${n} للأسفل`,
    save: "حفظ التغييرات",
    saved: "تم الحفظ.",
    discard: "تجاهل",
    dirty: "تغييرات غير محفوظة",
    post: "نشر حادثة",
    dialogTitle: "نشر حادثة",
    dialogBody: "تظهر في الصفحة العامة فورًا. يرى العملاء كل تحديث تضيفه.",
    incTitle: "العنوان",
    incBody: "ما الذي يحدث",
    incImpact: "الأثر",
    incStatus: "الحالة",
    incServices: "الخدمات المتأثرة",
    impact: { minor: "طفيف", major: "كبير", maintenance: "صيانة" } as Record<IncidentImpact, string>,
    incidentStatus: { investigating: "قيد التحقق", identified: "تم تحديد السبب", monitoring: "تحت المراقبة", resolved: "تم الحل" } as Record<IncidentStatus, string>,
    publish: "نشر",
    cancel: "إلغاء",
    incidents: "الحوادث",
    addUpdate: "نشر تحديث",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    hidden: "مخفية",
  },
};
export type StatusPageManagerLabels = Partial<typeof STRINGS.en>;
export type StatusPageManagerResult = void | { error?: string };

export interface ManagedService {
  id: string;
  name: string;
  visible: boolean;
}

export interface StatusPageSettings {
  title: string;
  slug: string;
  domain?: string;
  /** In display order. */
  services: ManagedService[];
}

export interface IncidentInput {
  title: string;
  body: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  serviceIds: string[];
}

// Admin for the public status page: title, address and domain, which services show and in what order (staged until Save), and posting incidents.
const props = withDefaults(
  defineProps<{
    settings: StatusPageSettings;
    incidents?: readonly Incident[];
    /** Public URL, shown as a link. */
    publicUrl?: string;
    onSave: (next: StatusPageSettings) => Promise<StatusPageManagerResult>;
    /** Shows Post incident when set. */
    onPostIncident?: (input: IncidentInput) => Promise<StatusPageManagerResult>;
    labels?: StatusPageManagerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { incidents: () => [], publicUrl: undefined, onPostIncident: undefined, labels: undefined },
);

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const clone = (s: StatusPageSettings): StatusPageSettingsDraft => ({ ...s, services: s.services.map((x) => ({ ...x })) });
const draft = ref<StatusPageSettingsDraft>(clone(props.settings));
const tried = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);
const open = ref(false);

watch(() => props.settings, (s) => (draft.value = clone(s)), { deep: true });
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.settings));
const slugBad = computed(() => !isValidStatusSlug(draft.value.slug));
const titleBad = computed(() => !draft.value.title.trim());

async function save() {
  tried.value = true;
  if (slugBad.value || titleBad.value) return;
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    const r = await props.onSave({ ...draft.value, title: draft.value.title.trim(), domain: draft.value.domain?.trim() || undefined });
    if (r && r.error) error.value = r.error;
    else saved.value = true;
  } catch {
    error.value = t.value.genericError;
  } finally {
    saving.value = false;
  }
}

function discard() {
  draft.value = clone(props.settings);
  tried.value = false;
}
function toggle(id: string, visible: boolean) {
  draft.value = { ...draft.value, services: draft.value.services.map((x) => (x.id === id ? { ...x, visible } : x)) };
}
function move(i: number, delta: number) {
  draft.value = { ...draft.value, services: moveStatusPageItem(draft.value.services, i, delta) };
}

// The incident dialog
const incTitle = ref("");
const incBody = ref("");
const incImpact = ref<IncidentImpact>("minor");
const incStatus = ref<IncidentStatus>("investigating");
const incIds = ref<string[]>([]);
const incTried = ref(false);
const busy = ref(false);
const incError = ref<string | null>(null);
watch(open, (o) => {
  if (!o) return;
  incTitle.value = "";
  incBody.value = "";
  incImpact.value = "minor";
  incStatus.value = "investigating";
  incIds.value = [];
  incTried.value = false;
  incError.value = null;
});
const impactItems = computed(() => (Object.keys(t.value.impact) as IncidentImpact[]).map((v) => ({ value: v, label: t.value.impact[v] })));
const statusItems = computed(() => (Object.keys(t.value.incidentStatus) as IncidentStatus[]).map((v) => ({ value: v, label: t.value.incidentStatus[v] })));

async function post() {
  incTried.value = true;
  if (!incTitle.value.trim() || !incBody.value.trim() || !props.onPostIncident) return;
  busy.value = true;
  incError.value = null;
  try {
    const r = await props.onPostIncident({ title: incTitle.value.trim(), body: incBody.value.trim(), impact: incImpact.value, status: incStatus.value, serviceIds: incIds.value });
    if (r && r.error) incError.value = r.error;
    else open.value = false;
  } catch {
    incError.value = t.value.genericError;
  } finally {
    busy.value = false;
  }
}
function setId(id: string, on: boolean) {
  incIds.value = on ? [...incIds.value, id] : incIds.value.filter((x) => x !== id);
}
</script>

<template>
  <NqCard data-slot="status-page-manager" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3">{{ t.title }}</NqCardTitle>
        <div class="flex items-center gap-2">
          <NqButton v-if="publicUrl" variant="ghost" size="sm" as="a" :href="publicUrl" target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            {{ t.view }}
          </NqButton>
          <NqButton v-if="onPostIncident" variant="primary" size="sm" @click="open = true">
            <Megaphone aria-hidden="true" />
            {{ t.post }}
          </NqButton>
        </div>
      </div>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-6">
      <NqAlert v-if="error" tone="danger" @dismiss="error = null">{{ error }}</NqAlert>
      <NqAlert v-if="saved && !dirty" tone="success">{{ t.saved }}</NqAlert>

      <section :aria-label="t.settings" class="grid gap-4 sm:grid-cols-2">
        <NqField :invalid="tried && titleBad">
          <NqFieldLabel>{{ t.pageTitle }}</NqFieldLabel>
          <NqInput v-model="draft.title" dir="auto" />
          <NqFieldError v-if="tried && titleBad" :match="true">{{ t.required }}</NqFieldError>
        </NqField>
        <NqField :invalid="tried && slugBad">
          <NqFieldLabel>{{ t.slug }}</NqFieldLabel>
          <NqInput v-model="draft.slug" ltr />
          <NqFieldError v-if="tried && slugBad" :match="true">{{ t.slugError }}</NqFieldError>
          <NqFieldDescription v-else>{{ t.slugHint }}</NqFieldDescription>
        </NqField>
        <NqField class="sm:col-span-2">
          <NqFieldLabel>{{ t.domain }}</NqFieldLabel>
          <NqInput :model-value="draft.domain ?? ''" ltr placeholder="status.example.com" @update:model-value="(v?: string | number) => (draft.domain = String(v ?? ''))" />
          <NqFieldDescription>{{ t.domainHint }}</NqFieldDescription>
        </NqField>
      </section>

      <section aria-labelledby="spm-services" class="grid gap-2">
        <div>
          <h4 id="spm-services" class="text-label text-foreground">{{ t.services }}</h4>
          <p class="text-body-sm text-muted-foreground">{{ t.servicesHint }}</p>
        </div>
        <ul class="divide-y divide-border rounded-control border border-border">
          <li v-for="(s, i) in draft.services" :key="s.id" data-slot="managed-service" class="flex items-center gap-3 px-3 py-2">
            <NqSwitch :aria-label="t.show(s.name)" :model-value="s.visible" @update:model-value="(v: boolean) => toggle(s.id, v)" />
            <span :class="cn('min-w-0 flex-1 truncate text-body-sm', s.visible ? 'text-foreground' : 'text-muted-foreground')" dir="auto">{{ s.name }}</span>
            <NqBadge v-if="!s.visible" variant="neutral">{{ t.hidden }}</NqBadge>
            <NqButton variant="ghost" size="icon-sm" :aria-label="t.up(s.name)" :disabled="i === 0" @click="move(i, -1)">
              <ArrowUp aria-hidden="true" class="rtl:-scale-x-100" />
            </NqButton>
            <NqButton variant="ghost" size="icon-sm" :aria-label="t.down(s.name)" :disabled="i === draft.services.length - 1" @click="move(i, 1)">
              <ArrowDown aria-hidden="true" />
            </NqButton>
          </li>
        </ul>
      </section>

      <div class="flex items-center justify-end gap-2">
        <span v-if="dirty" class="me-auto text-body-sm text-muted-foreground">{{ t.dirty }}</span>
        <NqButton variant="ghost" :disabled="!dirty || saving" @click="discard">{{ t.discard }}</NqButton>
        <NqButton variant="primary" :disabled="!dirty" :loading="saving" @click="save">{{ t.save }}</NqButton>
      </div>

      <section v-if="incidents.length" aria-labelledby="spm-incidents" class="grid gap-3">
        <h4 id="spm-incidents" class="text-label text-foreground">{{ t.incidents }}</h4>
        <NqIncidentList :incidents="incidents" />
      </section>
    </NqCardContent>

    <NqDialog v-if="onPostIncident" :open="open" @update:open="(o: boolean) => !busy && (open = o)">
      <NqDialogContent>
        <form class="grid gap-4" novalidate @submit.prevent="post">
          <NqDialogHeader>
            <NqDialogTitle>{{ t.dialogTitle }}</NqDialogTitle>
            <NqDialogDescription>{{ t.dialogBody }}</NqDialogDescription>
          </NqDialogHeader>
          <NqAlert v-if="incError" tone="danger">{{ incError }}</NqAlert>
          <NqField :invalid="incTried && !incTitle.trim()">
            <NqFieldLabel>{{ t.incTitle }}</NqFieldLabel>
            <NqInput v-model="incTitle" dir="auto" />
            <NqFieldError v-if="incTried && !incTitle.trim()" :match="true">{{ t.required }}</NqFieldError>
          </NqField>
          <NqField :invalid="incTried && !incBody.trim()">
            <NqFieldLabel>{{ t.incBody }}</NqFieldLabel>
            <NqTextarea v-model="incBody" dir="auto" :rows="3" />
            <NqFieldError v-if="incTried && !incBody.trim()" :match="true">{{ t.required }}</NqFieldError>
          </NqField>
          <div class="grid gap-4 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.incImpact }}</NqFieldLabel>
              <NqSelect :model-value="incImpact" @update:model-value="(v: string | number | null) => v && (incImpact = String(v) as IncidentImpact)">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in impactItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.incStatus }}</NqFieldLabel>
              <NqSelect :model-value="incStatus" @update:model-value="(v: string | number | null) => v && (incStatus = String(v) as IncidentStatus)">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="o in statusItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
          </div>
          <fieldset class="grid gap-2">
            <legend class="mb-1 text-label text-foreground">{{ t.incServices }}</legend>
            <label v-for="s in settings.services" :key="s.id" class="flex items-center gap-2 text-body-sm">
              <input type="checkbox" class="size-4 accent-[var(--nq-brand)]" :checked="incIds.includes(s.id)" @change="(e) => setId(s.id, (e.target as HTMLInputElement).checked)" />
              <span dir="auto">{{ s.name }}</span>
            </label>
          </fieldset>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" :disabled="busy" @click="open = false">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :loading="busy">{{ t.publish }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>
  </NqCard>
</template>
