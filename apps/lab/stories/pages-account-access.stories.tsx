/*
 * Connected apps, agent keys and what each agent may touch. Revoke an app, create a key, or give the Deploy
 * agent write on Billing to see the rollback.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_team-demo";
import { AccessDemo, PageShell } from "./_team-pages";

const meta = { title: "Pages/Account/Access", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <PageShell title={ar ? "الوصول" : "Access"} description={ar ? "التطبيقات والوكلاء الذين يستطيعون العمل باسمك." : "The apps and agents that can act on your behalf."}>
      <AccessDemo />
    </PageShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
