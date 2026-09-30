import { CycleDots, TimerReadout, TimerRing, type TimerRingTone, timerToneText } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_focus-demo";

const meta = { title: "Components/Utilities/Timer Ring", component: TimerRing, parameters: { layout: "padded" } } satisfies Meta<typeof TimerRing>;
export default meta;
type Story = StoryObj;

function Phases() {
  const ar = useAr();
  const phases: { tone: TimerRingTone; label: string; seconds: number; fraction: number }[] = [
    { tone: "primary", label: ar ? "تركيز" : "Focus", seconds: 14 * 60 + 5, fraction: 0.56 },
    { tone: "success", label: ar ? "استراحة قصيرة" : "Short break", seconds: 3 * 60 + 20, fraction: 0.66 },
    { tone: "info", label: ar ? "استراحة طويلة" : "Long break", seconds: 12 * 60, fraction: 0.8 },
    { tone: "warning", label: ar ? "متوقف مؤقتًا" : "Paused", seconds: 9 * 60 + 40, fraction: 0.4 },
  ];
  return (
    <div className="flex flex-wrap items-center gap-8">
      {phases.map((p) => (
        <div key={p.tone} className="flex flex-col items-center gap-3">
          <TimerRing fraction={p.fraction} tone={p.tone} paused={p.tone === "warning"} size={176} thickness={10}>
            <TimerReadout seconds={p.seconds} label={p.label} />
            <span className={`text-label ${timerToneText[p.tone]}`}>{p.label}</span>
          </TimerRing>
          <CycleDots total={4} done={p.tone === "info" ? 4 : p.tone === "success" ? 2 : 1} active={p.tone === "primary"} />
        </div>
      ))}
    </div>
  );
}

export const Default: Story = { render: () => <Phases /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Phases /> };
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {[96, 160, 240].map((size) => (
        <TimerRing key={size} fraction={0.7} size={size} thickness={Math.round(size / 16)}>
          <TimerReadout seconds={1050} />
        </TimerRing>
      ))}
    </div>
  ),
};
