import { FunnelBuilder } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { funnelSources, useAr, wait } from "./_moharrik-demo";

const meta = { title: "Components/Analytics/Funnel Builder", component: FunnelBuilder, parameters: { layout: "padded" } } satisfies Meta<typeof FunnelBuilder>;
export default meta;
type Story = StoryObj;

function Builder({ prefilled = false }) {
  const ar = useAr();
  const sources = funnelSources(ar);
  const pick = (ids: string[]) => ids.map((id, i) => {
    const s = sources.find((x) => x.id === id)!;
    return { id: `st${i}`, sourceId: s.id, kind: s.kind, label: s.label, detail: s.detail };
  });
  return (
    <div className="max-w-2xl">
      <FunnelBuilder
        sources={sources}
        defaultValue={prefilled ? { name: ar ? "الدفع في المتجر" : "Store checkout", steps: pick(["p1", "e1", "e2", "p3", "e3"]), window: { amount: 7, unit: "day" } } : undefined}
        onSave={async (value) => {
          await wait(700);
          if (value.name.trim().toLowerCase() === "taken") return { error: ar ? "الاسم مستخدم بالفعل." : "That name is already used." };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Builder /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Builder prefilled /> };
export const Editing: Story = { render: () => <Builder prefilled /> };
