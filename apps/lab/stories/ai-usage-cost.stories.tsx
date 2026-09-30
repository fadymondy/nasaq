import { TokenCostMeter } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AiCostDemo } from "./_usage-demo";

const meta = { title: "Components/AI/AI Usage Cost", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Tiles, daily billed and unbilled bars and a breakdown by model, product or run with token columns. */
export const Default: Story = { render: () => <AiCostDemo /> };

export const Loading: Story = { render: () => <AiCostDemo loading /> };

/** One run: input, cached and output tokens and its spend against a budget. */
export const RunMeter: Story = { render: () => <div className="max-w-md"><TokenCostMeter tokensIn={182000} tokensOut={24000} cached={120000} cost={1.42} budget={2} /></div> };

export const RunOverBudget: Story = { render: () => <div className="max-w-md"><TokenCostMeter tokensIn={900000} tokensOut={120000} cost={2.6} budget={2} /></div> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AiCostDemo /> };
