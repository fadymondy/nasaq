import type { Meta, StoryObj } from "@storybook/react-vite";
import { CitationsDemo, useAr } from "./_t1-demo";

const meta = { title: "Components/AI Assistant/Pages/Cited Answer", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "إجابة موثّقة" : "Cited answer"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "إجابة يمكنك التحقق منها: علامات ومصادر واقتباسات وكيف أُنتجت." : "An answer you can check: markers, sources, quotes and how it was made."}</p>
      </header>
      <CitationsDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
