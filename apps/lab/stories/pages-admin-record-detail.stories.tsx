/* A customer record: the read view (infolist) and the edit view (schema form with foreign-key pickers). */
import { Button, Infolist, SchemaForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { NESTED_RULES, NESTED_SCHEMA, NESTED_VALUE, saveNested } from "./_nested-form-demo";
import { createPerson, customerSections, resolvePeople, searchPeople, t, useAr, W2Page } from "./_w2-demo";

const meta = { title: "Components/Data Display/Pages/Record Detail", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ startEditing = false }: { startEditing?: boolean }) {
  const ar = useAr();
  const [editing, setEditing] = useState(startEditing);
  return (
    <W2Page
      title={t(ar, "Noor Roasters", "نور للتحميص")}
      description={t(ar, "Customer since 2024", "عميل منذ 2024")}
      actions={
        editing ? null : (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            {t(ar, "Edit", "تعديل")}
          </Button>
        )
      }
    >
      {editing ? (
        <SchemaForm
          label={t(ar, "Edit customer", "تعديل العميل")}
          schema={NESTED_SCHEMA}
          rules={NESTED_RULES}
          defaultValue={NESTED_VALUE}
          relations={{ people: { search: searchPeople, resolve: resolvePeople, onCreate: async (name) => createPerson(name) } }}
          onSubmit={async (value) => {
            const result = await saveNested(value, ar);
            if (!result) setEditing(false);
            return result;
          }}
        />
      ) : (
        <Infolist label={t(ar, "Customer details", "بيانات العميل")} sections={customerSections()} />
      )}
    </W2Page>
  );
}

export const Default: Story = { render: () => <Page startEditing /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page startEditing /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page startEditing /> };
