import { TrayPopover } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlanceDemo, WidgetGalleryDemo } from "./_w1-demo";

const meta = { title: "Components/Apps & Platforms/Glance Surfaces", component: TrayPopover, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof TrayPopover>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <GlanceDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <GlanceDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <GlanceDemo /> };
export const Gallery: Story = { render: () => <WidgetGalleryDemo /> };
export const GalleryArabic: Story = { globals: { locale: "ar" }, render: () => <WidgetGalleryDemo /> };
