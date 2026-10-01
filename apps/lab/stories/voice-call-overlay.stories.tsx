import { VoiceCallOverlay, VoiceVisualizer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useSimulatedCall } from "./_t2-demo";

const meta = { title: "Components/AI Assistant/Voice Call Overlay", component: VoiceCallOverlay, parameters: { layout: "fullscreen" } } satisfies Meta<typeof VoiceCallOverlay>;
export default meta;
type Story = StoryObj;

const agent = { name: "Salma, support agent", avatar: "🎧", subtitle: "Voice agent" };
const agentAr = { name: "سلمى، وكيلة الدعم", avatar: "🎧", subtitle: "وكيل صوتي" };

function Scripted({ ar }: { ar?: boolean }) {
  const [muted, setMuted] = useState(false);
  const { state, level, elapsed, captions } = useSimulatedCall(!!ar, true);
  return (
    <div className="relative h-[640px] overflow-hidden rounded-card border border-border">
      <VoiceCallOverlay contained state={state} level={muted ? 0 : level} agent={ar ? agentAr : agent} muted={muted} onMutedChange={setMuted} onEnd={() => undefined} elapsed={elapsed} captions={captions} />
    </div>
  );
}

/** A scripted call cycling through connecting, listening, thinking and speaking. The level is simulated; no microphone is used. */
export const Default: Story = { render: () => <Scripted /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Scripted ar /> };
export const ErrorState: Story = {
  render: () => (
    <div className="relative h-[640px] overflow-hidden rounded-card border border-border">
      <VoiceCallOverlay contained state="error" agent={agent} error="The connection dropped." onRetry={() => undefined} onEnd={() => undefined} />
    </div>
  ),
};
/** The bare visualiser at fixed levels. */
export const Visualizer: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-6">
      {(["listening", "thinking", "speaking"] as const).map((s) => (
        <VoiceVisualizer key={s} state={s} level={s === "thinking" ? 0 : 0.6} />
      ))}
    </div>
  ),
};
