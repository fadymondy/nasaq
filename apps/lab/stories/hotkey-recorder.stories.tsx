import { HotkeyBindings, type HotkeyBindingItem, HotkeyRecorder } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { hotkeyBindings, wait } from "./_w2-demo";

const meta = { title: "Components/Utilities/Hotkey Recorder", component: HotkeyRecorder, parameters: { layout: "padded" } } satisfies Meta<typeof HotkeyRecorder>;
export default meta;
type Story = StoryObj;

function One({ sequence = false }: { sequence?: boolean }) {
  const [value, setValue] = useState<string | null>(sequence ? "G I" : "Mod+Shift+K");
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <HotkeyRecorder label="Shortcut" value={value} onValueChange={setValue} sequence={sequence} resetTo={sequence ? "G I" : "Mod+Shift+K"} />
      <p className="text-caption text-muted-foreground" dir="ltr">
        value: {value ?? "none"}
      </p>
    </div>
  );
}

function Many() {
  const [items, setItems] = useState<HotkeyBindingItem[]>(hotkeyBindings);
  return (
    <div className="max-w-2xl">
      <HotkeyBindings
        bindings={items}
        onChange={async (id, shortcut) => {
          await wait(200);
          setItems((all) => all.map((b) => (b.id === id ? { ...b, shortcut } : b)));
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <One /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <One /> };
export const Sequence: Story = { render: () => <One sequence /> };
export const Bindings: Story = { render: () => <Many /> };
export const BindingsArabic: Story = { globals: { locale: "ar" }, render: () => <Many /> };
