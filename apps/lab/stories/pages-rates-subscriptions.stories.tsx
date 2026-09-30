import type { Meta, StoryObj } from "@storybook/react-vite";
import { RatesPageDemo, useAr, V2Page } from "./_v2-demo";

const meta = { title: "Pages/Billing/Rates and Subscriptions", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <V2Page title={ar ? "الأسعار والاشتراكات" : "Rates and subscriptions"} description={ar ? "الأسعار حسب التاريخ والاشتراكات المتكررة." : "Effective-dated rates and recurring subscriptions."}>
      <RatesPageDemo />
    </V2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
