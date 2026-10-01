import type { Meta, StoryObj } from "@storybook/react-vite";
import { LegalDemo } from "./_u-demo";

const meta = { title: "Components/Website/Pages/Legal", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LegalDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LegalDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <LegalDemo /> };
