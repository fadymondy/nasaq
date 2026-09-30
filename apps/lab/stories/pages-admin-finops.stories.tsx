/* Cost page for the infrastructure. Fake servers, fake prices. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FinopsCostDemo, useAr } from "./_infra-admin-demo";

const meta = { title: "Pages/Admin/Finops Cost", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "تكاليف البنية التحتية" : "Infrastructure costs"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "ما تدفعه هذا الشهر وأين يمكن التوفير." : "What you pay this month and where you could save."}</p>
      </header>
      <FinopsCostDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
