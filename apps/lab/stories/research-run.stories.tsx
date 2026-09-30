import { ResearchRun } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResearchRunDemo } from "./_t2-demo";

const meta = { title: "Components/AI/Research Run", component: ResearchRun, parameters: { layout: "padded" } } satisfies Meta<typeof ResearchRun>;
export default meta;
type Story = StoryObj;

/** Ask, watch the stages progress, then read the answer with numbered evidence. Ask something containing "fail" to see the failure and retry. */
export const Default: Story = { render: () => <ResearchRunDemo /> };
export const Finished: Story = { render: () => <ResearchRunDemo startWith="done" /> };
export const Empty: Story = { render: () => <ResearchRun run={null} onAsk={() => undefined} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ResearchRunDemo /> };
export const ArabicFinished: Story = { globals: { locale: "ar" }, render: () => <ResearchRunDemo startWith="done" /> };
