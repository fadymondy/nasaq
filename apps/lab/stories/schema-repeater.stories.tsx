import { type SchemaField, SchemaRepeater, type SchemaRow, type SchemaValidation } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Forms/Schema Repeater", component: SchemaRepeater, parameters: { layout: "padded" } } satisfies Meta<typeof SchemaRepeater>;
export default meta;
type Story = StoryObj;

function useFields(): SchemaField[] {
  const ar = useAr();
  return useMemo<SchemaField[]>(
    () => [
      { key: "name", type: "text", label: ar ? "اسم البند" : "Item name", required: true, minLength: 2, width: "half" },
      {
        key: "kind",
        type: "select",
        label: ar ? "النوع" : "Kind",
        width: "half",
        required: true,
        options: [
          { value: "service", label: ar ? "خدمة" : "Service" },
          { value: "product", label: ar ? "منتج" : "Product" },
        ],
      },
      { key: "qty", type: "number", label: ar ? "الكمية" : "Quantity", min: 1, integer: true, required: true, width: "half" },
      { key: "price", type: "number", label: ar ? "السعر" : "Price", min: 0, unit: "SAR", width: "half" },
      { key: "due", type: "date", label: ar ? "تاريخ التسليم" : "Delivery date", width: "half" },
      { key: "taxed", type: "switch", label: ar ? "خاضع للضريبة" : "Taxable", description: ar ? "تُضاف ضريبة القيمة المضافة." : "VAT is added." },
      {
        key: "notes",
        type: "repeater",
        label: ar ? "ملاحظات" : "Notes",
        titleKey: "text",
        addLabel: ar ? "إضافة ملاحظة" : "Add note",
        fields: [{ key: "text", type: "text", label: ar ? "الملاحظة" : "Note", required: true }],
      },
    ],
    [ar],
  );
}

function Demo({ invalid = false }: { invalid?: boolean }) {
  const ar = useAr();
  const fields = useFields();
  const [rows, setRows] = useState<SchemaRow[]>(
    invalid
      ? [{ name: "", kind: null, qty: 0, price: null, due: null, taxed: false, notes: [{ text: "" }] }]
      : [
          { name: ar ? "تصميم الشعار" : "Logo design", kind: "service", qty: 1, price: 1500, due: "2026-11-02", taxed: true, notes: [] },
          { name: ar ? "بطاقات أعمال" : "Business cards", kind: "product", qty: 200, price: 2.5, due: null, taxed: false, notes: [{ text: ar ? "ورق مطفي" : "Matte paper" }] },
        ],
  );
  const [result, setResult] = useState<SchemaValidation | null>(null);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <SchemaRepeater
        fields={fields}
        value={rows}
        onValueChange={setRows}
        label={ar ? "البنود" : "Line items"}
        titleKey="name"
        min={1}
        max={6}
        showErrors={invalid}
        onValidate={setResult}
      />
      <p className="text-caption text-muted-foreground" data-testid="validation">
        {result?.valid ? (ar ? "صالح" : "Valid") : ar ? `${result?.count ?? 0} مشكلة` : `${result?.count ?? 0} issues`}
      </p>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const WithErrors: Story = { render: () => <Demo invalid /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
