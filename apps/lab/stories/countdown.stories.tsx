import { Button, CycleDots, IdleTimePrompt, TimerReadout, TimerRing, useCountdownTimer, useIdleTime } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DEMO_SPEED, useAr } from "./_focus-demo";

const meta = { title: "Components/Utilities/Countdown", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** A 10 minute countdown at 60x: one second in the lab is a minute on the clock. */
function CountdownDemo() {
  const ar = useAr();
  const [finished, setFinished] = useState(0);
  const timer = useCountdownTimer({ durationMs: 10 * 60_000, speed: DEMO_SPEED, onComplete: () => setFinished((n) => n + 1) });
  const running = timer.status === "running";
  const idle = timer.status === "idle" || timer.status === "done";
  return (
    <div className="flex flex-col items-start gap-4">
      <TimerRing fraction={1 - timer.elapsed} paused={timer.status === "paused"} size={200}>
        <TimerReadout seconds={timer.seconds} />
        <span data-testid="status" className="text-caption text-muted-foreground">
          {ar ? `الحالة: ${timer.status}` : `Status: ${timer.status}`}
        </span>
      </TimerRing>
      <div className="flex flex-wrap gap-2">
        {idle ? (
          <Button variant="primary" onClick={() => timer.start()}>
            {ar ? "ابدأ" : "Start"}
          </Button>
        ) : (
          <Button variant="secondary" onClick={running ? timer.pause : timer.resume}>
            {running ? (ar ? "إيقاف مؤقت" : "Pause") : ar ? "متابعة" : "Resume"}
          </Button>
        )}
        <Button variant="ghost" onClick={() => timer.reset()}>
          {ar ? "إعادة" : "Reset"}
        </Button>
      </div>
      <CycleDots total={3} done={Math.min(3, finished)} active={running} />
      <p className="text-caption text-muted-foreground">{ar ? "يعمل بسرعة ٦٠ ضعفًا: كل ثانية تساوي دقيقة." : "Runs at 60x: one second is one minute."}</p>
    </div>
  );
}

/** Real idle detection with a 4 second threshold: stop touching the page for 4 seconds, then move the mouse. */
function IdleDemo() {
  const ar = useAr();
  const { idle, dismiss } = useIdleTime({ thresholdMs: 4000 });
  const [answer, setAnswer] = useState("");
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-md text-body text-muted-foreground">{ar ? "اترك الصفحة أربع ثوانٍ دون لمس ثم حرّك الفأرة." : "Leave the page untouched for 4 seconds, then move the mouse."}</p>
      <p role="status" className="text-label text-foreground">
        {answer}
      </p>
      <IdleTimePrompt
        idle={idle}
        onKeep={() => {
          setAnswer(ar ? "احتُفظ بالوقت" : "Kept the time");
          dismiss();
        }}
        onDiscard={(i) => {
          setAnswer(ar ? `حُذف ${Math.round(i.idleMs / 1000)} ثوانٍ` : `Discarded ${Math.round(i.idleMs / 1000)} s`);
          dismiss();
        }}
        onDiscardAndStop={() => {
          setAnswer(ar ? "حُذف الوقت وأُوقف المؤقّت" : "Discarded and stopped");
          dismiss();
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <CountdownDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CountdownDemo /> };
export const IdleTime: Story = { render: () => <IdleDemo /> };
export const IdleTimeArabic: Story = { globals: { locale: "ar" }, render: () => <IdleDemo /> };
