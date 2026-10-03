import { Button, DataState, ServiceUnavailable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ToggleGroup, Toggle } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Loading & States/Data State", component: DataState, parameters: { layout: "padded" } } satisfies Meta<typeof DataState>;
export default meta;
type Story = StoryObj<typeof meta>;

type Mode = "loading" | "unauthorized" | "unavailable" | "error" | "empty" | "content";
const MODES: Mode[] = ["loading", "unauthorized", "unavailable", "error", "empty", "content"];

function Demo({ initial = "content" as Mode }) {
  const ar = useAr();
  const [mode, setMode] = useState<Mode>(initial);
  const rows = ar
    ? [["فاتورة ‎#1042", "مدفوعة"], ["فاتورة ‎#1043", "مستحقة"]]
    : [["Invoice #1042", "Paid"], ["Invoice #1043", "Due"]];
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <ToggleGroup value={[mode]} onValueChange={(v) => v[0] && setMode(v[0] as Mode)} className="flex-wrap">
        {MODES.map((m) => (
          <Toggle key={m} value={m}>
            {m}
          </Toggle>
        ))}
      </ToggleGroup>
      <DataState
        loading={mode === "loading"}
        unauthorized={mode === "unauthorized"}
        unavailable={mode === "unavailable"}
        error={mode === "error" ? (ar ? "الخادم أعاد الخطأ 500." : "The server returned 500.") : null}
        empty={mode === "empty"}
        signInHref="#"
        onRetry={() => setMode("content")}
        emptyAction={
          <Button size="sm" variant="primary">
            <Plus aria-hidden /> {ar ? "فاتورة جديدة" : "New invoice"}
          </Button>
        }
        labels={ar ? { emptyTitle: "لا توجد فواتير بعد", emptyBody: "أنشئ أول فاتورة لترسلها إلى عميل." } : { emptyTitle: "No invoices yet", emptyBody: "Create your first invoice to send to a client." }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{ar ? "الفاتورة" : "Invoice"}</TableHead>
              <TableHead>{ar ? "الحالة" : "Status"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([a, b]) => (
              <TableRow key={a}>
                <TableCell>{a}</TableCell>
                <TableCell>{b}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataState>
    </div>
  );
}

/** Switch between the six states. The order is fixed: loading, 401, 503, error, empty, then the content. */
export const Playground: Story = { args: {}, render: () => <Demo /> };

export const Unauthorized: Story = { args: { unauthorized: true, signInHref: "#" } };
export const Failed: Story = { args: { error: "The server returned 500.", onRetry: () => undefined } };
export const Empty: Story = { args: { empty: true } };

/** The 503 card on its own, for a widget whose plugin is down. */
export const Unavailable: Story = { args: {}, render: () => <ServiceUnavailable onRetry={() => undefined} /> };

export const Arabic: Story = { globals: { locale: "ar" }, args: {}, render: () => <Demo initial="empty" /> };
