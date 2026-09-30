import { Avatar, Badge, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Data Display/Table", component: Table } satisfies Meta<typeof Table>;
export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  { key: "MH-728", title: "App shell v2", status: "In progress", variant: "info", who: "Fady Mondy", hours: "6.5" },
  { key: "MH-721", title: "Lab + feedback SDK", status: "In review", variant: "warning", who: "Fady Mondy", hours: "3.0" },
  { key: "MH-718", title: "Token pipeline", status: "Done", variant: "success", who: "Nour Adel", hours: "11.25" },
  { key: "MH-724", title: "Registry + docs site", status: "Blocked", variant: "danger", who: "Mona Hany", hours: "0" },
] as const;

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Numbers are tabular and end-aligned; keys stay LTR in Arabic.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead className="text-end">Hours</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-mono text-caption text-muted-foreground" dir="ltr">
              {r.key}
            </TableCell>
            <TableCell className="font-medium">{r.title}</TableCell>
            <TableCell>
              <Badge variant={r.variant}>{r.status}</Badge>
            </TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <Avatar name={r.who} size="xs" />
                {r.who}
              </span>
            </TableCell>
            <TableCell className="text-end tabular-nums">{r.hours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
