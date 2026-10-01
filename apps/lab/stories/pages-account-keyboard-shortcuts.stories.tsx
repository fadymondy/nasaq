/* Keyboard settings: the reference of every shortcut, and a list where people record their own. */
import { HotkeyBindings, type HotkeyBindingItem, ShortcutsReference, Tabs, TabsPanel, TabsList, TabsTab } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { hotkeyBindings, shortcutGroups, t, useAr, W2Page, wait } from "./_w2-demo";

const meta = { title: "Components/Keyboard & Commands/Pages/Keyboard Shortcuts", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [items, setItems] = useState<HotkeyBindingItem[]>(hotkeyBindings);
  return (
    <W2Page title={t(ar, "Keyboard shortcuts", "اختصارات لوحة المفاتيح")} description={t(ar, "See every shortcut, or change yours.", "اطلع على كل الاختصارات أو غيّر اختصاراتك.")}>
      <Tabs defaultValue="reference">
        <TabsList>
          <TabsTab value="reference">{t(ar, "Reference", "المرجع")}</TabsTab>
          <TabsTab value="customize">{t(ar, "Customize", "تخصيص")}</TabsTab>
        </TabsList>
        <TabsPanel value="reference" className="pt-4">
          <ShortcutsReference title={null} groups={shortcutGroups(ar)} />
        </TabsPanel>
        <TabsPanel value="customize" className="pt-4">
          <HotkeyBindings
            title={null}
            bindings={items}
            onChange={async (id, shortcut) => {
              await wait(200);
              setItems((all) => all.map((b) => (b.id === id ? { ...b, shortcut } : b)));
            }}
          />
        </TabsPanel>
      </Tabs>
    </W2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
