import type { Meta, StoryObj } from "@storybook/react-vite";
import { CatalogPageDemo } from "./_usage-demo";

const meta = { title: "Components/Pricing/Pages/Plan Catalog", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CatalogPageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CatalogPageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CatalogPageDemo /> };
