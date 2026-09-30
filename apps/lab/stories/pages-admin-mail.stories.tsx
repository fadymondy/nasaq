/* Mail settings page: SMTP and mail domains in tabs. Fake data. */
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MailDomainsDemo, SmtpSettingsDemo, useAr } from "./_infra-admin-demo";

const meta = { title: "Pages/Admin/Mail Settings", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "البريد" : "Mail"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "إعدادات الإرسال ونطاقات البريد وصناديقه." : "Sending settings, mail domains and mailboxes."}</p>
      </header>
      <Tabs defaultValue="smtp">
        <TabsList variant="underline">
          <TabsTab value="smtp">SMTP</TabsTab>
          <TabsTab value="domains">{ar ? "النطاقات" : "Domains"}</TabsTab>
          <TabsIndicator />
        </TabsList>
        <TabsPanel value="smtp">
          <SmtpSettingsDemo />
        </TabsPanel>
        <TabsPanel value="domains">
          <MailDomainsDemo />
        </TabsPanel>
      </Tabs>
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
