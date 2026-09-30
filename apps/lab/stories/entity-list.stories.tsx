import { type DataTableColumn, EntityIdentity, EntityList, TagList, toast } from "@nasaq/web";
import { Copy, Download, Pencil, Plus, Trash2 } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { type Contact } from "@nasaq/web";
import { makeContacts } from "./_crm-demo";

const meta = { title: "Components/Data Display/Entity List", component: EntityList, parameters: { layout: "padded" } } satisfies Meta<typeof EntityList>;
export default meta;
type Story = StoryObj;

function Demo({ lang, menus = false }: { lang: "en" | "ar"; menus?: boolean }) {
  const rows = useMemo(() => makeContacts(lang).slice(0, 12), [lang]);
  const ar = lang === "ar";
  const columns: DataTableColumn<Contact>[] = [
    {
      id: "name",
      header: ar ? "الاسم" : "Name",
      hideable: false,
      cell: (c) => <EntityIdentity name={c.name} avatarName={c.name} subtitle={c.jobTitle} />,
      sortValue: (c) => c.name,
      searchValue: (c) => `${c.name} ${c.jobTitle ?? ""}`,
    },
    { id: "company", header: ar ? "الشركة" : "Company", cell: (c) => c.company, sortValue: (c) => c.company },
    { id: "tags", header: ar ? "الوسوم" : "Tags", cell: (c) => <TagList tags={c.tags ?? []} /> },
  ];
  return (
    <EntityList
      label={ar ? "الأشخاص" : "People"}
      data={rows}
      columns={columns}
      getRowId={(c) => c.id}
      rowLabel={(c) => c.name}
      {...(menus
        ? {
            rowActions: (c: Contact) => [
              { id: "edit", label: ar ? "تعديل" : "Edit", icon: Pencil, onSelect: () => toast(`${c.name}: edit`) },
              { id: "copy", label: ar ? "نسخ البريد" : "Copy email", icon: Copy, onSelect: () => toast(`${c.name}: copy`) },
              { id: "delete", label: ar ? "حذف" : "Delete", icon: Trash2, danger: true, group: "danger", onSelect: () => toast(`${c.name}: delete`) },
            ],
            actions: [
              { id: "new", label: ar ? "جهة اتصال جديدة" : "New contact", icon: Plus, primary: true, onSelect: () => toast("new") },
              { id: "export", label: ar ? "تصدير" : "Export", icon: Download, onSelect: () => toast("export") },
            ],
          }
        : {})}
      facets={[
        {
          id: "company",
          title: ar ? "الشركة" : "Company",
          options: [...new Set(rows.map((r) => r.company ?? ""))].map((v) => ({ value: v, label: v })),
          getValues: (c) => (c.company ? [c.company] : []),
        },
      ]}
      renderCard={(c) => (
        <div className="flex flex-col gap-3">
          <EntityIdentity name={c.name} avatarName={c.name} subtitle={c.jobTitle} size="lg" />
          <TagList tags={c.tags ?? []} />
        </div>
      )}
    />
  );
}

/** The generic base: bring your own columns and card. Table and cards share the toolbar, filters and selection. */
export const Default: Story = { render: () => <Demo lang="en" /> };
export const Loading: Story = { render: () => <EntityList label="Rows" data={[]} columns={[{ id: "a", header: "Name", cell: () => null }]} getRowId={() => ""} renderCard={() => null} loading /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo lang="ar" /> };

/** Right-click a row or a card (or Shift+F10 / the Menu key on it) for its actions; `actions` adds table-level buttons to the toolbar. Switch to Cards to try both. */
export const ContextMenu: Story = { render: () => <Demo lang="en" menus /> };
export const ContextMenuArabic: Story = { globals: { locale: "ar" }, render: () => <Demo lang="ar" menus /> };
