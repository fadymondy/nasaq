/*
 * Workspaces: the list, the settings of the current one, and the create dialog. Slugs admin, nasaq, sahab and
 * support are taken. Deleting needs the workspace name typed. Onboarding is the first-run screen.
 */
import { Button, CreateWorkspaceDialog, WorkspaceList, WorkspaceOnboarding, WorkspaceSettings } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { checkSlug, initialWorkspaces, useAr, wait } from "./_team-demo";
import { PageShell } from "./_team-pages";

const meta = { title: "Components/Account/Pages/Workspaces", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const slugCheck = async (s: string) => ({ available: await checkSlug(s) });

function Page() {
  const ar = useAr();
  const [list, setList] = useState(() => initialWorkspaces(ar));
  const [open, setOpen] = useState(false);
  const current = list.find((w) => w.current) ?? list[0];
  const leave = async () => {
    await wait(800);
    setList((l) => l.filter((x) => x.id !== current?.id).map((x, i) => ({ ...x, current: i === 0 })));
  };
  return (
    <PageShell title={ar ? "مساحات العمل" : "Workspaces"} description={ar ? "انتقل بين مساحاتك أو أنشئ واحدة جديدة." : "Switch between your workspaces or start a new one."}>
      <WorkspaceList workspaces={list} onOpen={(w) => setList((l) => l.map((x) => ({ ...x, current: x.id === w.id })))} onCreate={() => setOpen(true)} />
      {current ? (
        <WorkspaceSettings
          key={current.id}
          workspace={{ name: current.name, slug: current.slug ?? "" }}
          slugPrefix="nasaq.app/"
          canEdit
          canDelete={current.id === "w1"}
          canLeave={current.id !== "w1"}
          checkSlug={slugCheck}
          onRename={async (v) => {
            await wait(800);
            setList((l) => l.map((x) => (x.id === current.id ? { ...x, name: v.name, slug: v.slug ?? x.slug } : x)));
          }}
          logo={{ onChange: async () => wait(600), onRemove: async () => wait(400) }}
          onLeave={leave}
          onDelete={leave}
        />
      ) : null}
      <CreateWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        slugPrefix="nasaq.app/"
        checkSlug={slugCheck}
        onSubmit={async (v) => {
          await wait(900);
          setList((l) => [...l.map((x) => ({ ...x, current: false })), { id: `w${Date.now()}`, name: v.name, slug: v.slug, role: ar ? "مالك" : "Owner", members: 1, current: true }]);
          setOpen(false);
        }}
      />
      <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
        {ar ? "مساحة عمل جديدة" : "New workspace"}
      </Button>
    </PageShell>
  );
}

const onboarding = () => <WorkspaceOnboarding slugPrefix="nasaq.app/" checkSlug={slugCheck} onSubmit={async () => wait(1000)} />;

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Onboarding: Story = { render: onboarding };
export const OnboardingArabic: Story = { globals: { locale: "ar" }, render: onboarding };
