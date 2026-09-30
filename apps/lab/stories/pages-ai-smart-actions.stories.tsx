import type { Meta, StoryObj } from "@storybook/react-vite";
import { SmartActionsDemo, useAr } from "./_x3-demo";

const meta = { title: "Pages/AI/Smart Actions", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "الإجراءات الذكية" : "Smart actions"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "إجراءات ذكاء اصطناعي سريعة وقائمة Ctrl J." : "Quick AI actions with a Cmd or Ctrl J menu."}</p>
      </header>
      <SmartActionsDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
