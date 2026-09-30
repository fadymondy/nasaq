import { Button, ProductMark, SidebarCustomize, useSidebarLayout } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ICONS } from "./_demo";

const meta = { title: "Components/Navigation/Sidebar Customize" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const MAIN = [
  { id: "dashboard", label: "Dashboard", icon: <ICONS.LayoutDashboard />, required: true },
  { id: "inbox", label: "Inbox", icon: <ICONS.Inbox /> },
  { id: "my-issues", label: "My issues", icon: <ICONS.ListTodo /> },
  { id: "time", label: "Time tracking", icon: <ICONS.Timer /> },
];
const APPS = [
  { id: "mahaam", label: "Mahaam" },
  { id: "zekra", label: "Zekra" },
  { id: "nasaq", label: "Nasaq" },
].map((a) => ({ ...a, icon: <ProductMark brand={a.id} size={16} title="" /> }));

/**
 * Order and visibility per section, saved to localStorage by `useSidebarLayout`. In the sidebar
 * itself items drag directly (`SidebarSortable`); this dialog is the keyboard and touch path:
 * focus a handle, Up/Down moves one place, Home/End to either end. Required items can't be hidden.
 */
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    const main = useSidebarLayout("nasaq-story-customize-main", MAIN.map((i) => i.id));
    const apps = useSidebarLayout("nasaq-story-customize-apps", APPS.map((i) => i.id));
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Customize sidebar
        </Button>
        <SidebarCustomize
          open={open}
          onOpenChange={setOpen}
          sections={[
            { id: "main", items: MAIN, layout: main },
            { id: "apps", label: "Apps", items: APPS, layout: apps },
          ]}
        />
      </>
    );
  },
};
