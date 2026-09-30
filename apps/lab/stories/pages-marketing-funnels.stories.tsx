import type { Meta, StoryObj } from "@storybook/react-vite";
import { FunnelsDemo, MarketingShell, useAr } from "./_moharrik-demo";

const meta = { title: "Pages/Marketing/Funnels", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <MarketingShell title={ar ? "القمعات" : "Funnels"} description={ar ? "أين يتوقف الناس بين الزيارة الأولى والشراء." : "Where people drop off between the first visit and the purchase."}>
      <FunnelsDemo />
    </MarketingShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
