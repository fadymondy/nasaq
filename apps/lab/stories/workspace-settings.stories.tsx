import { CreateWorkspaceDialog, CreateWorkspaceForm, WorkspaceList, WorkspaceOnboarding, WorkspaceSettings } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, checkSlug, initialWorkspaces, useAr, wait } from "./_team-demo";

const meta = { title: "Components/Account/Workspace Settings", component: WorkspaceSettings, parameters: { layout: "padded" } } satisfies Meta<typeof WorkspaceSettings>;
export default meta;
type Story = StoryObj;

const create = async () => {
  await wait(900);
};
const slugCheck = async (s: string) => ({ available: await checkSlug(s) });

function Settings({ role }: { role: "owner" | "admin" | "member" }) {
  const ar = useAr();
  return (
    <WorkspaceSettings
      workspace={{ name: ar ? "استوديو سحاب" : "Sahab Studio", slug: "sahab" }}
      slugPrefix="nasaq.app/"
      canEdit={role !== "member"}
      canDelete={role === "owner"}
      canLeave={role !== "owner"}
      checkSlug={slugCheck}
      onRename={create}
      logo={{ onChange: async () => wait(600), onRemove: async () => wait(400) }}
      onLeave={async () => wait(800)}
      onDelete={async () => wait(900)}
    />
  );
}

/** The slugs admin, nasaq, sahab and support are taken. Delete needs the workspace name typed. */
export const Owner: Story = { render: () => <Settings role="owner" /> };
export const Admin: Story = { render: () => <Settings role="admin" /> };
export const Member: Story = { render: () => <Settings role="member" /> };
export const Onboarding: Story = {
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  render: () => <WorkspaceOnboarding bare slugPrefix="nasaq.app/" checkSlug={slugCheck} onSubmit={create} />,
};
export const Form: Story = { render: () => <CreateWorkspaceForm slugPrefix="nasaq.app/" checkSlug={slugCheck} onSubmit={create} /> };

function ListDemo() {
  return <WorkspaceList workspaces={initialWorkspaces(useAr())} onOpen={() => undefined} onCreate={() => undefined} />;
}
export const List: Story = { render: () => <ListDemo /> };

function DialogDemo() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="text-body underline" onClick={() => setOpen(true)}>
        Create workspace
      </button>
      <CreateWorkspaceDialog open={open} onOpenChange={setOpen} slugPrefix="nasaq.app/" checkSlug={slugCheck} onSubmit={create} />
    </>
  );
}
export const Dialog: Story = { render: () => <DialogDemo /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Settings role="owner" />
    </ArabicScope>
  ),
};
