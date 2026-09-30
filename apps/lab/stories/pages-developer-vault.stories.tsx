/* Vault: page story with a fake server. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { VaultDemo, useAr } from "./_explorer-demo";

const meta = { title: "Pages/Developer/Vault", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "الأسرار" : "Secrets"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "بيانات الاعتماد لهذا المشروع. يُسجَّل كل كشف ونسخ." : "Credentials for this project. Every reveal and copy is logged."}</p>
      </header>
      <VaultDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
