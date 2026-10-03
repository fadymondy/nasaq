<script setup lang="ts">
import { ArrowLeft, ArrowRight, LayoutGrid, Wrench } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqApiReferenceFilters from "./NqApiReferenceFilters.vue";
import NqApiToolCatalog from "./NqApiToolCatalog.vue";
import NqApiToolDetail from "./NqApiToolDetail.vue";
import { countByAccess, filterTools, groupTools, type ToolAccess } from "./format";
import { STRINGS, type ApiReferenceLabels } from "./strings";
import type { ApiTool } from "./types";

// An API or MCP tool reference: a searchable list of tools beside the selected tool's scope, minimum role,
// arguments table and example call and result, plus a catalog view with cards. It renders the data you pass.
interface Props {
  tools: ApiTool[];
  /** Open tool id (`v-model:selected-id`). Uncontrolled when omitted (starts on the first tool). */
  selectedId?: string;
  /** `"reference"` (list plus detail) or `"catalog"` (cards), controlled (`v-model:view`). Uncontrolled when omitted. */
  view?: "reference" | "catalog";
  defaultView?: "reference" | "catalog";
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ApiReferenceLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { selectedId: undefined, view: undefined, defaultView: "reference", labels: undefined });
const emit = defineEmits<{ "update:selectedId": [id: string]; "update:view": [view: "reference" | "catalog"] }>();

const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const t = computed<ApiReferenceLabels>(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const num = (n: number) => formatNumber(n, nasaq.locale.value);

const query = ref("");
const category = ref("all");
const access = ref<ToolAccess | "all">("all");
const innerId = ref<string | undefined>(undefined);
const innerView = ref<"reference" | "catalog">(props.defaultView);
const mobileList = ref(true);

const currentView = computed(() => props.view ?? innerView.value);
const categories = computed(() => [...new Set(props.tools.map((x) => x.category).filter((c): c is string => !!c))]);
const accessCounts = computed(() => countByAccess(props.tools));
const listed = computed(() => filterTools(props.tools, { query: query.value, category: category.value, access: access.value }));
const groups = computed(() => groupTools(listed.value));
const openId = computed(() => props.selectedId ?? innerId.value ?? props.tools[0]?.id);
const open = computed(() => props.tools.find((x) => x.id === openId.value));

function select(id: string) {
  innerId.value = id;
  emit("update:selectedId", id);
  mobileList.value = false;
}
function setView(v: "reference" | "catalog") {
  innerView.value = v;
  emit("update:view", v);
}
function clear() {
  query.value = "";
  category.value = "all";
  access.value = "all";
}
function onCatalogSelect(tool: ApiTool) {
  select(tool.id);
  setView("reference");
}
</script>

<template>
  <div data-slot="api-reference" :data-view="currentView" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-body-sm text-muted-foreground" role="status">{{ t.results(num(listed.length)) }}</p>
      <NqToggleGroup :model-value="[currentView]" :aria-label="t.view" @update:model-value="(v: string[]) => v[0] && setView(v[0] as 'reference' | 'catalog')">
        <NqToggle value="reference">
          <Wrench aria-hidden="true" />
          {{ t.reference }}
        </NqToggle>
        <NqToggle value="catalog">
          <LayoutGrid aria-hidden="true" />
          {{ t.catalog }}
        </NqToggle>
      </NqToggleGroup>
    </div>

    <div v-if="currentView === 'catalog'" class="flex min-w-0 flex-col gap-4">
      <NqApiReferenceFilters v-model:query="query" v-model:category="category" v-model:access="access" :categories="categories" :access-counts="accessCounts" :t="t" />
      <NqApiToolCatalog v-if="listed.length" :tools="listed" :labels="props.labels" @select="onCatalogSelect" />
      <NqEmptyState v-else :title="t.emptyTitle" :description="t.emptyBody">
        <template #actions><NqButton variant="secondary" @click="clear">{{ t.clear }}</NqButton></template>
      </NqEmptyState>
    </div>

    <div v-else class="grid min-w-0 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <nav :aria-label="t.tools" :class="cn('flex min-w-0 flex-col gap-3 lg:self-start', !mobileList && 'max-lg:hidden')">
        <NqApiReferenceFilters v-model:query="query" v-model:category="category" v-model:access="access" :categories="categories" :access-counts="accessCounts" :t="t" />
        <NqEmptyState v-if="listed.length === 0" :title="t.emptyTitle" :description="t.emptyBody">
          <template #actions><NqButton variant="secondary" @click="clear">{{ t.clear }}</NqButton></template>
        </NqEmptyState>
        <div v-else class="flex max-h-[calc(100vh-14rem)] min-h-40 flex-col gap-3 overflow-y-auto">
          <section v-for="g in groups" :key="g.category" class="flex flex-col gap-1">
            <h3 v-if="g.category" class="eyebrow px-2">{{ g.category }}</h3>
            <ul class="flex flex-col">
              <li v-for="tool in g.tools" :key="tool.id">
                <button
                  type="button"
                  :aria-current="tool.id === openId ? 'true' : undefined"
                  :class="cn('flex w-full min-w-0 flex-col items-start gap-0.5 rounded-control px-2 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus', tool.id === openId && 'bg-secondary')"
                  @click="select(tool.id)"
                >
                  <bdi dir="ltr" class="max-w-full truncate font-mono text-code text-foreground">{{ tool.name }}</bdi>
                  <span dir="auto" class="line-clamp-1 max-w-full text-caption text-muted-foreground">{{ tool.summary }}</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
      </nav>
      <div :class="cn('min-w-0', mobileList && 'max-lg:hidden')">
        <NqButton variant="ghost" size="sm" class="mb-3 lg:hidden" @click="mobileList = true">
          <ArrowRight v-if="ar" aria-hidden="true" />
          <ArrowLeft v-else aria-hidden="true" />
          {{ t.back }}
        </NqButton>
        <NqApiToolDetail v-if="open" :tool="open" :labels="props.labels" />
        <NqEmptyState v-else :title="t.emptyTitle" :description="t.emptyBody" />
      </div>
    </div>
  </div>
</template>
