import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Overlays/Dropdown Menu", component: DropdownMenu } satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState("updated");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        Actions <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Issue</DropdownMenuLabel>
          <DropdownMenuItem shortcut="E">
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem shortcut="⌘D">
            <Copy /> Duplicate
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={archived} onCheckedChange={setArchived}>
          Show archived
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Sort by</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenuRadioItem value="updated">Last updated</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="priority">Priority</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger">
          <Trash2 /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const Default: Story = { render: () => <Demo /> };

/** A label used directly in the content, with no Group around it. */
export const LabelWithoutGroup: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>Account</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Signed in as fady@example.com</DropdownMenuLabel>
        <DropdownMenuItem>Profile</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
