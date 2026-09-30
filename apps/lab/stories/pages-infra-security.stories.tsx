/* Certificates and the vulnerability report side by side on a security page. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CertsDemo, useAr, VulnDemo } from "./_infra-demo";

const meta = { title: "Pages/Infra/Certificates and Vulnerabilities", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "الأمان" : "Security"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "الشهادات التي توشك على الانتهاء والثغرات التي تحتاج إلى ترقيع." : "Certificates about to expire and vulnerabilities that need patching."}</p>
      </header>
      <CertsDemo />
      <VulnDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
