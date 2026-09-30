import { LegalPage } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LegalDemo, legalDocs } from "./_u-demo";

const meta = { title: "Components/Layout/Legal Page", component: LegalPage, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof LegalPage>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = { document: legalDocs(false)[0]! };

export const Default: Story = { args, render: () => <LegalDemo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <LegalDemo /> };
