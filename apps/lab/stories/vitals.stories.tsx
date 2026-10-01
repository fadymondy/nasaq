import { Vitals } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoVitals } from "./_health-demo";

const meta = { title: "Components/Wellness/Vitals", component: Vitals, parameters: { layout: "padded" } } satisfies Meta<typeof Vitals>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <Vitals vitals={demoVitals()} /> };
export const NoBaseline: Story = { render: () => <Vitals vitals={{ weightKg: 91.5, heightCm: 172, restingHeartRate: 71, hasBaseline: false }} /> };
export const Empty: Story = { render: () => <Vitals vitals={{}} /> };
export const Loading: Story = { render: () => <Vitals loading /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Vitals vitals={demoVitals()} /> };
