import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocalPaymentsPageDemo, useAr, V2Page } from "./_v2-demo";

const meta = { title: "Components/Billing/Pages/Local Payments", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <V2Page title={ar ? "الدفع بالتحويل" : "Pay by transfer"} description={ar ? "ادفع بالتحويل ثم راجع الإيصال." : "Pay by transfer, then review the receipt."}>
      <LocalPaymentsPageDemo />
    </V2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
