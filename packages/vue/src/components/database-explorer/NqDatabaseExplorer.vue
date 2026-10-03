<script setup lang="ts">
import { Database, Eye, Play, Search, Table2, Trash2 } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqTextarea } from "../field";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTreeView, type TreeNode } from "../tree-view";
import { buildSelectSql, isReadOnlySql, pushHistory, resultToCsv } from "./database-format";
import NqDatabaseResultGrid from "./NqDatabaseResultGrid.vue";
import NqDatabaseStructureTable from "./NqDatabaseStructureTable.vue";
import { STRINGS, type DatabaseExplorerLabels } from "./strings";
import type { DatabaseSchema, QueryOutcome, QueryResult, TableRef } from "./types";

// A database browser: a tree of schemas and tables, a SQL editor, and the results in a sortable grid with CSV export,
// plus each table's structure and a history of what you ran. It has no connection: your `onRunQuery` runs the
// statement and returns rows or an error.
interface Props {
  /** The schemas and tables to browse. */
  schemas: readonly DatabaseSchema[];
  /** Run a statement and return rows or `{ error }`. Rejecting shows a generic error. You own the connection. */
  onRunQuery: (sql: string) => Promise<QueryOutcome>;
  /** Selecting a table loads `SELECT * ... LIMIT rowLimit` and runs it. Default 100. */
  rowLimit?: number;
  /** Text in the editor at first. */
  defaultQuery?: string;
  /** Table selected at first (its structure shows; nothing runs). */
  defaultTable?: TableRef;
  /** Ask before running a statement that does not start with SELECT, WITH, EXPLAIN or SHOW. Default true. */
  confirmWrites?: boolean;
  /** Called by the CSV button with the result. Default: saves `query.csv`. */
  onExport?: (result: QueryResult) => void;
  /** Replaces the section's accessible name. */
  title?: string;
  /** Override any string. */
  labels?: Partial<DatabaseExplorerLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { rowLimit: 100, defaultQuery: "", defaultTable: undefined, confirmWrites: true, onExport: undefined, title: undefined, labels: undefined });

const nq = useNasaq();
const t = computed<DatabaseExplorerLabels>(() => ({ ...(STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"] as DatabaseExplorerLabels), ...props.labels }));
const uid = useId();
const sqlId = `${uid}-sql`;

const filter = ref("");
const active = ref<TableRef | null>(props.defaultTable ?? null);
const sql = ref(props.defaultQuery);
const running = ref(false);
const outcome = ref<QueryOutcome | null>(null);
const runId = ref(0);
const history = ref<string[]>([]);
const tab = ref<string | number>("results");
const confirm = ref<string | null>(null);
const editor = ref<{ $el: HTMLTextAreaElement } | null>(null);
let alive = true;
onBeforeUnmount(() => {
  alive = false;
});

const idOf = (schema: string, table: string) => `${schema}\u0000${table}`;

const activeTable = computed(() => (active.value ? props.schemas.find((s) => s.name === active.value!.schema)?.tables.find((x) => x.name === active.value!.table) : undefined));

const nodes = computed<TreeNode[]>(() => {
  const q = filter.value.trim().toLowerCase();
  const out: TreeNode[] = [];
  for (const s of props.schemas) {
    const tables = q ? s.tables.filter((x) => x.name.toLowerCase().includes(q)) : s.tables;
    if (q && tables.length === 0) continue;
    out.push({
      id: s.name,
      textValue: s.name,
      icon: Database,
      label: () => h("bdi", { dir: "ltr" }, s.name),
      children: tables.map((x) => ({
        id: idOf(s.name, x.name),
        textValue: x.name,
        icon: x.kind === "view" ? Eye : Table2,
        label: () =>
          h("span", { class: "flex min-w-0 items-center justify-between gap-2" }, [
            h("bdi", { dir: "ltr", class: "truncate font-mono text-code" }, x.name),
            x.rowCount !== undefined ? h("span", { class: "shrink-0 text-caption text-muted-foreground" }, [h(NqNum, { value: x.rowCount })]) : null,
          ]),
      })),
    });
  }
  return out;
});

async function execute(text: string) {
  const statement = text.trim();
  if (!statement) return;
  running.value = true;
  tab.value = "results";
  history.value = pushHistory(history.value, statement);
  try {
    const result = await props.onRunQuery(statement);
    if (!alive) return;
    outcome.value = result;
    runId.value += 1;
  } catch {
    if (alive) outcome.value = { error: t.value.genericError };
  } finally {
    if (alive) running.value = false;
  }
}

function request(text: string) {
  if (running.value || !text.trim()) return;
  if (props.confirmWrites && !isReadOnlySql(text)) confirm.value = text;
  else void execute(text);
}

function pickTable(id: string) {
  const [schema, table] = id.split("\u0000");
  if (!schema || !table) return;
  active.value = { schema, table };
  const next = buildSelectSql(table, schema, props.rowLimit);
  sql.value = next;
  void execute(next);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    request(sql.value);
  }
}

function download(result: QueryResult) {
  if (props.onExport) return props.onExport(result);
  const blob = new Blob([resultToCsv(result.columns, result.rows)], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "query.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

const focusEditor = () => editor.value?.$el.focus();
function clearEditor() {
  sql.value = "";
  focusEditor();
}
function useQuery(entry: string) {
  sql.value = entry;
  focusEditor();
}
const modifies = computed(() => sql.value.trim() !== "" && !isReadOnlySql(sql.value));
const selectedIds = computed(() => (active.value ? [idOf(active.value.schema, active.value.table)] : []));
function onSelected(ids: string[]) {
  const id = ids[ids.length - 1];
  if (id?.includes("\u0000")) pickTable(id);
}
function confirmRun() {
  const text = confirm.value;
  confirm.value = null;
  if (text) void execute(text);
}
</script>

<template>
  <section
    data-slot="database-explorer"
    :aria-label="props.title ?? t.title"
    :class="cn('grid min-w-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]', props.class)"
  >
    <aside :aria-label="t.tables" class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-2 lg:max-h-[42rem]">
      <NqInputGroup>
        <NqInputGroupAddon align="start">
          <Search aria-hidden="true" class="size-4 text-muted-foreground" />
        </NqInputGroupAddon>
        <NqInputGroupInput v-model="filter" ltr type="search" :placeholder="t.filterTables" :aria-label="t.filterTables" />
      </NqInputGroup>
      <div class="max-h-56 min-h-0 overflow-y-auto lg:max-h-none lg:flex-1">
        <NqEmptyState v-if="props.schemas.length === 0" class="border-0 px-2 py-6" :title="t.noSchema" :description="t.noSchemaBody" />
        <p v-else-if="nodes.length === 0" class="px-2 py-4 text-center text-body-sm text-muted-foreground">{{ t.noTables }}</p>
        <NqTreeView
          v-else
          :key="filter ? 'filtered' : 'all'"
          :aria-label="t.tables"
          :items="nodes"
          :default-expanded="props.schemas.map((s) => s.name)"
          :selected="selectedIds"
          @update:selected="onSelected"
        />
      </div>
    </aside>

    <div class="flex min-w-0 flex-col gap-3">
      <div class="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label :for="sqlId" class="text-label text-foreground">{{ t.editor }}</label>
          <span class="text-caption text-muted-foreground">{{ t.editorHint }}</span>
        </div>
        <NqTextarea
          :id="sqlId"
          ref="editor"
          v-model="sql"
          dir="ltr"
          :rows="5"
          :placeholder="t.placeholder"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          :spellcheck="false"
          class="min-h-28 resize-y font-mono text-code text-start"
          @keydown="onKeyDown"
        />
        <div class="flex flex-wrap items-center gap-2">
          <NqButton type="button" variant="primary" size="sm" :loading="running" :disabled="!sql.trim()" @click="request(sql)">
            <Play aria-hidden="true" />
            {{ running ? t.running : t.run }}
          </NqButton>
          <NqButton type="button" variant="ghost" size="sm" :disabled="!sql" @click="clearEditor">{{ t.clear }}</NqButton>
          <NqBadge v-if="modifies" variant="warning">{{ t.modifies }}</NqBadge>
        </div>
      </div>

      <NqTabs v-model="tab">
        <NqTabsList :aria-label="props.title ?? t.title" variant="underline">
          <NqTabsTab value="results">{{ t.results }}</NqTabsTab>
          <NqTabsTab value="structure">{{ t.structure }}</NqTabsTab>
          <NqTabsTab value="history">
            {{ t.history }}
            <span v-if="history.length" class="ms-1.5 text-caption text-muted-foreground tabular-nums">{{ history.length }}</span>
          </NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>

        <NqTabsPanel value="results">
          <NqAlert v-if="outcome && 'error' in outcome" tone="danger" role="alert" :title="t.queryFailed">
            <bdi dir="ltr" class="whitespace-pre-wrap font-mono text-code">{{ outcome.error }}</bdi>
          </NqAlert>
          <NqDatabaseResultGrid v-else-if="outcome" :key="runId" :result="outcome" :t="t" @export="download" />
          <NqEmptyState v-else :icon="Play" :title="t.noRun" :description="t.noRunBody" />
        </NqTabsPanel>

        <NqTabsPanel value="structure">
          <NqDatabaseStructureTable :table="activeTable" :t="t" />
        </NqTabsPanel>

        <NqTabsPanel value="history">
          <NqEmptyState v-if="history.length === 0" :title="t.historyEmpty" />
          <div v-else class="flex flex-col gap-2">
            <ul class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
              <li v-for="entry in history" :key="entry" class="border-b border-border last:border-b-0">
                <button
                  type="button"
                  :title="t.useQuery"
                  class="block w-full px-3 py-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                  @click="useQuery(entry)"
                >
                  <bdi dir="ltr" class="block truncate font-mono text-code text-foreground">{{ entry.replace(/\s+/g, " ") }}</bdi>
                </button>
              </li>
            </ul>
            <div>
              <NqButton type="button" variant="ghost" size="sm" @click="history = []">
                <Trash2 aria-hidden="true" />
                {{ t.historyClear }}
              </NqButton>
            </div>
          </div>
        </NqTabsPanel>
      </NqTabs>
    </div>

    <NqAlertDialog :open="confirm !== null" @update:open="(open: boolean) => !open && (confirm = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.writeTitle }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.writeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <bdi dir="ltr" class="block max-h-32 overflow-auto rounded-control border border-border bg-secondary p-2 font-mono text-code">{{ confirm }}</bdi>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton type="button" variant="danger" @click="confirmRun">{{ t.writeConfirm }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </section>
</template>
