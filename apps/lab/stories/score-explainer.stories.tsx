import { ScoreBadge, ScoreExplainer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeScoreDimensions } from "./_crm-r1-demo";

const meta = { title: "Components/AI Assistant/Score Explainer", component: ScoreExplainer, parameters: { layout: "padded" } } satisfies Meta<typeof ScoreExplainer>;
export default meta;
type Story = StoryObj;

/** The badge as it sits in a table cell. Press it to see why. A dashed border and "≈" say the score was inferred. */
export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ScoreBadge score={78} confidence={0.75} aiGenerated dimensions={makeScoreDimensions(false)} summary="Strong fit, recently active." />
      <ScoreBadge score={48} dimensions={makeScoreDimensions(false).slice(0, 2)} />
      <ScoreBadge score={22} dimensions={makeScoreDimensions(false).slice(3)} />
    </div>
  ),
};

/** The full explainer, inline. */
export const Inline: Story = {
  render: () => (
    <div className="max-w-xl">
      <ScoreExplainer score={78} confidence={0.75} model="nasaq-score-2" aiGenerated dimensions={makeScoreDimensions(false)} summary="Strong fit, recently active." />
    </div>
  ),
};

export const OpenBadge: Story = {
  render: () => (
    <div className="h-[28rem]">
      <ScoreBadge defaultOpen score={78} confidence={0.75} aiGenerated dimensions={makeScoreDimensions(false)} />
    </div>
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ScoreBadge score={78} confidence={0.75} aiGenerated dimensions={makeScoreDimensions(true)} summary="ملاءمة قوية ونشاط حديث." />
        <ScoreBadge score={22} dimensions={makeScoreDimensions(true).slice(3)} />
      </div>
      <div className="max-w-xl">
        <ScoreExplainer score={78} confidence={0.75} aiGenerated dimensions={makeScoreDimensions(true)} summary="ملاءمة قوية ونشاط حديث." />
      </div>
    </div>
  ),
};
