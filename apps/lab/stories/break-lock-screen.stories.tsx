import { BreakLockScreen, Button, useCountdownTimer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DEMO_SPEED, useAr } from "./_focus-demo";

const meta = { title: "Components/Productivity/Break Lock Screen", component: BreakLockScreen, parameters: { layout: "padded" } } satisfies Meta<typeof BreakLockScreen>;
export default meta;
type Story = StoryObj;

/** A 5 minute break at 60x. Escape asks about skipping; the break also closes by itself at zero. */
function BreakDemo({ phase = "shortBreak" }: { phase?: "shortBreak" | "longBreak" }) {
  const ar = useAr();
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState("");
  const ms = phase === "longBreak" ? 15 * 60_000 : 5 * 60_000;
  const timer = useCountdownTimer({
    durationMs: ms,
    speed: DEMO_SPEED,
    autoStart: true,
    onComplete: () => {
      setOpen(false);
      setNote(ar ? "انتهت الاستراحة" : "Break finished");
    },
  });
  const again = () => {
    setNote("");
    timer.start(ms);
    setOpen(true);
  };
  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="secondary" onClick={again}>
        {ar ? "أظهر شاشة الاستراحة" : "Show the break screen"}
      </Button>
      <p role="status" className="text-label text-foreground">
        {note}
      </p>
      <BreakLockScreen
        open={open}
        phase={phase}
        seconds={timer.seconds}
        fraction={1 - timer.elapsed}
        cycle={phase === "longBreak" ? 4 : 2}
        cycles={4}
        completed={phase === "longBreak" ? 4 : 2}
        nextTask={ar ? "مراجعة تصميم الشريط الجانبي" : "Review the sidebar design"}
        onPostpone={() => {
          setOpen(false);
          setNote(ar ? "أُجّلت الاستراحة ٥ دقائق" : "Postponed by 5 minutes");
        }}
        onSkip={() => {
          setOpen(false);
          setNote(ar ? "تُخطّيت الاستراحة" : "Break skipped");
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <BreakDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BreakDemo /> };
export const LongBreak: Story = { render: () => <BreakDemo phase="longBreak" /> };
