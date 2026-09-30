import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlagsDemo, MarketingShell, useAr } from "./_moharrik-demo";

const meta = { title: "Pages/Admin/Feature Flags", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <MarketingShell title={ar ? "أعلام الميزات" : "Feature flags"} description={ar ? "أطلق الميزات تدريجيًا، واستهدفها، وأوقفها بسرعة." : "Release features gradually, target them, and stop them fast."}>
      <FlagsDemo />
    </MarketingShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
