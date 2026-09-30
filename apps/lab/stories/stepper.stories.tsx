import { Button, Stepper, StepperItem, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Navigation/Stepper", component: Stepper, args: { current: 1, children: null } } satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

const COPY = {
  en: {
    steps: [
      { title: "Account", description: "Name and email" },
      { title: "Workspace", description: "Pick a plan" },
      { title: "Invite", description: "Add your team" },
      { title: "Done", description: "Start working" },
    ],
    back: "Back",
    next: "Next",
    finish: "Finish",
    reset: "Start over",
    wizard: "Setup steps",
  },
  ar: {
    steps: [
      { title: "الحساب", description: "الاسم والبريد" },
      { title: "مساحة العمل", description: "اختر الباقة" },
      { title: "الدعوات", description: "أضف فريقك" },
      { title: "تم", description: "ابدأ العمل" },
    ],
    back: "السابق",
    next: "التالي",
    finish: "إنهاء",
    reset: "ابدأ من جديد",
    wizard: "خطوات الإعداد",
  },
};
const useCopy = () => COPY[useNasaq().locale.startsWith("ar") ? "ar" : "en"];

function Steps({ current, orientation, error, onStep }: { current: number; orientation?: "horizontal" | "vertical"; error?: number; onStep?: (i: number) => void }) {
  const c = useCopy();
  return (
    <Stepper current={current} orientation={orientation} aria-label={c.wizard}>
      {c.steps.map((s, i) => (
        <StepperItem key={s.title} title={s.title} description={s.description} error={error === i} onClick={onStep && i < current ? () => onStep(i) : undefined} />
      ))}
    </Stepper>
  );
}

/** Complete, current and upcoming steps with connectors. In Arabic the row runs right to left. */
export const Horizontal: Story = { render: () => <Steps current={1} /> };

const VerticalDemo = () => <div className="w-72"><Steps current={2} orientation="vertical" /></div>;
export const Vertical: Story = { render: () => <VerticalDemo /> };

/** A failed step shows an X and "Error" to screen readers, never colour alone. */
export const WithError: Story = { render: () => <Steps current={2} error={2} /> };

/** Finished steps are buttons that take you back. */
export const ClickableSteps: Story = {
  render: () => {
    const [current, setCurrent] = useState(3);
    return (
      <div className="flex flex-col gap-4">
        <Steps current={current} onStep={setCurrent} />
        <p className="text-caption text-muted-foreground">{current + 1} / 4</p>
      </div>
    );
  },
};

/** A wizard: Back and Next drive `current`. */
function WizardDemo() {
    const c = useCopy();
    const [current, setCurrent] = useState(0);
    const last = current === c.steps.length - 1;
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6 rounded-card border border-border p-5">
        <Steps current={current} onStep={setCurrent} />
        <div className="rounded-control border border-dashed border-border p-6 text-body-sm text-muted-foreground">{c.steps[current]?.title}</div>
        <div className="flex justify-between">
          <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>{c.back}</Button>
          <Button variant="primary" onClick={() => setCurrent((n) => (last ? 0 : n + 1))}>{last ? c.reset : current === c.steps.length - 2 ? c.finish : c.next}</Button>
        </div>
      </div>
    );
}

export const Wizard: Story = { render: () => <WizardDemo /> };

/** The same wizard forced to Arabic (RTL), whatever the toolbar says. */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <WizardDemo /> };
export const ArabicVertical: Story = { globals: { locale: "ar" }, render: () => <VerticalDemo /> };
