import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrendingUp } from "lucide-react";

const meta = { title: "Components/Layout/Card", component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>Name, visibility and default assignee.</CardDescription>
        <CardAction>
          <Badge variant="success">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="text-body-sm text-muted-foreground">
        Cards group one subject. Keep a single primary action in the footer.
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Save</Button>
      </CardFooter>
    </Card>
  ),
};

export const Metric: Story = {
  render: () => (
    <Card className="max-w-xs gap-2 py-3.5">
      <CardHeader>
        <CardDescription>Revenue</CardDescription>
        <CardTitle className="text-h2 leading-tight tabular-nums">$48,210</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendingUp />
            <span dir="ltr">+12.4%</span>
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="text-caption text-muted-foreground">Trending up this month</CardFooter>
    </Card>
  ),
};
