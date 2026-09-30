import { ContentTableEditor } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contentTable, fakeSave } from "./_editors-demo";
import { useAr } from "./_profile-demo";

const meta = { title: "Components/Editors/Content Table Editor", component: ContentTableEditor, parameters: { layout: "padded" } } satisfies Meta<typeof ContentTableEditor>;
export default meta;
type Story = StoryObj;

function Demo({ save = false, failing = false, ...props }: { save?: boolean; failing?: boolean; readOnly?: boolean; editableColumns?: boolean }) {
  const ar = useAr();
  return <ContentTableEditor defaultValue={contentTable(ar)} onSave={save ? fakeSave(ar, failing) : undefined} maxHeight="28rem" {...props} />;
}

export const Default: Story = { render: () => <Demo /> };
export const WithSave: Story = { render: () => <Demo save /> };
export const SaveFails: Story = { render: () => <Demo save failing /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
export const FixedColumns: Story = { render: () => <Demo editableColumns={false} /> };
export const Empty: Story = { render: () => <ContentTableEditor defaultValue={{ columns: [{ id: "name", label: "Name", type: "text" }], rows: [] }} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo save /> };
