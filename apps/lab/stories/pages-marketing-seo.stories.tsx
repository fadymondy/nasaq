import type { Meta, StoryObj } from "@storybook/react-vite";
import { SeoDemo, MarketingShell, useAr } from "./_moharrik-demo";

const meta = { title: "Pages/Marketing/SEO", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <MarketingShell title={ar ? "تحسين محركات البحث" : "SEO"} description={ar ? "كيف تظهر الصفحات في البحث وعند المشاركة، وما الذي يجب إصلاحه أولًا." : "How pages look in search and when shared, and what to fix first."}>
      <SeoDemo />
    </MarketingShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
