import type { Meta, StoryObj } from "@storybook/react-vite";
import { VoiceCallDemo } from "./_t2-demo";

const meta = { title: "Pages/AI/Voice Call", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <VoiceCallDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <VoiceCallDemo /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <VoiceCallDemo /> };
