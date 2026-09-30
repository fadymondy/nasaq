import type { Meta, StoryObj } from "@storybook/react-vite";
import { AskAiDemo, InsightDemo, useAr } from "./_t1-demo";

const meta = { title: "Pages/AI/Ask AI", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "اسأل الذكاء الاصطناعي" : "Ask AI"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "حدّد نصًا لتسأل عنه، وشاهد الرؤية التي وجدها الذكاء الاصطناعي." : "Select text to ask about it, and see the insight the AI found."}</p>
      </header>
      <AskAiDemo />
      <InsightDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
