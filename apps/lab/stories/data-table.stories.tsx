import {
  Avatar,
  Button,
  DataTable,
  DataTableActions,
  DataTableBulkActions,
  type DataTableColumn,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  DataTableViewOptions,
  Status,
  toast,
  useDataTable,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Copy, Download, Pencil, Plus, RefreshCw, Trash2, Upload, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

const meta = { title: "Components/Data Display/Data Table", component: DataTable, args: { table: undefined as never, label: "" } } satisfies Meta<
  typeof DataTable
>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

type Tone = "info" | "warning" | "success" | "neutral" | "danger";
const STATUS: Record<string, { tone: Tone; en: string; ar: string }> = {
  progress: { tone: "info", en: "In progress", ar: "قيد التنفيذ" },
  review: { tone: "warning", en: "In review", ar: "قيد المراجعة" },
  done: { tone: "success", en: "Done", ar: "مكتملة" },
  todo: { tone: "neutral", en: "Todo", ar: "للتنفيذ" },
  blocked: { tone: "danger", en: "Blocked", ar: "متوقفة" },
};
const PEOPLE = ["Fady Mondy", "Nour Adel", "Omar Samy", "Mona Hany", "Sara Alharbi"];
const TITLES: [string, string][] = [
  ["App shell v2", "هيكل التطبيق v2"],
  ["Lab + feedback SDK", "المختبر و SDK الملاحظات"],
  ["Token pipeline", "خط إنتاج الرموز"],
  ["React Native package", "حزمة React Native"],
  ["Registry + docs site", "السجل وموقع التوثيق"],
  ["Invoice export", "تصدير الفواتير"],
  ["Payment gateway", "بوابة الدفع"],
  ["Error message translations", "ترجمة رسائل الخطأ"],
  ["Accessibility review", "مراجعة إمكانية الوصول"],
  ["Workspace permissions", "صلاحيات مساحة العمل"],
  ["Search indexing", "فهرسة البحث"],
  ["Onboarding checklist", "قائمة الإعداد"],
];

interface Issue {
  key: string;
  title: [string, string];
  status: keyof typeof STATUS;
  assignee: string;
  estimate: number;
  due: Date;
}

const ISSUES: Issue[] = Array.from({ length: 23 }, (_, i) => ({
  key: `MH-${700 + i * 3}`,
  title: TITLES[i % TITLES.length]!,
  status: Object.keys(STATUS)[(i * 7) % 5]!,
  assignee: PEOPLE[(i * 3) % PEOPLE.length]!,
  estimate: ((i * 5) % 13) + 1,
  due: new Date(2026, 8, 20 + ((i * 4) % 30)),
}));

function useColumns(ar: boolean) {
  const l = ar ? 1 : 0;
  const locale = ar ? "ar" : "en";
  return useMemo<DataTableColumn<Issue>[]>(
    () => [
      {
        id: "key",
        header: ar ? "المعرّف" : "Key",
        cell: (r) => <span className="font-mono text-caption text-muted-foreground">{r.key}</span>,
        sortValue: (r) => r.key,
        searchValue: (r) => r.key,
        hideable: false,
        className: "w-24",
      },
      {
        id: "title",
        header: ar ? "العنوان" : "Title",
        cell: (r) => <span className="text-label text-foreground">{r.title[l]}</span>,
        sortValue: (r) => r.title[l],
        searchValue: (r) => `${r.title[0]} ${r.title[1]}`,
        hideable: false,
      },
      {
        id: "status",
        header: ar ? "الحالة" : "Status",
        cell: (r) => <Status tone={STATUS[r.status]!.tone}>{STATUS[r.status]![ar ? "ar" : "en"]}</Status>,
        sortValue: (r) => Object.keys(STATUS).indexOf(r.status),
        filterValue: (r) => r.status,
      },
      {
        id: "assignee",
        header: ar ? "المسؤول" : "Assignee",
        cell: (r) => (
          <span className="flex items-center gap-2">
            <Avatar size="xs" name={r.assignee} />
            {r.assignee}
          </span>
        ),
        sortValue: (r) => r.assignee,
        searchValue: (r) => r.assignee,
        filterValue: (r) => r.assignee,
      },
      {
        id: "estimate",
        header: ar ? "التقدير" : "Estimate",
        label: ar ? "التقدير" : "Estimate",
        cell: (r) => <span className="tabular-nums">{r.estimate}h</span>,
        sortValue: (r) => r.estimate,
        align: "end",
        defaultHidden: true,
      },
      {
        id: "due",
        header: ar ? "الاستحقاق" : "Due",
        cell: (r) => (
          <time dateTime={r.due.toISOString()} className="text-muted-foreground tabular-nums">
            {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", numberingSystem: "latn" }).format(r.due)}
          </time>
        ),
        sortValue: (r) => r.due,
        align: "end",
      },
    ],
    [ar, l, locale],
  );
}

/** Everything on: search, facet filters, column view, selection with bulk actions, row actions, pagination. */
export const Default: Story = {
  render: function Render() {
    const ar = useAr();
    const columns = useColumns(ar);
    const table = useDataTable({ data: ISSUES, columns, getRowId: (r) => r.key, pageSize: 8, selectable: true });
    const say = (m: string) => () => toast(m);
    return (
      <div className="flex max-w-5xl flex-col gap-3">
        {table.selection.size ? (
          <DataTableBulkActions table={table}>
            <Button size="sm" onClick={say(ar ? "تعيين" : "Assign")}>
              <UserRound />
              {ar ? "تعيين" : "Assign"}
            </Button>
            <Button size="sm" onClick={say(ar ? "أرشفة" : "Archive")}>
              <Archive />
              {ar ? "أرشفة" : "Archive"}
            </Button>
          </DataTableBulkActions>
        ) : (
          <DataTableToolbar>
            <DataTableSearch table={table} placeholder={ar ? "ابحث في المهام…" : "Search issues…"} />
            <DataTableFacetFilter
              table={table}
              column="status"
              options={Object.entries(STATUS).map(([value, s]) => ({ value, label: s[ar ? "ar" : "en"] }))}
            />
            <DataTableFacetFilter table={table} column="assignee" options={PEOPLE.map((p) => ({ value: p, label: p }))} />
            <DataTableViewOptions table={table} />
          </DataTableToolbar>
        )}
        <DataTable
          table={table}
          label={ar ? "المهام" : "Issues"}
          rowLabel={(r) => r.key}
          onRowClick={(r) => toast(r.key)}
          rowActions={(r) => [
            { id: "edit", label: ar ? "تعديل" : "Edit", icon: Pencil, onSelect: say(`${r.key}: edit`) },
            { id: "copy", label: ar ? "نسخ الرابط" : "Copy link", icon: Copy, onSelect: say(`${r.key}: copy`) },
            { id: "delete", label: ar ? "حذف" : "Delete", icon: Trash2, danger: true, group: "danger", onSelect: say(`${r.key}: delete`) },
          ]}
        />
        <DataTablePagination table={table} />
      </div>
    );
  },
};

/** Just a sortable table: no toolbar, no selection, no paging. Each capability is opt-in. */
export const SortOnly: Story = {
  render: function Render() {
    const ar = useAr();
    const columns = useColumns(ar);
    const table = useDataTable({
      data: ISSUES.slice(0, 6),
      columns,
      getRowId: (r) => r.key,
      defaultSort: { id: "due", direction: "asc" },
    });
    return (
      <div className="max-w-4xl">
        <DataTable table={table} label={ar ? "المهام" : "Issues"} />
      </div>
    );
  },
};

/** Frame, lines between columns, stripes, hover and density: presentation props passed through to `Table`. */
export const Styles: Story = {
  render: function Render() {
    const ar = useAr();
    const columns = useColumns(ar);
    const table = useDataTable({ data: ISSUES.slice(0, 8), columns, getRowId: (r) => r.key, selectable: true });
    return (
      <div className="flex max-w-5xl flex-col gap-8">
        <DataTable table={table} label={ar ? "المهام" : "Issues"} frame striped />
        <DataTable table={table} label={ar ? "المهام" : "Issues"} frame bordered density="compact" />
      </div>
    );
  },
};

/** Loading skeletons, an error with retry, the empty state, and "no results" after filtering. */
export const States: Story = {
  render: function Render() {
    const ar = useAr();
    const columns = useColumns(ar);
    const [state, setState] = useState<"loading" | "error" | "empty" | "filtered">("loading");
    const table = useDataTable({ data: state === "empty" ? [] : ISSUES.slice(0, 5), columns, getRowId: (r) => r.key });
    const labels = { loading: ar ? "تحميل" : "Loading", error: ar ? "خطأ" : "Error", empty: ar ? "فارغ" : "Empty", filtered: ar ? "بلا نتائج" : "No results" };
    return (
      <div className="flex max-w-4xl flex-col gap-3">
        <div className="flex gap-2">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <Button
              key={k}
              size="sm"
              variant={state === k ? "primary" : "secondary"}
              aria-pressed={state === k}
              onClick={() => {
                setState(k);
                table.setQuery(k === "filtered" ? "zzz" : "");
              }}
            >
              {labels[k]}
            </Button>
          ))}
        </div>
        <DataTable
          table={table}
          label={ar ? "المهام" : "Issues"}
          loading={state === "loading"}
          error={state === "error"}
          onRetry={() => setState("loading")}
        />
      </div>
    );
  },
};

const rowMenu = (ar: boolean, say: (m: string) => () => void) => (r: Issue) => [
  { id: "edit", label: ar ? "تعديل" : "Edit", icon: Pencil, onSelect: say(`${r.key}: edit`) },
  { id: "copy", label: ar ? "نسخ الرابط" : "Copy link", icon: Copy, onSelect: say(`${r.key}: copy`) },
  { id: "delete", label: ar ? "حذف" : "Delete", icon: Trash2, danger: true, group: "danger", onSelect: say(`${r.key}: delete`) },
];

function ContextMenuDemo() {
  const ar = useAr();
  const columns = useColumns(ar);
  const table = useDataTable({ data: ISSUES, columns, getRowId: (r) => r.key, pageSize: 6 });
  const [off, setOff] = useState(false);
  const say = (m: string) => () => toast(m);
  return (
    <div className="flex max-w-5xl flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "انقر بزر الفأرة الأيمن على صف، أو ركّز عليه (Tab ثم الأسهم) واضغط Shift+F10 أو زر القائمة. Esc يعيد التركيز إلى الصف. حقول الإدخال والروابط تحتفظ بقائمة المتصفح."
          : "Right-click a row, or focus it (Tab, then arrows) and press Shift+F10 or the Menu key. Esc returns focus to the row. Inputs and links keep the browser menu."}
      </p>
      <Button size="sm" variant="secondary" aria-pressed={off} onClick={() => setOff((v) => !v)} className="self-start">
        {off ? "contextMenu={false}" : "contextMenu"}
      </Button>
      <DataTable table={table} label={ar ? "المهام" : "Issues"} rowLabel={(r) => r.key} contextMenu={!off} rowActions={rowMenu(ar, say)} />
      <DataTablePagination table={table} />
    </div>
  );
}

/** The same `rowActions` open at the pointer on right-click and at the row on Shift+F10 / the Menu key. `contextMenu={false}` opts out. */
export const ContextMenu: Story = { render: () => <ContextMenuDemo /> };
export const ContextMenuArabic: Story = { globals: { locale: "ar" }, render: () => <ContextMenuDemo /> };

function ActionsDemo() {
  const ar = useAr();
  const columns = useColumns(ar);
  const table = useDataTable({ data: ISSUES, columns, getRowId: (r) => r.key, pageSize: 6, selectable: true });
  const [refreshing, setRefreshing] = useState(false);
  const say = (m: string) => () => toast(m);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "الزر الأساسي وأزرار ثانوية وقائمة ⋯. تحت عرض sm تنطوي الأزرار الثانوية داخل القائمة. حدّد صفًا ليظهر شريط الإجراءات الجماعية بدلًا منها."
          : "One primary button, secondary buttons and a ⋯ menu. Below the sm breakpoint the secondary buttons fold into the menu. Select a row and the bulk bar replaces the toolbar."}
      </p>
      {table.selection.size ? (
        <DataTableBulkActions table={table}>
          <Button size="sm" onClick={say(ar ? "أرشفة" : "Archive")}>
            <Archive />
            {ar ? "أرشفة" : "Archive"}
          </Button>
        </DataTableBulkActions>
      ) : (
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={ar ? "ابحث…" : "Search…"} />
          <DataTableActions
            className="ms-auto"
            actions={[
              { id: "new", label: ar ? "مهمة جديدة" : "New issue", icon: Plus, primary: true, onSelect: say("new") },
              { id: "export", label: ar ? "تصدير" : "Export", icon: Download, onSelect: say("export") },
              {
                id: "refresh",
                label: ar ? "تحديث" : "Refresh",
                icon: RefreshCw,
                iconOnly: true,
                loading: refreshing,
                onSelect: () => {
                  setRefreshing(true);
                  setTimeout(() => setRefreshing(false), 1200);
                },
              },
              { id: "import", label: ar ? "استيراد" : "Import", icon: Upload, overflow: true, onSelect: say("import") },
            ]}
          />
        </DataTableToolbar>
      )}
      <DataTable table={table} label={ar ? "المهام" : "Issues"} rowLabel={(r) => r.key} />
      <DataTablePagination table={table} />
    </div>
  );
}

/** `DataTableActions` in the toolbar next to search; resize the canvas to see the folding. */
export const TableActions: Story = { render: () => <ActionsDemo /> };
export const TableActionsArabic: Story = { globals: { locale: "ar" }, render: () => <ActionsDemo /> };

function EditDemo() {
  const ar = useAr();
  const base = useColumns(ar);
  const [rows, setRows] = useState(() => ISSUES.slice(0, 8));
  const l = ar ? 1 : 0;
  const columns = useMemo<DataTableColumn<Issue>[]>(
    () =>
      base.map((c): DataTableColumn<Issue> => {
        if (c.id === "title")
          return {
            ...c,
            edit: {
              value: (r) => r.title[l],
              validate: (v) => (String(v ?? "").trim() ? null : ar ? "العنوان مطلوب" : "A title is required"),
            },
          };
        if (c.id === "estimate")
          return {
            ...c,
            defaultHidden: false,
            edit: { type: "number", validate: (v) => (typeof v === "number" && v < 0 ? (ar ? "لا يقل عن 0" : "Must be 0 or more") : null) },
          };
        if (c.id === "status")
          return {
            ...c,
            edit: {
              type: "select",
              value: (r) => r.status,
              options: Object.entries(STATUS).map(([value, s]) => ({ value, label: s[ar ? "ar" : "en"] })),
            },
          };
        if (c.id === "due") return { ...c, edit: { type: "date", value: (r) => r.due.toISOString().slice(0, 10) } };
        return c;
      }),
    [base, ar, l],
  );
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.key });
  return (
    <div className="flex max-w-5xl flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "ركّز خلية (Tab ثم الأسهم). Enter أو F2 أو نقرتان للتحرير. Enter/Tab للحفظ والانتقال، Esc للإلغاء. التقدير الأكبر من 40 يرفضه الخادم وتُستعاد القيمة؛ وعنوان يحتوي على fail يفشل كذلك."
          : "Focus a cell (Tab, then arrows). Enter, F2 or double-click to edit; Enter or Tab saves and moves on; Esc cancels. An estimate over 40 is rejected by the server and rolls back; so is a title containing “fail”."}
      </p>
      <DataTable
        table={table}
        label={ar ? "المهام" : "Issues"}
        rowLabel={(r) => r.key}
        onCellEdit={async (row, columnId, value) => {
          await new Promise((r) => setTimeout(r, 700));
          if (columnId === "estimate" && typeof value === "number" && value > 40) return { error: ar ? "الحد الأقصى 40 ساعة" : "Max 40 hours" };
          if (columnId === "title" && String(value).includes("fail")) throw new Error("boom");
          setRows((prev) =>
            prev.map((r) => {
              if (r.key !== row.key) return r;
              if (columnId === "title") return { ...r, title: (ar ? [r.title[0], String(value)] : [String(value), r.title[1]]) as [string, string] };
              if (columnId === "estimate") return { ...r, estimate: Number(value ?? 0) };
              if (columnId === "status") return { ...r, status: String(value) };
              if (columnId === "due") return { ...r, due: new Date(`${String(value)}T00:00:00`) };
              return r;
            }),
          );
        }}
      />
    </div>
  );
}

/** In-cell edit: text, number, select and date columns with validation, a pending state and rollback on failure. */
export const InCellEdit: Story = { render: () => <EditDemo /> };
export const InCellEditArabic: Story = { globals: { locale: "ar" }, render: () => <EditDemo /> };
