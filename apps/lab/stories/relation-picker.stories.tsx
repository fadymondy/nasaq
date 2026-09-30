import { RelationPicker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { createPerson, PEOPLE_OPTIONS, resolvePeople, searchPeople, t, useAr } from "./_w2-demo";

const meta = { title: "Components/Forms/Relation Picker", component: RelationPicker, parameters: { layout: "padded" } } satisfies Meta<typeof RelationPicker>;
export default meta;
type Story = StoryObj;

function Single() {
  const ar = useAr();
  const [value, setValue] = useState<string | null>("u2");
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <RelationPicker aria-label={t(ar, "Owner", "المالك")} value={value} onValueChange={setValue} search={searchPeople} resolve={resolvePeople} onCreate={async (name) => createPerson(name)} />
      <p className="text-caption text-muted-foreground" dir="ltr">
        value: {value ?? "null"}
      </p>
    </div>
  );
}

function Multiple() {
  const ar = useAr();
  const [value, setValue] = useState<string[]>(["u1", "u3"]);
  return (
    <div className="flex max-w-md flex-col gap-2">
      <RelationPicker multiple aria-label={t(ar, "Watchers", "المتابعون")} value={value} onValueChange={setValue} search={searchPeople} resolve={resolvePeople} />
      <p className="text-caption text-muted-foreground" dir="ltr">
        value: {value.join(", ") || "[]"}
      </p>
    </div>
  );
}

const failing = async (): Promise<never> => {
  await new Promise((r) => setTimeout(r, 300));
  throw new Error("offline");
};

export const Default: Story = { render: () => <Single /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Single /> };
export const MultipleRecords: Story = { render: () => <Multiple /> };
export const FixedOptions: Story = {
  render: () => (
    <div className="max-w-sm">
      <RelationPicker aria-label="Owner" options={PEOPLE_OPTIONS} defaultValue="u4" />
    </div>
  ),
};
export const SearchFails: Story = {
  render: () => (
    <div className="max-w-sm">
      <RelationPicker aria-label="Owner" search={failing} />
    </div>
  ),
};
export const Invalid: Story = {
  render: () => (
    <div className="max-w-sm">
      <RelationPicker aria-label="Owner" invalid options={PEOPLE_OPTIONS} />
    </div>
  ),
};
