import { BudgetBurn, UsageMeter, UsageSummary } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlanUsageDemo, usageItems } from "./_usage-demo";
import { useAr } from "./_profile-demo";

const meta = { title: "Components/Data Display/Usage Meter", component: UsageMeter, parameters: { layout: "padded" } } satisfies Meta<typeof UsageMeter>;
export default meta;
type Story = StoryObj;

/** One quantity against its limit. */
export const Default: Story = { render: () => <div className="max-w-md"><UsageMeter label="Seats" used={18} limit={25} unit="seats" /></div> };

function Tones() {
  return (
    <div className="flex max-w-md flex-col gap-5">
      <UsageMeter label="Comfortable" used={30} limit={100} unit="GB" />
      <UsageMeter label="Approaching the limit" used={78} limit={100} unit="GB" />
      <UsageMeter label="Almost full" used={94} limit={100} unit="GB" />
      <UsageMeter label="Over the limit" used={126} limit={100} unit="GB" />
      <UsageMeter label="Unlimited" used={4200} limit={null} unit="calls" />
    </div>
  );
}
/** Ok, warning at 75%, danger at 90%, over, and unlimited. State is an icon and text as well as colour. */
export const Tones_: Story = { name: "Tones", render: () => <Tones /> };

function Kinds() {
  return (
    <div className="flex max-w-md flex-col gap-5">
      <UsageMeter label="AI spend" kind="money" currency="USD" used={41.5} limit={200} marker={0.4} hint="On pace to reach $103" />
      <UsageMeter label="Support hours" kind="hours" used={6.5} limit={10} />
      <UsageMeter label="Small" size="sm" used={3} limit={10} unit="keys" />
    </div>
  );
}
/** Money, hours, a period marker, a hint and the small size. */
export const Kinds_: Story = { name: "Kinds", render: () => <Kinds /> };

function Summary() {
  const ar = useAr();
  return (
    <div className="max-w-2xl">
      <UsageSummary planName={ar ? "الفريق" : "Team"} period={ar ? "١ إلى ٣٠ سبتمبر" : "1 Sep to 30 Sep"} items={usageItems(ar)} onUpgrade={() => undefined} />
    </div>
  );
}
/** The plan panel: every resource, the estimated overage and an upgrade action. */
export const Summary_: Story = { name: "Summary", render: () => <Summary /> };

/** Budget in hours and money with a pace tick and an end-of-period projection. */
export const Burn: Story = { render: () => <div className="max-w-md"><BudgetBurn hours={{ used: 46, budget: 80 }} money={{ used: 1900, budget: 4000 }} elapsed={0.6} /></div> };

export const Loading: Story = { render: () => <div className="max-w-2xl"><UsageSummary planName="Team" items={[]} loading /></div> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <PlanUsageDemo /> };
