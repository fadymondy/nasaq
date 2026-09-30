import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Forms/Field", component: Field } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-5">
      <Field>
        <FieldLabel>Project name</FieldLabel>
        <Input placeholder="Nasaq" />
        <FieldDescription>Shown in the sidebar and on invoices.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>Description</FieldLabel>
        <Textarea rows={3} placeholder="What is this project for?" />
      </Field>
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div className="max-w-sm">
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input defaultValue="fady@" aria-invalid />
        <FieldError match>Enter a complete email address.</FieldError>
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-sm">
      <Field disabled>
        <FieldLabel>Workspace ID</FieldLabel>
        <Input defaultValue="ws_01J9" />
      </Field>
    </div>
  ),
};
