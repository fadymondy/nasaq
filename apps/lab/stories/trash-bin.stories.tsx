import { TrashBin } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TRASH_NOW, TRASH_TYPES, trashItems, wait } from "./_w2-demo";

const meta = { title: "Components/Files/Trash Bin", component: TrashBin, parameters: { layout: "padded" } } satisfies Meta<typeof TrashBin>;
export default meta;
type Story = StoryObj;

function Bin({ failRestore = false }: { failRestore?: boolean }) {
  const [items, setItems] = useState(trashItems);
  const drop = (ids: readonly string[]) => setItems((all) => all.filter((i) => !ids.includes(i.id)));
  return (
    <TrashBin
      items={items}
      types={TRASH_TYPES}
      now={TRASH_NOW}
      onRestore={async (ids) => {
        await wait(300);
        if (failRestore) return { error: "The folder no longer exists." };
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
  );
}

export const Default: Story = { render: () => <Bin /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Bin /> };
export const RestoreFails: Story = { render: () => <Bin failRestore /> };
export const Empty: Story = { render: () => <TrashBin items={[]} types={TRASH_TYPES} now={TRASH_NOW} /> };
export const KeepForever: Story = { render: () => <TrashBin items={trashItems()} types={TRASH_TYPES} retentionDays={null} now={TRASH_NOW} /> };
