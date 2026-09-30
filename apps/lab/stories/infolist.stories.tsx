import { Infolist } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { customerSections, useAr } from "./_w2-demo";

const meta = { title: "Components/Data Display/Infolist", component: Infolist, parameters: { layout: "padded" } } satisfies Meta<typeof Infolist>;
export default meta;
type Story = StoryObj;

function Sections({ layout, columns }: { layout?: "stacked" | "inline"; columns?: 1 | 2 | 3 }) {
  useAr();
  return <Infolist label="Customer" sections={customerSections()} layout={layout} columns={columns} className="max-w-3xl" />;
}

export const Default: Story = { render: () => <Sections /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Sections /> };
export const Inline: Story = { render: () => <Sections layout="inline" columns={1} /> };
export const HideEmpty: Story = { render: () => <Infolist showEmpty={false} items={customerSections()[1]?.items} className="max-w-3xl" /> };
