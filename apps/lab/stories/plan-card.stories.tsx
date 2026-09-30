import { Badge, Button, PlanCard, PlanGrid, Price } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Commerce/Plan Card",
  component: PlanCard,
  args: { name: "Team", description: "For studios and product teams.", price: <Price amount={12} period="seat-month" size="lg" /> },
  decorators: [frame("w-full max-w-5xl", "mahaam")],
} satisfies Meta<typeof PlanCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { args: { features: ["Unlimited projects", "Customer portal"], action: <Button variant="secondary">Choose Team</Button> } };

/** Three plans; the recommended one is tinted and has the only primary button. Prices are illustrative. */
export const Grid: Story = {
  render: () => (
    <PlanGrid>
      <PlanCard name="Solo" description="One person, a few clients." price={<Price amount={0} size="lg" />} features={["3 projects", "Time tracking", "Feedback SDK"]} action={<Button variant="secondary">Start free</Button>} />
      <PlanCard
        highlighted
        badge={<Badge variant="brand">Most popular</Badge>}
        name="Team"
        description="For studios and product teams."
        price={<Price amount={12} period="seat-month" size="lg" />}
        priceNote="Billed monthly"
        features={["Everything in Solo, plus", "Unlimited projects", "Customer portal", "Invoices from time"]}
        action={<Button>Start 14-day trial</Button>}
      />
      <PlanCard name="Agency" description="Many clients, AI agents on the board." price={<Price amount={24} period="seat-month" size="lg" />} features={["Everything in Team, plus", "MCP and AI agents", "AI usage billing"]} action={<Button variant="secondary">Choose Agency</Button>} />
    </PlanGrid>
  ),
};
