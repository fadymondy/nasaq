import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoyaltyPageDemo, useAr, V2Page } from "./_v2-demo";

const meta = { title: "Pages/App/Loyalty and Promo", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <V2Page title={ar ? "الولاء وأكواد الخصم" : "Loyalty and promo codes"} description={ar ? "نقاط العملاء وأكواد الخصم وسجل الزيارات." : "Customer points, promo codes and visit history."}>
      <LoyaltyPageDemo />
    </V2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
