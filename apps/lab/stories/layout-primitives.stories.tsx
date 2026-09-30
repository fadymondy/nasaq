import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  Separator,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown } from "lucide-react";

const meta = { title: "Components/Layout/Layout Primitives" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The separator chevron mirrors in RTL. */
export const BreadcrumbStory: Story = {
  name: "Breadcrumb",
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">3x1</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Projects</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Nasaq</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

export const SeparatorStory: Story = {
  name: "Separator",
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="text-label text-foreground">Nasaq</div>
      <Separator />
      <div className="flex h-5 items-center gap-3 text-body-sm text-muted-foreground">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Source</span>
        <Separator orientation="vertical" />
        <span>Lab</span>
      </div>
    </div>
  ),
};

export const CollapsibleStory: Story = {
  name: "Collapsible",
  render: () => (
    <Collapsible className="flex max-w-sm flex-col gap-2">
      <CollapsibleTrigger render={<Button variant="secondary" className="group justify-between" />}>
        Advanced options
        <ChevronDown className="group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="rounded-card border border-border p-3 text-body-sm text-muted-foreground">
          Only opacity animates; height snaps so motion stays calm.
        </div>
      </CollapsiblePanel>
    </Collapsible>
  ),
};
