import { type FormRule, SchemaForm, type SchemaFormSubmitResult } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NESTED_RULES, NESTED_SCHEMA, NESTED_VALUE, saveNested } from "./_nested-form-demo";
import { createPerson, CUSTOMER_SCHEMA, resolvePeople, searchPeople, useAr, wait } from "./_w2-demo";

const meta = { title: "Components/Form Builders/Schema Form", component: SchemaForm, parameters: { layout: "padded" } } satisfies Meta<typeof SchemaForm>;
export default meta;
type Story = StoryObj;

/** Show the VIP note only while VIP support is on, and require the phone for the Business plan. */
const RULES: FormRule[] = [
  { event: "", conditions: { kind: "group", id: "g1", join: "and", children: [{ kind: "condition", id: "c1", field: "vip", op: "is", value: "true" }] }, actions: [{ id: "a1", type: "show", config: { target: "vipNote" } }] },
  { event: "", conditions: { kind: "group", id: "g2", join: "and", children: [{ kind: "condition", id: "c2", field: "tier", op: "is", value: "business" }] }, actions: [{ id: "a2", type: "require", config: { target: "phone" } }] },
];

function Demo({ rules = true }: { rules?: boolean }) {
  const ar = useAr();
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  const onSubmit = async (value: Record<string, unknown>): Promise<SchemaFormSubmitResult | undefined> => {
    await wait(600);
    if (value.email === "taken@example.test") return { fieldErrors: { email: ar ? "هذا البريد مستخدم." : "That email is already used." } };
    setSaved(value);
    return undefined;
  };
  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SchemaForm
        label="Customer"
        schema={CUSTOMER_SCHEMA}
        rules={rules ? RULES : undefined}
        defaultValue={{ name: "Noor Roasters", tier: "team", seats: 12 }}
        relations={{ people: { search: searchPeople, resolve: resolvePeople, onCreate: async (name) => createPerson(name) } }}
        onSubmit={onSubmit}
      />
      <pre dir="ltr" className="max-h-[32rem] overflow-auto rounded-card border border-border bg-muted p-3 text-caption">
        {saved ? JSON.stringify(saved, null, 2) : "// submit to see the value"}
      </pre>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const WithoutRules: Story = { render: () => <Demo rules={false} /> };

/** A company with an address (and a location inside it), contacts that each have phones, and tags. Contact 2 has a phone the demo server refuses: save to see the error land on `contacts[1].phone`. */
function NestedDemo() {
  const ar = useAr();
  const [saved, setSaved] = useState<Record<string, unknown> | null>(null);
  return (
    <div className="grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SchemaForm
        label={ar ? "شركة" : "Company"}
        schema={NESTED_SCHEMA}
        rules={NESTED_RULES}
        defaultValue={NESTED_VALUE}
        relations={{ people: { search: searchPeople, resolve: resolvePeople, onCreate: async (name) => createPerson(name) } }}
        onSubmit={async (value) => {
          const result = await saveNested(value, ar);
          if (!result) setSaved(value);
          return result;
        }}
      />
      <pre dir="ltr" className="max-h-[32rem] overflow-auto rounded-card border border-border bg-muted p-3 text-caption">
        {saved ? JSON.stringify(saved, null, 2) : "// submit to see the value"}
      </pre>
    </div>
  );
}

export const Nested: Story = { render: () => <NestedDemo /> };
export const NestedArabic: Story = { globals: { locale: "ar" }, render: () => <NestedDemo /> };
