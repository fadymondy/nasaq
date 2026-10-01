import { Button, PlanCard, PlanGrid, Price } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Pricing/Plan Card",
  component: PlanCard,
  args: { name: "Team", description: "For studios and product teams.", price: <Price amount={12} period="seat-month" size="lg" /> },
  decorators: [frame("w-full max-w-5xl", "mahaam")],
} satisfies Meta<typeof PlanCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { features: ["Unlimited projects", "Customer portal"], action: <Button variant="secondary">Choose Team</Button> } };

/** Three plans; the recommended one is tinted, lifted and has the only primary button. Dashes show what a bigger plan adds. Prices are illustrative. */
export const Grid: Story = {
  render: () => (
    <PlanGrid>
      <PlanCard
        name="Solo"
        description="One person, a few clients."
        price={<Price amount={0} size="lg" />}
        features={["3 projects", "Time tracking", "Feedback SDK", { label: "Customer portal", included: false }, { label: "AI agents", included: false }]}
        action={<Button variant="secondary" size="lg">Start free</Button>}
        footnote="No card required"
      />
      <PlanCard
        highlighted
        badge="Most popular"
        name="Team"
        description="For studios and product teams."
        price={<Price amount={12} compareAt={15} period="seat-month" size="lg" />}
        priceNote="Billed $144 yearly per seat"
        featuresTitle="Everything in Solo, plus"
        features={["Unlimited projects", "Customer portal", "Invoices from time", { label: "AI usage billing", hint: "Pass AI cost through to clients with your markup." }]}
        action={<Button variant="primary" size="lg">Start 14-day free trial</Button>}
        footnote="Cancel anytime"
      />
      <PlanCard
        name="Agency"
        description="Many clients, AI agents on the board."
        price={<Price amount={24} period="seat-month" size="lg" />}
        featuresTitle="Everything in Team, plus"
        features={["MCP and AI agents", "AI usage billing", "Priority support"]}
        action={<Button variant="secondary" size="lg">Choose Agency</Button>}
      />
    </PlanGrid>
  ),
};

/** Inside the app: the account's plan has a neutral ring and a "Current plan" pill. */
export const Current: Story = {
  name: "Current plan",
  render: () => (
    <PlanGrid>
      <PlanCard current name="Solo" description="One person, a few clients." price={<Price amount={0} size="lg" />} features={["3 projects", "Time tracking"]} action={<Button variant="secondary" size="lg" disabled>Current plan</Button>} />
      <PlanCard highlighted badge="Recommended" name="Team" description="For studios and product teams." price={<Price amount={12} period="seat-month" size="lg" />} featuresTitle="Everything in Solo, plus" features={["Unlimited projects", "Customer portal"]} action={<Button variant="primary" size="lg">Upgrade to Team</Button>} />
    </PlanGrid>
  ),
};
