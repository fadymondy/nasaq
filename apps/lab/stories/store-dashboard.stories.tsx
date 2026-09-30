import { StoreDashboard } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { liveVisitorsAt, storeDashboardDemo } from "./_store-dashboard-demo";
import { useAr } from "./_s-demo";

const meta = { title: "Components/Commerce/Store Dashboard", component: StoreDashboard, parameters: { layout: "padded" } } satisfies Meta<typeof StoreDashboard>;
export default meta;
type Story = StoryObj;

function Demo({ days = 30, compare = "previous" as const, quiet = false }: { days?: number; compare?: "none" | "previous"; quiet?: boolean }) {
  const ar = useAr();
  const data = storeDashboardDemo(ar ? "ar" : "en", { days, compare });
  return (
    <StoreDashboard
      {...data}
      liveVisitors={quiet ? undefined : liveVisitorsAt(240)}
      onOpenOrder={() => undefined}
      onOpenProduct={() => undefined}
      onRestock={() => undefined}
    />
  );
}

/** Thirty days against the thirty before, with live visitors, stock alerts and the customisable board. */
export const Default: Story = { render: () => <Demo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };

/** No previous period: the tiles and the chart show no change. */
export const WithoutComparison: Story = { render: () => <Demo compare="none" quiet /> };

/** Skeleton tiles and a loading board. */
export const Loading: Story = {
  render: () => {
    const data = storeDashboardDemo("en", { days: 30 });
    return <StoreDashboard {...data} loading />;
  },
};

/** No orders in the period. */
export const Empty: Story = {
  render: () => {
    const data = storeDashboardDemo("en", { days: 30 });
    return <StoreDashboard {...data} empty />;
  },
};
