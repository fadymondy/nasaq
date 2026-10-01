import { type BillingPeriod, BillingPeriodSwitch, PlanComparison, PlanPicker, PricingTable, toast, yearlySavings } from "@nasaq/web";
import { useState } from "react";
import { frame } from "./_frame";
import { fakeCheckout, useSamplePlans } from "./_plans";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Pricing/Pricing Table",
  component: PricingTable,
  args: { plans: [] },
  decorators: [frame("w-full max-w-6xl", "mahaam")],
} satisfies Meta<typeof PricingTable>;
export default meta;
type Story = StoryObj<typeof meta>;

const checkout = (name: unknown, period: BillingPeriod) => {
  toast(`Checkout → ${String(name)} (${period})`);
  return fakeCheckout();
};

function PricingPage() {
  const { plans, sections, ar } = useSamplePlans();
  const [period, setPeriod] = useState<BillingPeriod>("year");
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-h1 text-foreground">{ar ? "خطة لكل مرحلة من عملك" : "A plan for every stage of your studio"}</h1>
        <p className="max-w-xl text-body text-muted-foreground">
          {ar ? "ابدأ مجانًا، وارتقِ حين يكبر فريقك. غيّر خطتك أو ألغها في أي وقت." : "Start free, upgrade when your team grows. Change or cancel your plan any time."}
        </p>
      </header>
      <PricingTable
        plans={plans}
        period={period}
        onPeriodChange={setPeriod}
        onSelect={(plan, p) => checkout(plan.name, p)}
        note={ar ? "الأسعار بالدولار الأمريكي ولا تشمل ضريبة القيمة المضافة." : "Prices in USD, excluding VAT. Cancel anytime."}
      />
      <section className="flex flex-col gap-4">
        <h2 className="text-center text-h2 text-foreground">{ar ? "قارن الخطط" : "Compare plans"}</h2>
        <PlanComparison plans={plans} sections={sections} period={period} onSelect={(plan, p) => checkout(plan.name, p)} caption={ar ? "قارن الخطط" : "Compare plans"} />
      </section>
    </div>
  );
}

/** The public pricing page: switch, four plans with working buttons, and the comparison under them. Click a plan to see the busy state. */
export const Page: Story = { render: () => <PricingPage /> };

function InAppPlans() {
  const { plans } = useSamplePlans();
  return <PricingTable plans={plans} currentPlanId="team" defaultPeriod="year" onSelect={(plan, p) => checkout(plan.name, p)} />;
}

/** Inside the app, on Team: the buttons say Current plan, Upgrade and Downgrade. */
export const InApp: Story = { name: "In the app (current plan)", render: () => <InAppPlans /> };

function Monthly() {
  const { plans } = useSamplePlans();
  return <PricingTable plans={plans.slice(0, 3)} onSelect={(plan, p) => checkout(plan.name, p)} />;
}

/** Three plans, monthly first. Flip to Yearly to see the saving and the struck-through price. */
export const ThreePlans: Story = { render: () => <Monthly /> };

function Comparison() {
  const { plans, sections, ar } = useSamplePlans();
  return <PlanComparison plans={plans} sections={sections} currentPlanId="free" onSelect={(plan, p) => checkout(plan.name, p)} caption={ar ? "قارن الخطط" : "Compare plans"} />;
}

/** Every feature, plan by plan. The header stays on screen while you scroll; hover the dotted labels. */
export const ComparisonTable: Story = { render: () => <Comparison /> };

function PickerDemo() {
  const { plans } = useSamplePlans();
  const [period, setPeriod] = useState<BillingPeriod>("year");
  const [plan, setPlan] = useState("team");
  return (
    <div className="flex max-w-md flex-col gap-3">
      <BillingPeriodSwitch value={period} onValueChange={setPeriod} savings={yearlySavings(plans)} />
      <PlanPicker plans={plans.slice(0, 3)} value={plan} onValueChange={setPlan} period={period} currentPlanId="free" />
    </div>
  );
}

/** Plans as radio cards, for a dialog, checkout or onboarding step. The current plan is shown but disabled. */
export const Picker: Story = { name: "Plan picker", render: () => <PickerDemo /> };
