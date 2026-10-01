import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImportDemo, useAr } from "./_workflow-p2-demo";

const meta = { title: "Components/CRM/Pages/Import Contacts", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "استيراد جهات الاتصال" : "Import contacts"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "أضف الأشخاص من جدول بيانات." : "Bring people in from a spreadsheet."}</p>
      </header>
      <ImportDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
