import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContentTablePage } from "./_editors-demo";

const meta = { title: "Components/Editors/Pages/Content Table Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ContentTablePage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContentTablePage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ContentTablePage /> };
