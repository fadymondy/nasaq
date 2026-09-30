import type { Meta, StoryObj } from "@storybook/react-vite";
import { SummaryDemo, useAr } from "./_x3-demo";

const meta = { title: "Pages/AI/Summarize", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "التلخيص" : "Summarize"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "اطلب ملخصًا وراجع المصادر وقدّم رأيك." : "Ask for a summary, check the sources, give feedback."}</p>
      </header>
      <SummaryDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
