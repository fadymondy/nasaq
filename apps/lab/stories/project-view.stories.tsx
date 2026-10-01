import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProjectPageDemo } from "./_mahaam-demo";

const meta = { title: "Components/Projects & Work/Project View", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Header with progress and members, then overview, board, list, timeline, time, AI cost, files and settings. */
export const Default: Story = { render: () => <ProjectPageDemo /> };

export const Board: Story = { render: () => <ProjectPageDemo tab="board" /> };

export const List: Story = { render: () => <ProjectPageDemo tab="list" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProjectPageDemo /> };
