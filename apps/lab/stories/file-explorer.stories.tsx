import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileExplorerDemo } from "./_explorer-demo";

const meta = { title: "Components/Files/File Explorer" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Open folders, preview a file, upload (button or drop), create a folder and delete. Fake server with short delays. */
export const Default: Story = { render: () => <FileExplorerDemo /> };

export const Grid: Story = { render: () => <FileExplorerDemo defaultView="grid" /> };

export const ReadOnly: Story = { render: () => <FileExplorerDemo readOnly /> };

export const Empty: Story = { render: () => <FileExplorerDemo empty /> };

export const Loading: Story = { render: () => <FileExplorerDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <FileExplorerDemo /> };
