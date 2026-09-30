import { EngineCard, EngineCardGrid } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { engineVariants, NOW, useEngines, useAr } from "./_health-demo";

const meta = { title: "Components/Health/Engine Card", component: EngineCard, parameters: { layout: "padded" } } satisfies Meta<typeof EngineCard>;
export default meta;
type Story = StoryObj;

/** The seven engines, live. Log a cup, then log another straight away to see the server's own error. */
function Live() {
  const { snapshots, onAction } = useEngines(NOW);
  return (
    <EngineCardGrid className="max-w-6xl">
      {snapshots.map((s) => (
        <EngineCard key={s.engine} snapshot={s} now={NOW} live={false} onAction={onAction(s.engine)} detailHref={`#${s.engine}`} />
      ))}
    </EngineCardGrid>
  );
}

function States() {
  const ar = useAr();
  return (
    <EngineCardGrid className="max-w-6xl">
      {engineVariants(NOW, ar).map(({ label, snapshot }) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-caption text-muted-foreground">{label}</span>
          <EngineCard snapshot={snapshot} now={NOW} live={false} />
        </div>
      ))}
    </EngineCardGrid>
  );
}

export const Default: Story = { render: () => <Live /> };
export const AllStates: Story = { render: () => <States /> };
export const Loading: Story = {
  render: () => (
    <EngineCardGrid className="max-w-3xl">
      <EngineCard loading snapshot={{ engine: "hydration", state: "idle", totalMl: 0, dailyCapMl: 5000, unitMl: 250, unitsLogged: 0, unitsTotal: 20 }} />
      <EngineCard loading snapshot={{ engine: "caffeine", state: "clear", blockMinutes: 90, violationsToday: 0, cupsToday: 0 }} />
    </EngineCardGrid>
  ),
};
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Live /> };
export const ArabicStates: Story = { globals: { locale: "ar" }, render: () => <States /> };
