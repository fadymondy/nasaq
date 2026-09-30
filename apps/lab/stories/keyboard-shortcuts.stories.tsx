import { Button, ShortcutKeys, ShortcutsDialog, ShortcutsReference } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { shortcutGroups, useAr } from "./_w2-demo";

const meta = { title: "Components/Utilities/Keyboard Shortcuts", component: ShortcutsReference, parameters: { layout: "padded" } } satisfies Meta<typeof ShortcutsReference>;
export default meta;
type Story = StoryObj;

function Reference() {
  const ar = useAr();
  return <ShortcutsReference groups={shortcutGroups(ar)} className="max-w-3xl" />;
}

function Dialog() {
  const ar = useAr();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={() => setOpen(true)}>{ar ? "عرض الاختصارات" : "Show shortcuts"}</Button>
      <p className="text-body-sm text-muted-foreground">
        {ar ? "أو اضغط " : "Or press "}
        <ShortcutKeys shortcut="?" />
      </p>
      <ShortcutsDialog groups={shortcutGroups(ar)} open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const Default: Story = { render: () => <Reference /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Reference /> };
export const InDialog: Story = { render: () => <Dialog /> };
export const Inline: Story = {
  render: () => (
    <div className="flex gap-4">
      <ShortcutKeys shortcut="Mod+Shift+K" />
      <ShortcutKeys shortcut="G I" />
      <ShortcutKeys shortcut="Escape" />
    </div>
  ),
};
