<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, ExternalLink, LayoutGrid, List, Network, Search, X } from "lucide-vue-next";
import { computed, ref, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqDateTime, formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { adjacency, filterNodes, linksAmong, sortRows, type ListSortKey } from "./graph-layout";
import NqGraphCanvas from "./NqGraphCanvas.vue";
import NqGraphSchema from "./NqGraphSchema.vue";
import { GRAPH_STRINGS, hueVar, type GraphLabelPosition, type GraphViewKind, type GraphViewLabels, type GraphViewLink, type GraphViewLinkKind, type GraphViewMode, type GraphViewNode } from "./types";

/**
 * One knowledge graph, four ways to look at it: a live force-directed graph you can drag, pan and zoom, a grid
 * of cards, a sortable list, and a schema of columns (one per type) with connectors between related cards.
 * Search and type filters apply to all of them, the selection follows you from one to the next, and an
 * inspector shows the selected node with everything it links to. Slots: `node` draws a graph node yourself,
 * `actions` adds inspector actions, `toolbar-end` adds toolbar controls.
 */
interface Props {
  nodes: GraphViewNode[];
  links: GraphViewLink[];
  kinds: GraphViewKind[];
  /** How link kinds (`link.kind`) are drawn: solid, dashed or flowing, with an arrowhead. */
  linkKinds?: GraphViewLinkKind[];
  mode?: GraphViewMode;
  defaultMode?: GraphViewMode;
  /** The selected node id (`v-model:selected-id`). `null` is a controlled "nothing selected". */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Adds an "Open" button to the inspector. */
  onOpen?: (node: GraphViewNode) => void;
  /** Live force simulation: nodes settle on load and move when dragged. Default `true`. Always off under `prefers-reduced-motion`. */
  animate?: boolean;
  /** Default label position for every node. Default `"bottom"`. */
  labelPosition?: GraphLabelPosition;
  /** Arrowheads on every link, not just the link kinds that ask for them. */
  arrows?: boolean;
  /** Height of the whole view. Default `100%`, minimum 420px. */
  height?: number | string;
  labels?: Partial<GraphViewLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  linkKinds: undefined, mode: undefined, defaultMode: "graph", selectedId: undefined, defaultSelectedId: null, onOpen: undefined, animate: true, labelPosition: "bottom", arrows: false, height: "100%", labels: undefined,
});
const emit = defineEmits<{ "update:mode": [mode: GraphViewMode]; "update:selectedId": [id: string | null]; "pinned-change": [ids: string[]] }>();
const slots = useSlots();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...GRAPH_STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as GraphViewLabels);
const num = (n: number) => formatNumber(n, locale.value);

const innerMode = ref<GraphViewMode>(props.defaultMode);
const innerSelected = ref<string | null>(props.defaultSelectedId);
const view = computed(() => props.mode ?? innerMode.value);
const selected = computed(() => (props.selectedId !== undefined ? props.selectedId : innerSelected.value));
function setView(v: GraphViewMode) {
  innerMode.value = v;
  emit("update:mode", v);
}
function setSelected(id: string | null) {
  innerSelected.value = id;
  emit("update:selectedId", id);
}
const query = ref("");
const picked = ref<string[]>([]);

const kindById = computed(() => new Map(props.kinds.map((k) => [k.id, k])));
const linkKindById = computed(() => new Map((props.linkKinds ?? []).map((k) => [k.id, k])));
const shownNodes = computed(() => filterNodes(props.nodes, { query: query.value, kinds: picked.value }));
const ids = computed(() => new Set(shownNodes.value.map((n) => n.id)));
const shownLinks = computed(() => linksAmong(props.links, ids.value));
const around = computed(() => adjacency(props.links));
const byId = computed(() => new Map(props.nodes.map((n) => [n.id, n])));
const node = computed(() => (selected.value ? byId.value.get(selected.value) : undefined));
const filtered = computed(() => query.value.trim() !== "" || picked.value.length > 0);
const kindOf = (id: string) => kindById.value.get(id);
const linkKindOf = (id: string | undefined) => (id === undefined ? undefined : linkKindById.value.get(id));

/* list */
const sort = ref<{ key: ListSortKey; dir: "asc" | "desc" }>({ key: "label", dir: "asc" });
const rows = computed(() =>
  sortRows(
    shownNodes.value.map((n) => ({ node: n, label: n.label, kind: kindOf(n.kind)?.label ?? n.kind, links: around.value.get(n.id)?.size ?? 0, ...(n.updatedAt !== undefined ? { updated: new Date(n.updatedAt).getTime() } : {}) })),
    sort.value.key,
    sort.value.dir,
    locale.value,
  ),
);
const sortIcon = (key: ListSortKey) => (sort.value.key !== key ? ArrowUpDown : sort.value.dir === "asc" ? ArrowUp : ArrowDown);
const ariaSort = (key: ListSortKey) => (sort.value.key === key ? (sort.value.dir === "asc" ? "ascending" : "descending") : "none");
const sortBy = (key: ListSortKey) => (sort.value = { key, dir: sort.value.key === key && sort.value.dir === "asc" ? "desc" : "asc" });
const columns: { key: ListSortKey; text: () => string }[] = [
  { key: "label", text: () => t.value.colName },
  { key: "kind", text: () => t.value.colKind },
  { key: "links", text: () => t.value.colLinks },
  { key: "updated", text: () => t.value.colUpdated },
];

/* inspector */
const outgoing = computed(() => (node.value ? props.links.filter((l) => l.source === node.value!.id && byId.value.has(l.target)) : []));
const incoming = computed(() => (node.value ? props.links.filter((l) => l.target === node.value!.id && byId.value.has(l.source)) : []));
const lists = computed(() => [
  { title: t.value.linksTo, items: outgoing.value.map((l) => ({ id: l.target, label: l.label })) },
  { title: t.value.linkedFrom, items: incoming.value.map((l) => ({ id: l.source, label: l.label })) },
]);

const clear = () => {
  query.value = "";
  picked.value = [];
};
const toggleSelected = (id: string) => setSelected(id === selected.value ? null : id);
</script>

<template>
  <div data-slot="graph-view" :data-mode="view" :style="{ height: typeof props.height === 'number' ? `${props.height}px` : props.height, minHeight: '420px' }" :class="cn('relative flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-background', props.class)">
    <div class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
      <div class="relative min-w-40 flex-1 sm:max-w-72">
        <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <NqInput v-model="query" :placeholder="t.search" :aria-label="t.search" class="ps-8" type="search" />
      </div>
      <NqToggleGroup v-model="picked" multiple :aria-label="t.kinds" class="flex-wrap">
        <NqToggle v-for="k in kinds" :key="k.id" :value="k.id" :aria-label="k.label">
          <span aria-hidden="true" class="size-2.5 rounded-full" :style="{ backgroundColor: hueVar(k.hue) }" />
          {{ k.label }}
        </NqToggle>
      </NqToggleGroup>
      <div class="ms-auto flex items-center gap-2">
        <span class="hidden text-caption text-muted-foreground sm:inline"><bdi>{{ t.counts(num(shownNodes.length), num(shownLinks.length)) }}</bdi></span>
        <NqToggleGroup :model-value="[view]" :aria-label="t.view" @update:model-value="(v: string[]) => v[0] && setView(v[0] as GraphViewMode)">
          <NqToggle value="graph" :aria-label="t.graph" :title="t.graph"><Network aria-hidden="true" /><span class="hidden md:inline">{{ t.graph }}</span></NqToggle>
          <NqToggle value="schema" :aria-label="t.schema" :title="t.schema"><Columns3 aria-hidden="true" /><span class="hidden md:inline">{{ t.schema }}</span></NqToggle>
          <NqToggle value="grid" :aria-label="t.grid" :title="t.grid"><LayoutGrid aria-hidden="true" /><span class="hidden md:inline">{{ t.grid }}</span></NqToggle>
          <NqToggle value="list" :aria-label="t.list" :title="t.list"><List aria-hidden="true" /><span class="hidden md:inline">{{ t.list }}</span></NqToggle>
        </NqToggleGroup>
        <slot name="toolbar-end" />
      </div>
    </div>

    <div class="relative flex min-h-0 flex-1">
      <div class="relative min-w-0 flex-1">
        <div v-if="shownNodes.length === 0" class="flex h-full items-center justify-center p-6">
          <NqEmptyState :title="t.emptyTitle" :description="t.emptyBody">
            <template v-if="filtered" #actions><NqButton variant="secondary" @click="clear">{{ t.clear }}</NqButton></template>
          </NqEmptyState>
        </div>
        <NqGraphCanvas
          v-else-if="view === 'graph'"
          :nodes="shownNodes" :links="shownLinks" :around="around" :kind-of="kindOf" :link-kind-of="linkKindOf" :selected="selected" :t="t" :animate="props.animate" :label-position="props.labelPosition" :arrows="props.arrows"
          @select="setSelected" @pinned="(v: string[]) => emit('pinned-change', v)"
        >
          <template v-if="slots.node" #node="ctx"><slot name="node" v-bind="ctx" /></template>
        </NqGraphCanvas>
        <NqGraphSchema v-else-if="view === 'schema'" :nodes="shownNodes" :links="shownLinks" :kinds="kinds" :around="around" :kind-of="kindOf" :link-kind-of="linkKindOf" :arrows="props.arrows" :selected="selected" :t="t" :num="num" :rtl="ar" @select="setSelected" />
        <ul v-else-if="view === 'grid'" class="grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-3 overflow-y-auto p-3">
          <li v-for="n in shownNodes" :key="n.id" class="min-w-0">
            <button
              type="button"
              :aria-pressed="n.id === selected"
              :data-node="n.id"
              :class="cn('flex h-full w-full flex-col gap-2 rounded-card border bg-card p-3 text-start shadow-xs outline-none transition-colors hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', n.id === selected ? 'border-primary bg-nq-selected' : 'border-border')"
              @click="toggleSelected(n.id)"
            >
              <span class="flex items-center gap-2.5">
                <span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-4" :style="{ backgroundColor: hueVar(kindOf(n.kind)?.hue) }">
                  <component :is="kindOf(n.kind)!.icon" v-if="kindOf(n.kind)?.icon" />
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-label text-foreground">{{ n.label }}</span>
                  <span class="block truncate text-caption text-muted-foreground">{{ kindOf(n.kind)?.label ?? n.kind }}</span>
                </span>
              </span>
              <span v-if="n.description" class="line-clamp-2 text-body-sm text-muted-foreground">{{ n.description }}</span>
              <span class="mt-auto flex items-center justify-between gap-2 text-caption text-muted-foreground">
                <bdi>{{ t.connections(num(around.get(n.id)?.size ?? 0)) }}</bdi>
                <NqDateTime v-if="n.updatedAt !== undefined" :value="n.updatedAt" relative />
              </span>
            </button>
          </li>
        </ul>
        <div v-else class="h-full overflow-auto">
          <NqTable :label="t.list">
            <NqTableHeader>
              <NqTableRow>
                <NqTableHead v-for="c in columns" :key="c.key" :aria-sort="ariaSort(c.key)">
                  <button type="button" class="inline-flex items-center gap-1 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click="sortBy(c.key)">
                    {{ c.text() }}
                    <component :is="sortIcon(c.key)" aria-hidden="true" :class="cn('size-3.5', sort.key !== c.key && 'text-muted-foreground')" />
                  </button>
                </NqTableHead>
              </NqTableRow>
            </NqTableHeader>
            <NqTableBody>
              <NqTableRow v-for="r in rows" :key="r.node.id" :data-node="r.node.id" :data-state="r.node.id === selected ? 'selected' : undefined" :class="cn('cursor-pointer', r.node.id === selected && 'bg-nq-selected')" @click="toggleSelected(r.node.id)">
                <NqTableCell>
                  <button type="button" :aria-pressed="r.node.id === selected" class="text-start text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click.stop="toggleSelected(r.node.id)">{{ r.node.label }}</button>
                </NqTableCell>
                <NqTableCell>
                  <span class="inline-flex items-center gap-2">
                    <span aria-hidden="true" class="size-2.5 rounded-full" :style="{ backgroundColor: hueVar(kindOf(r.node.kind)?.hue) }" />
                    {{ kindOf(r.node.kind)?.label ?? r.node.kind }}
                  </span>
                </NqTableCell>
                <NqTableCell class="tabular-nums"><bdi>{{ num(r.links) }}</bdi></NqTableCell>
                <NqTableCell class="text-muted-foreground"><NqDateTime v-if="r.node.updatedAt !== undefined" :value="r.node.updatedAt" relative /></NqTableCell>
              </NqTableRow>
            </NqTableBody>
          </NqTable>
        </div>
      </div>

      <aside v-if="node" data-slot="graph-inspector" :aria-label="t.inspector" class="absolute inset-0 z-10 flex flex-col border-s border-border bg-card md:static md:inset-auto md:w-80 md:shrink-0">
        <div class="flex items-start gap-3 border-b border-border px-4 py-3">
          <span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-control text-white [&_svg]:size-4" :style="{ backgroundColor: hueVar(kindOf(node.kind)?.hue) }">
            <component :is="kindOf(node.kind)!.icon" v-if="kindOf(node.kind)?.icon" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="text-label text-foreground">{{ node.label }}</h2>
            <p class="text-caption text-muted-foreground">{{ kindOf(node.kind)?.label ?? node.kind }}</p>
          </div>
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.close" :title="t.close" @click="setSelected(null)"><X aria-hidden="true" /></NqButton>
        </div>
        <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <p v-if="node.description" class="text-body-sm text-foreground">{{ node.description }}</p>
          <section v-if="node.tags?.length" class="flex flex-col gap-1.5">
            <h3 class="eyebrow">{{ t.tags }}</h3>
            <div class="flex flex-wrap gap-1.5"><NqBadge v-for="g in node.tags" :key="g" variant="outline">{{ g }}</NqBadge></div>
          </section>
          <p v-if="node.updatedAt !== undefined" class="text-caption text-muted-foreground">{{ t.updated }} <NqDateTime :value="node.updatedAt" :format="{ dateStyle: 'medium' }" /></p>
          <template v-for="group in lists" :key="group.title">
            <section v-if="group.items.length" class="flex flex-col gap-1">
              <h3 class="eyebrow">{{ group.title }}</h3>
              <ul class="flex flex-col">
                <li v-for="(it, i) in group.items" :key="`${it.id}-${i}`">
                  <button type="button" class="flex w-full items-center gap-2 rounded-control px-1.5 py-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus" @click="setSelected(it.id)">
                    <span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: hueVar(kindOf(byId.get(it.id)!.kind)?.hue) }" />
                    <span class="min-w-0 flex-1 truncate text-body-sm text-foreground">{{ byId.get(it.id)!.label }}</span>
                    <span v-if="it.label" class="shrink-0 text-caption text-muted-foreground">{{ it.label }}</span>
                  </button>
                </li>
              </ul>
            </section>
          </template>
          <p v-if="outgoing.length + incoming.length === 0" class="text-body-sm text-muted-foreground">{{ t.noLinks }}</p>
        </div>
        <div v-if="props.onOpen || slots.actions" class="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          <NqButton v-if="props.onOpen" variant="primary" size="sm" @click="props.onOpen!(node)"><ExternalLink aria-hidden="true" class="rtl:-scale-x-100" />{{ t.open }}</NqButton>
          <slot name="actions" :node="node" />
        </div>
      </aside>
    </div>
  </div>
</template>
