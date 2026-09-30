import { Badge, Button, Price, Rating, ScreenshotFrame, Spotlight, useNasaq } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Brand/Spotlight",
  component: Spotlight,
  args: {
    brand: "mahaam",
    title: "Mahaam",
    eyebrow: <Badge variant="accent">Editor's pick</Badge>,
    description: "Projects, tasks, time and invoices in one place — with AI agents that work your issue board over MCP.",
  },
  decorators: [frame("w-full max-w-5xl")],
} satisfies Meta<typeof Spotlight>;
export default meta;
type Story = StoryObj<typeof meta>;

function Glimpse() {
  return (
    <ScreenshotFrame variant="window" title="Mahaam" label="Mahaam board" className="w-72">
      <div className="grid grid-cols-3 gap-2 p-3">
        {[3, 2, 1].map((n, c) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static mock
          <div key={c} className="flex flex-col gap-1.5">
            {Array.from({ length: n }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static mock
              <div key={i} className="h-8 rounded-control bg-nq-surface-raised" />
            ))}
          </div>
        ))}
      </div>
    </ScreenshotFrame>
  );
}

/** The store hero. One primary button: it takes the featured product's colour. */
export const Playground: Story = {
  render: (args) => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <Spotlight
        {...args}
        title={ar ? "مهام" : "Mahaam"}
        eyebrow={<Badge variant="accent">{ar ? "اختيار المحررين" : "Editor's pick"}</Badge>}
        description={ar ? "المشاريع والمهام والوقت والفواتير في مكان واحد — مع وكلاء ذكاء اصطناعي يعملون على لوحة مشكلاتك عبر MCP." : args.description}
        actions={
          <>
            <Button>{ar ? "ابدأ التجربة" : "Start free trial"}</Button>
            <Button variant="ghost">{ar ? "التفاصيل" : "Details"}</Button>
          </>
        }
        meta={
          <>
            <Price amount={12} period="seat-month" size="sm" />
            <Rating value={4.8} count={2140} />
          </>
        }
        media={<Glimpse />}
      />
    );
  },
};

/** Compact tiles for a second row of picks. */
export const Medium: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Spotlight brand="zekra" size="md" title="Zekra" description="A memory organ for AI agents: what one session learns, the next one already knows." meta={<Rating value={4.9} count={860} />} actions={<Button size="sm" variant="secondary">View</Button>} />
      <Spotlight brand="orchestra" size="md" title="Orchestra" description="The AI-agentic IDE framework: 290+ MCP tools for ten IDEs." meta={<Rating value={4.8} count={1210} />} actions={<Button size="sm" variant="secondary">View</Button>} />
    </div>
  ),
};
