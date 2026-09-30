import {
  Button,
  Field,
  FieldLabel,
  Input,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationsSheet } from "./_notifications";

const meta = { title: "Components/Overlays/Sheet", component: SheetContent } satisfies Meta<typeof SheetContent>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ side }: { side: "end" | "start" | "bottom" }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="secondary" />}>Open {side} sheet</SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>Changes save when you press Save.</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 p-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue="Nasaq" />
          </Field>
          <Field>
            <FieldLabel>Key</FieldLabel>
            <Input defaultValue="NQ" />
          </Field>
        </SheetBody>
        <SheetFooter className="justify-end">
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <SheetClose render={<Button variant="primary" />}>Save</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Sides are logical: "end" slides from the right in English and from the left in Arabic. */
export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Demo side="end" />
      <Demo side="start" />
      <Demo side="bottom" />
    </div>
  ),
};

/** Click a row to mark it read. */
export const Notifications: Story = {
  render: () => <NotificationsSheet />,
};
