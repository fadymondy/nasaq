import {
  Field,
  FieldDescription,
  FieldLabel,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Select", component: Select } satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

const TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

function Demo() {
  const [type, setType] = useState<string | null>("bug");
  return (
    <div className="grid w-72 gap-6">
      <Field>
        <FieldLabel>Type</FieldLabel>
        <Select items={TYPES} value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Selected: {type}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Priority</FieldLabel>
        <Select items={{ low: "Low", medium: "Medium", high: "High", urgent: "Urgent" }}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Normal</SelectLabel>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Escalated</SelectLabel>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent" disabled>
                Urgent
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>Disabled</FieldLabel>
        <Select items={TYPES} defaultValue="question" disabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const WithoutItems: Story = {
  render: () => (
    <Select defaultValue="high">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low priority</SelectItem>
        <SelectItem value="high">High priority</SelectItem>
      </SelectContent>
    </Select>
  ),
};
