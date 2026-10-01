/* The trash of a workspace: what was deleted, when it disappears, restore and delete forever. */
import { TrashBin } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TRASH_NOW, TRASH_TYPES, t, trashItems, useAr, W2Page, wait } from "./_w2-demo";

const meta = { title: "Components/Files/Pages/Trash", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [items, setItems] = useState(trashItems);
  const drop = (ids: readonly string[]) => setItems((all) => all.filter((i) => !ids.includes(i.id)));
  return (
    <W2Page wide title={t(ar, "Trash", "سلة المحذوفات")} description={t(ar, "Deleted items stay here for 30 days.", "تبقى العناصر المحذوفة هنا 30 يومًا.")}>
      <TrashBin
        title={null}
        items={items}
        types={TRASH_TYPES}
        now={TRASH_NOW}
        onRestore={async (ids) => {
          await wait(300);
          drop(ids);
        }}
        onDelete={async (ids) => {
          await wait(300);
          drop(ids);
        }}
        onEmpty={async () => {
          await wait(400);
          setItems([]);
        }}
      />
    </W2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
