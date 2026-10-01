import { QuickCapture } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QuickCaptureDemo, WebClipperDemo } from "./_u-demo";

const meta = { title: "Components/Productivity/Quick Capture", component: QuickCapture, parameters: { layout: "fullscreen" } } satisfies Meta<typeof QuickCapture>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = { onCapture: async () => {} };

export const Default: Story = { args, render: () => <QuickCaptureDemo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <QuickCaptureDemo /> };
export const Clipper: Story = { args, render: () => <WebClipperDemo /> };
export const ClipperArabic: Story = { args, globals: { locale: "ar" }, render: () => <WebClipperDemo /> };
