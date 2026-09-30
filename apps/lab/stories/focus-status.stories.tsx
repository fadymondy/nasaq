import { DoNotDisturbToggle, FocusAvatar, type FocusState, FocusStatusChip } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoPeople, useAr } from "./_focus-demo";

const meta = { title: "Components/Health/Focus Status", component: FocusStatusChip, parameters: { layout: "padded" } } satisfies Meta<typeof FocusStatusChip>;
export default meta;
type Story = StoryObj;

const STATES: FocusState[] = ["available", "focus", "break", "dnd"];

function StatusDemo() {
  const ar = useAr();
  const [dnd, setDnd] = useState(false);
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {STATES.map((s) => (
          <FocusStatusChip key={s} state={s} seconds={s === "focus" ? 754 : s === "break" ? 185 : undefined} />
        ))}
        <FocusStatusChip state="focus" seconds={754} text={ar ? "مراجعة التصميم" : "Design review"} onClick={() => undefined} />
      </div>
      <ul className="flex flex-col gap-3">
        {demoPeople(ar).map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <FocusAvatar name={p.name} state={p.state} size="lg" />
            <span className="flex-1 text-label text-foreground">{p.name}</span>
            <FocusAvatar name={p.name} state={p.state} size="sm" />
          </li>
        ))}
      </ul>
      <DoNotDisturbToggle checked={dnd} onCheckedChange={setDnd} until={ar ? "٦:٠٠ م" : "6:00 PM"} />
    </div>
  );
}

export const Default: Story = { render: () => <StatusDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StatusDemo /> };
