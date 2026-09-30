import { DocsShell } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsDemo, docsNav, docsPage } from "./_u-demo";

const meta = { title: "Components/Layout/Docs Shell", component: DocsShell, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof DocsShell>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = { nav: docsNav(false), page: docsPage(false, "install"), onNavigate: () => {} };

export const Default: Story = { args, render: () => <DocsDemo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <DocsDemo /> };
