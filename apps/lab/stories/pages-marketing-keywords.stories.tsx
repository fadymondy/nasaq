import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeywordsPageDemo, MarketingShell, useAr } from "./_moharrik-demo";

const meta = { title: "Components/SEO/Pages/Keywords", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <MarketingShell title={ar ? "الكلمات المفتاحية" : "Keywords"} description={ar ? "أين يظهر الموقع في الترتيب، وما الذي نستهدفه بعد ذلك، ومن يشير إليه." : "Where the site ranks, what to target next and who links to it."}>
      <KeywordsPageDemo />
    </MarketingShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
