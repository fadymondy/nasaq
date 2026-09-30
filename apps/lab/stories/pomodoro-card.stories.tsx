import { PomodoroCard } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useFocusDemo } from "./_focus-demo";

const meta = { title: "Components/Health/Pomodoro Card", component: PomodoroCard, parameters: { layout: "padded" } } satisfies Meta<typeof PomodoroCard>;
export default meta;
type Story = StoryObj;

/** Runs 60x faster than real time. The break lock screen is a separate story, so the card stays on screen here. */
function CardDemo({ picker = true }: { picker?: boolean }) {
  const demo = useFocusDemo({ config: { cyclesBeforeLongBreak: 2, autoStartBreaks: false } });
  return <PomodoroCard pomodoro={demo.pomodoro} task={demo.task} tasks={picker ? demo.tasks : undefined} onTaskChange={(t) => demo.setTaskId(t?.id ?? null)} />;
}

export const Default: Story = { render: () => <CardDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CardDemo /> };
export const FixedTask: Story = { render: () => <CardDemo picker={false} /> };
