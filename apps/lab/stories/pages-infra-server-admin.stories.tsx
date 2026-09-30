/* Server admin: services, package updates, SSH keys by server and the job queue, in tabs. Fake data and a fake server. */
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { JobQueueDemo, PackageUpdatesDemo, ServiceUnitsDemo, SshKeysDemo, useAr } from "./_infra-admin-demo";

const meta = { title: "Pages/Infra/Server Admin", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "إدارة الخادم" : "Server admin"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "الخدمات والتحديثات ومفاتيح SSH وطابور المهام لخادم واحد." : "Services, updates, SSH keys and the job queue of a server."}</p>
      </header>
      <Tabs defaultValue="services">
        <TabsList variant="underline">
          <TabsTab value="services">{ar ? "الخدمات" : "Services"}</TabsTab>
          <TabsTab value="updates">{ar ? "التحديثات" : "Updates"}</TabsTab>
          <TabsTab value="keys">{ar ? "مفاتيح SSH" : "SSH keys"}</TabsTab>
          <TabsTab value="jobs">{ar ? "المهام" : "Jobs"}</TabsTab>
          <TabsIndicator />
        </TabsList>
        <TabsPanel value="services">
          <ServiceUnitsDemo />
        </TabsPanel>
        <TabsPanel value="updates">
          <PackageUpdatesDemo />
        </TabsPanel>
        <TabsPanel value="keys">
          <SshKeysDemo />
        </TabsPanel>
        <TabsPanel value="jobs">
          <JobQueueDemo />
        </TabsPanel>
      </Tabs>
    </main>
  );
}

/** Restart nginx (it asks first), stop and start a unit, update packages and see the restart banner, tick a key onto a server, retry or forget failed jobs. */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
