import { KeywordPlanner } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlannerDemo } from "./_moharrik-demo";

const meta = { title: "Components/Analytics/Keyword Planner", component: KeywordPlanner, parameters: { layout: "padded" } } satisfies Meta<typeof KeywordPlanner>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <PlannerDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <PlannerDemo /> };
export const Empty: Story = { render: () => <KeywordPlanner keywords={[]} /> };
export const Loading: Story = { render: () => <KeywordPlanner keywords={[]} loading /> };
