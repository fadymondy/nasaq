import { SeoPreview, type SeoPreviewPlatform } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { seoMeta, useAr } from "./_moharrik-demo";

const meta = { title: "Components/Analytics/SEO Preview", component: SeoPreview, parameters: { layout: "padded" } } satisfies Meta<typeof SeoPreview>;
export default meta;
type Story = StoryObj;

function Editable({ platform = "google" as SeoPreviewPlatform }) {
  const ar = useAr();
  const [value, setValue] = useState(() => seoMeta(ar));
  return (
    <div className="max-w-3xl">
      <SeoPreview value={value} onValueChange={setValue} defaultPlatform={platform} />
    </div>
  );
}

function ReadOnly() {
  const ar = useAr();
  return (
    <div className="max-w-3xl">
      <SeoPreview value={seoMeta(ar)} />
    </div>
  );
}

export const Default: Story = { render: () => <Editable /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Editable /> };
export const ShareCard: Story = { render: () => <Editable platform="whatsapp" /> };
export const ReadOnlyView: Story = { render: () => <ReadOnly /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Editable /> };
