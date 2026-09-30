import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuActions,
  ContextMenuTrigger,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Overlays/Context Menu", component: ContextMenu } satisfies Meta<typeof ContextMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

const areaClass = "flex h-40 w-80 items-center justify-center rounded-card border border-dashed border-border text-body-sm text-muted-foreground";

function Demo() {
  const [pinned, setPinned] = useState(false);
  const [sort, setSort] = useState("updated");
  return (
    <div className="p-10">
      <ContextMenu>
        <ContextMenuTrigger className={areaClass}>Right-click here</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuLabel>Issue</ContextMenuLabel>
            <ContextMenuItem shortcut="E">
              <Pencil /> Edit
            </ContextMenuItem>
            <ContextMenuItem shortcut="⌘D">
              <Copy /> Duplicate
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
            Pin to top
          </ContextMenuCheckboxItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Sort by</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup value={sort} onValueChange={setSort}>
                <ContextMenuRadioItem value="updated">Last updated</ContextMenuRadioItem>
                <ContextMenuRadioItem value="priority">Priority</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger">
            <Trash2 /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Arabic: Story = {
  render: () => (
    <div className="p-10" lang="ar" dir="rtl">
      <ContextMenu>
        <ContextMenuTrigger className={areaClass}>انقر بزر الفأرة الأيمن هنا</ContextMenuTrigger>
        <ContextMenuContent dir="rtl" lang="ar">
          <ContextMenuItem shortcut="E">
            <Pencil /> تعديل
          </ContextMenuItem>
          <ContextMenuItem shortcut="⌘D">
            <Copy /> تكرار
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>ترتيب حسب</ContextMenuSubTrigger>
            <ContextMenuSubContent dir="rtl" lang="ar">
              <ContextMenuItem>آخر تحديث</ContextMenuItem>
              <ContextMenuItem>الأولوية</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger">
            <Trash2 /> حذف
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  ),
};

/** `ContextMenuActions` turns any element into a context-menu trigger from a plain action list. Right-click, or focus it and press Shift+F10. Inputs and links keep the browser menu. */
export const Actions: Story = {
  render: () => (
    <ContextMenuActions
      render={<div tabIndex={0} className="flex h-32 w-80 items-center justify-center rounded-card border border-dashed border-border text-body-sm text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" />}
      actions={[
        { id: "edit", label: "Edit", icon: Pencil, onSelect: () => {} },
        { id: "copy", label: "Copy", icon: Copy, onSelect: () => {} },
        { id: "delete", label: "Delete", icon: Trash2, danger: true, group: "danger", onSelect: () => {} },
      ]}
    >
      Right-click, or focus and press Shift+F10
    </ContextMenuActions>
  ),
};
