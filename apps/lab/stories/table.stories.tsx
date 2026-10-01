import { Avatar, Badge, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, type TableProps, TableRow } from "@nasaq/web";
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

function Issues(props: TableProps) {
  return (
    <Table {...props}>
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
  );
}

/** A frame, lines between columns, stripes and hover: each one is a prop, and they combine. */
export const Styles: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(
        [
          ["frame", { frame: true }],
          ["frame + striped", { frame: true, striped: true }],
          ["frame + bordered", { frame: true, bordered: true }],
          ["striped, no hover", { striped: true, hover: false }],
        ] as const
      ).map(([name, p]) => (
        <section key={name} className="flex flex-col gap-2">
          <p className="font-mono text-caption text-muted-foreground">{name}</p>
          <Issues {...p} />
        </section>
      ))}
    </div>
  ),
};

/** Cell padding: `compact` fits more rows, `default` reads easily, `comfortable` gives each row room. */
export const Density: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      {(["compact", "default", "comfortable"] as const).map((d) => (
        <section key={d} className="flex flex-col gap-2">
          <p className="font-mono text-caption text-muted-foreground">{d}</p>
          <Issues frame density={d} />
        </section>
      ))}
    </div>
  ),
};
