import { Field, FieldLabel, Input, Repeater } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Forms/Repeater", component: Repeater, parameters: { layout: "padded" } } satisfies Meta<typeof Repeater>;
export default meta;
type Story = StoryObj;

interface Phone {
  label: string;
  number: string;
}

function Demo({ limits = false }: { limits?: boolean }) {
  const ar = useAr();
  const [rows, setRows] = useState<Phone[]>([
    { label: ar ? "العمل" : "Work", number: "+966 11 555 0142" },
    { label: ar ? "المنزل" : "Home", number: "+966 12 555 0199" },
    { label: ar ? "الطوارئ" : "Emergency", number: "+966 50 555 0111" },
  ]);
  return (
    <div className="max-w-2xl">
      <Repeater<Phone>
        label={ar ? "أرقام الهاتف" : "Phone numbers"}
        value={rows}
        onValueChange={setRows}
        createItem={() => ({ label: "", number: "" })}
        rowTitle={(r) => r.label}
        rowSummary={(r) => r.number}
        min={limits ? 1 : undefined}
        max={limits ? 4 : undefined}
        addLabel={ar ? "إضافة رقم" : "Add number"}
        renderRow={(row, { update }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{ar ? "التسمية" : "Label"}</FieldLabel>
              <Input value={row.label} onChange={(e) => update({ ...row, label: e.currentTarget.value })} />
            </Field>
            <Field>
              <FieldLabel>{ar ? "الرقم" : "Number"}</FieldLabel>
              <Input ltr value={row.number} onChange={(e) => update({ ...row, number: e.currentTarget.value })} />
            </Field>
          </div>
        )}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const MinMax: Story = { render: () => <Demo limits /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo limits />
    </ArabicScope>
  ),
};
export const Empty: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Repeater<{ v: string }> createItem={() => ({ v: "" })} renderRow={() => null} />
    </div>
  ),
};
