import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArtifactAnswerDemo, useAr } from "./_t1-demo";

const meta = { title: "Components/AI Assistant/Pages/Generative UI", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "واجهة مولَّدة" : "Generative UI"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "إجابة تعود على شكل جدول ورسم وأزرار، لا نصًا فقط." : "An answer that comes back as a table, a chart and buttons, not just text."}</p>
      </header>
      <ArtifactAnswerDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
