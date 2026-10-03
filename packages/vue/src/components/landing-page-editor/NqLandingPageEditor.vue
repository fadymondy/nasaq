<script setup lang="ts">
import { ArrowDown, ArrowUp, CircleHelp, Copy, Eye, EyeOff, LayoutTemplate, Megaphone, MoreHorizontal, Monitor, Plus, Rocket, Smartphone, Sparkles, Trash2, Type } from "lucide-vue-next";
import { computed, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldLabel } from "../field";
import { formatNumber } from "../numeric";
import type { RichTextTiptap } from "../rich-text-editor";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqLandingPagePreview from "./NqLandingPagePreview.vue";
import NqLandingSectionForm from "./NqLandingSectionForm.vue";
import NqLandingTextField from "./NqLandingTextField.vue";
import {
  createSection,
  duplicateSection,
  isValidSlug,
  moveSection,
  patchSection,
  publishBlockers,
  SECTION_TYPES,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  type LandingPage,
  type LandingSection,
  type LandingSectionType,
  type SectionDataMap,
} from "./landing-page";
import { landingStrings, type LandingPageEditorLabelOverrides } from "./strings";

/**
 * A landing page editor in three panes: an outline of sections (add, reorder, hide, duplicate, delete), a live preview
 * at desktop or phone width, and a form for the selected section or the page (address, search title and description,
 * direction). Below `lg` the panes become tabs. Controlled (v-model) or uncontrolled; saving and publishing are async callbacks.
 * Text sections use the rich text editor when `load` (the Tiptap loader) is given, and an HTML textarea otherwise.
 */
type Result = void | { error?: string };
interface Props {
  /** The page. Use with v-model. */
  modelValue?: LandingPage;
  defaultValue?: LandingPage;
  /** Save as draft. Resolve with `{ error }` to show a message. */
  onSave?: (page: LandingPage) => Promise<Result>;
  /** Publish the page. The button is disabled while the page has blockers (no title, bad address, nothing visible, unsafe links). */
  onPublish?: (page: LandingPage) => Promise<Result>;
  /** Which section types can be added. Default all five. */
  sectionTypes?: readonly LandingSectionType[];
  /** Loads Tiptap for text sections: `() => import("./tiptap")`. Without it they are HTML textareas. */
  load?: () => Promise<RichTextTiptap>;
  labels?: LandingPageEditorLabelOverrides;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, onSave: undefined, onPublish: undefined, sectionTypes: () => SECTION_TYPES, load: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [page: LandingPage] }>();

const nq = useNasaq();
const t = computed(() => landingStrings(nq.locale.value, props.labels));
const lang = computed<"en" | "ar">(() => (nq.locale.value.startsWith("ar") ? "ar" : "en"));
const num = (n: number) => formatNumber(n, nq.locale.value);

const inner = ref<LandingPage>(props.defaultValue ?? { title: "", slug: "", seoTitle: "", seoDescription: "", dir: lang.value === "ar" ? "rtl" : "ltr", sections: [], status: "draft" });
const page = computed(() => props.modelValue ?? inner.value);
const saved = ref(JSON.stringify(page.value));
const selectedId = ref<string | null>(page.value.sections[0]?.id ?? null);
const panel = ref<"section" | "page">("section");
const pane = ref<"sections" | "edit" | "preview">("sections");
const device = ref<"desktop" | "mobile">("desktop");
const busy = ref<null | "save" | "publish">(null);
const message = ref<{ tone: "danger" | "success"; text: string } | null>(null);

const TYPE_ICON: Record<LandingSectionType, Component> = { hero: Rocket, features: Sparkles, faq: CircleHelp, cta: Megaphone, text: Type };

function summary(section: LandingSection): string {
  switch (section.type) {
    case "hero":
      return section.data.headline;
    case "features":
    case "faq":
    case "cta":
      return section.data.title;
    case "text":
      return section.data.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function set(next: LandingPage) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}
const setSections = (sections: LandingSection[]) => set({ ...page.value, sections });
const selected = computed(() => page.value.sections.find((s) => s.id === selectedId.value) ?? null);
const dirty = computed(() => JSON.stringify(page.value) !== saved.value);
const blockers = computed(() => publishBlockers(page.value));
const dirItems = computed(() => [
  { value: "ltr", label: t.value.ltr },
  { value: "rtl", label: t.value.rtl },
]);
const count = (n: number, max: number) => t.value.characters(num(n), num(max));

function select(id: string) {
  selectedId.value = id;
  panel.value = "section";
  pane.value = "edit";
}
function add(type: LandingSectionType) {
  const section = createSection(type, lang.value);
  // New sections go after the selected one, or at the end.
  const at = selected.value ? page.value.sections.findIndex((s) => s.id === selected.value!.id) + 1 : page.value.sections.length;
  setSections([...page.value.sections.slice(0, at), section, ...page.value.sections.slice(at)]);
  select(section.id);
}
function remove(id: string) {
  const index = page.value.sections.findIndex((s) => s.id === id);
  const next = page.value.sections.filter((s) => s.id !== id);
  setSections(next);
  if (selectedId.value === id) selectedId.value = next[Math.min(index, next.length - 1)]?.id ?? null;
}
function toggleVisible(id: string) {
  setSections(page.value.sections.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)));
}
function duplicate(i: number) {
  const copy = duplicateSection(page.value.sections[i]!);
  setSections([...page.value.sections.slice(0, i + 1), copy, ...page.value.sections.slice(i + 1)]);
  select(copy.id);
}
const patchSelected = (patch: Partial<SectionDataMap[LandingSectionType]>) => selected.value && setSections(patchSection(page.value.sections, selected.value.id, patch));

async function run(kind: "save" | "publish", fn: ((p: LandingPage) => Promise<Result>) | undefined) {
  if (!fn) return;
  busy.value = kind;
  message.value = null;
  try {
    const current = page.value;
    const result = await fn(kind === "publish" ? { ...current, status: "published" } : current);
    if (result && result.error) {
      message.value = { tone: "danger", text: result.error };
      return;
    }
    const next = kind === "publish" ? { ...current, status: "published" as const } : current;
    if (kind === "publish") set(next);
    saved.value = JSON.stringify(next);
    message.value = { tone: "success", text: kind === "publish" ? t.value.publishedOk : t.value.saved };
  } catch {
    message.value = { tone: "danger", text: t.value.failed };
  } finally {
    busy.value = null;
  }
}

const paneClass = (name: typeof pane.value) => cn("min-w-0", pane.value !== name && "max-lg:hidden");
</script>

<template>
  <div data-slot="landing-page-editor" role="group" :aria-label="t.editor" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-label text-foreground">{{ page.title || t.untitled }}</span>
        <NqBadge :variant="page.status === 'published' ? 'success' : 'neutral'">{{ page.status === "published" ? t.published : t.draft }}</NqBadge>
        <span v-if="dirty" class="text-caption text-muted-foreground">{{ t.unsaved }}</span>
      </div>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <NqToggleGroup :model-value="[device]" :aria-label="t.preview" class="max-lg:hidden" @update:model-value="(v: string[]) => v[0] && (device = v[0] as 'desktop' | 'mobile')">
          <NqToggle value="desktop" :aria-label="t.desktop"><Monitor aria-hidden="true" class="size-4" /></NqToggle>
          <NqToggle value="mobile" :aria-label="t.mobile"><Smartphone aria-hidden="true" class="size-4" /></NqToggle>
        </NqToggleGroup>
        <NqButton v-if="props.onSave" :loading="busy === 'save'" :disabled="!dirty || busy === 'publish'" @click="run('save', props.onSave)">{{ t.saveDraft }}</NqButton>
        <NqButton v-if="props.onPublish" variant="primary" :loading="busy === 'publish'" :disabled="blockers.length > 0 || busy === 'save' || (!dirty && page.status === 'published')" @click="run('publish', props.onPublish)">
          <Rocket aria-hidden="true" />
          {{ page.status === "published" ? t.update : t.publish }}
        </NqButton>
      </div>
    </div>
    <NqAlert v-if="message" :tone="message.tone">{{ message.text }}</NqAlert>
    <ul v-if="blockers.length > 0 && props.onPublish" :aria-label="t.publish" class="flex flex-col gap-0.5 text-caption text-muted-foreground">
      <li v-for="b in blockers" :key="b">{{ t.blockers[b] }}</li>
    </ul>

    <NqTabs :model-value="pane" class="lg:hidden" @update:model-value="(v) => (pane = v as typeof pane)">
      <NqTabsList :aria-label="t.editor">
        <NqTabsTab value="sections">{{ t.sections }}</NqTabsTab>
        <NqTabsTab value="edit">{{ t.edit }}</NqTabsTab>
        <NqTabsTab value="preview">{{ t.preview }}</NqTabsTab>
      </NqTabsList>
    </NqTabs>

    <div class="grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_20rem]">
      <!-- Outline -->
      <section :aria-label="t.sections" :class="cn(paneClass('sections'), 'flex flex-col gap-2')">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-label text-foreground">{{ t.sections }}</h3>
          <NqDropdownMenu>
            <NqDropdownMenuTrigger as-child>
              <NqButton size="sm"><Plus aria-hidden="true" />{{ t.addSection }}</NqButton>
            </NqDropdownMenuTrigger>
            <NqDropdownMenuContent align="end" class="min-w-48">
              <NqDropdownMenuItem v-for="type in props.sectionTypes" :key="type" @select="add(type)">
                <component :is="TYPE_ICON[type]" aria-hidden="true" />
                {{ t.types[type] }}
              </NqDropdownMenuItem>
            </NqDropdownMenuContent>
          </NqDropdownMenu>
        </div>
        <NqEmptyState v-if="page.sections.length === 0" :icon="LayoutTemplate" :title="t.noSections" :description="t.noSectionsHint" />
        <ol v-else class="flex flex-col gap-1.5">
          <li v-for="(s, i) in page.sections" :key="s.id" :data-active="s.id === selectedId || undefined" :class="cn('flex items-center gap-1 rounded-control border bg-card ps-1', s.id === selectedId ? 'border-nq-focus' : 'border-border')">
            <button
              type="button"
              :aria-current="s.id === selectedId || undefined"
              :class="cn('flex min-w-0 flex-1 items-center gap-2 rounded-control p-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', !s.visible && 'opacity-60')"
              @click="select(s.id)"
            >
              <component :is="TYPE_ICON[s.type]" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
              <span class="flex min-w-0 flex-col">
                <span class="flex items-center gap-1.5 text-label text-foreground">
                  {{ t.types[s.type] }}
                  <EyeOff v-if="!s.visible" :aria-label="t.hidden" class="size-3 text-muted-foreground" />
                </span>
                <span dir="auto" class="truncate text-caption text-muted-foreground">{{ summary(s) }}</span>
              </span>
            </button>
            <NqDropdownMenu>
              <NqDropdownMenuTrigger as-child>
                <NqButton variant="ghost" size="icon-sm" :aria-label="t.sectionActions(t.types[s.type])"><MoreHorizontal aria-hidden="true" /></NqButton>
              </NqDropdownMenuTrigger>
              <NqDropdownMenuContent align="end" class="min-w-44">
                <NqDropdownMenuItem :disabled="i === 0" @select="setSections(moveSection(page.sections, i, -1))"><ArrowUp aria-hidden="true" />{{ t.moveUp }}</NqDropdownMenuItem>
                <NqDropdownMenuItem :disabled="i === page.sections.length - 1" @select="setSections(moveSection(page.sections, i, 1))"><ArrowDown aria-hidden="true" />{{ t.moveDown }}</NqDropdownMenuItem>
                <NqDropdownMenuItem @select="toggleVisible(s.id)">
                  <EyeOff v-if="s.visible" aria-hidden="true" />
                  <Eye v-else aria-hidden="true" />
                  {{ s.visible ? t.hide : t.show }}
                </NqDropdownMenuItem>
                <NqDropdownMenuItem @select="duplicate(i)"><Copy aria-hidden="true" />{{ t.duplicate }}</NqDropdownMenuItem>
                <NqDropdownMenuSeparator />
                <NqDropdownMenuItem variant="danger" @select="remove(s.id)"><Trash2 aria-hidden="true" />{{ t.remove }}</NqDropdownMenuItem>
              </NqDropdownMenuContent>
            </NqDropdownMenu>
          </li>
        </ol>
      </section>

      <!-- Preview -->
      <section :aria-label="t.preview" :class="paneClass('preview')">
        <div class="mb-2 flex items-center justify-between gap-2 lg:hidden">
          <span class="text-label text-foreground">{{ t.preview }}</span>
          <NqToggleGroup :model-value="[device]" :aria-label="t.preview" @update:model-value="(v: string[]) => v[0] && (device = v[0] as 'desktop' | 'mobile')">
            <NqToggle value="desktop" :aria-label="t.desktop"><Monitor aria-hidden="true" class="size-4" /></NqToggle>
            <NqToggle value="mobile" :aria-label="t.mobile"><Smartphone aria-hidden="true" class="size-4" /></NqToggle>
          </NqToggleGroup>
        </div>
        <NqLandingPagePreview :page="page" :selected-id="selectedId" :device="device" :t="t" @select="select" />
      </section>

      <!-- Inspector -->
      <section :aria-label="t.edit" :class="cn(paneClass('edit'), 'flex flex-col gap-4')">
        <NqTabs :model-value="panel" @update:model-value="(v) => (panel = v as typeof panel)">
          <NqTabsList>
            <NqTabsTab value="section">{{ t.section }}</NqTabsTab>
            <NqTabsTab value="page">{{ t.page }}</NqTabsTab>
          </NqTabsList>
        </NqTabs>
        <div v-if="panel === 'page'" class="flex flex-col gap-4">
          <NqLandingTextField :label="t.pageTitle" :model-value="page.title" @update:model-value="(v) => set({ ...page, title: v })" />
          <NqLandingTextField
            :label="t.slug"
            :model-value="page.slug"
            ltr
            :hint="t.slugHint"
            :error="page.slug && !isValidSlug(page.slug) ? t.slugInvalid : undefined"
            @update:model-value="(v) => set({ ...page, slug: v.toLowerCase().replace(/\s+/g, '-') })"
          />
          <NqLandingTextField :label="t.seoTitle" :model-value="page.seoTitle" :hint="count(page.seoTitle.length, SEO_TITLE_MAX)" @update:model-value="(v) => set({ ...page, seoTitle: v })" />
          <NqLandingTextField :label="t.seoDescription" :model-value="page.seoDescription" multiline :hint="count(page.seoDescription.length, SEO_DESCRIPTION_MAX)" @update:model-value="(v) => set({ ...page, seoDescription: v })" />
          <NqField>
            <NqFieldLabel>{{ t.direction }}</NqFieldLabel>
            <NqSelect :model-value="page.dir" @update:model-value="(v: string | number | null) => v && set({ ...page, dir: v as 'ltr' | 'rtl' })">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in dirItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <template v-else-if="selected">
          <h3 class="text-label text-foreground">{{ t.types[selected.type] }}</h3>
          <NqLandingSectionForm :key="selected.id" :section="selected" :t="t" :load="props.load" @patch="patchSelected" />
        </template>
        <p v-else class="text-body-sm text-muted-foreground">{{ t.selectHint }}</p>
      </section>
    </div>
  </div>
</template>
