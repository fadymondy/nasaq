import { BrandGuidelines } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Guidelines } from "./_w4-brand";

const meta = { title: "Components/Brand/Brand Guidelines", component: BrandGuidelines, parameters: { layout: "padded" } } satisfies Meta<typeof BrandGuidelines>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <Guidelines /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Guidelines /> };
export const Mahaam: Story = { render: () => <Guidelines brand="mahaam" /> };
