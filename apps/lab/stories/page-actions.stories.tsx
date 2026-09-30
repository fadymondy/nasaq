import { Button, CommandPalette, CommandProvider, type PageAction, PageActions, useCommandPaletteOpen, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Bell, Copy, Download, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Actions/Page Actions", component: PageActions } satisfies Meta<typeof PageActions>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ issue }: { issue?: boolean }) {
  const ar = useNasaq().locale.startsWith("ar");
  const [log, setLog] = useState<string[]>([]);
  const [, setOpen] = useCommandPaletteOpen();
  const say = (line: string) => () => setLog((l) => [line, ...l].slice(0, 5));

  const primary: PageAction = issue
    ? { id: "demo.issue.edit", label: ar ? "تعديل" : "Edit", icon: Pencil, shortcut: "E", onSelect: say("edit") }
    : { id: "demo.issue.new", label: ar ? "مهمة جديدة" : "New issue", icon: Plus, shortcut: "C", onSelect: say("new issue") };
  const actions: PageAction[] = issue
    ? [
        { id: "demo.issue.copy", label: ar ? "نسخ الرابط" : "Copy link", icon: Link2, shortcut: "Mod Shift C", onSelect: say("copy link") },
        { id: "demo.issue.duplicate", label: ar ? "تكرار" : "Duplicate", icon: Copy, onSelect: say("duplicate") },
        { id: "demo.issue.archive", label: ar ? "أرشفة" : "Archive", icon: Archive, group: "end", onSelect: say("archive") },
        { id: "demo.issue.delete", label: ar ? "حذف" : "Delete", icon: Trash2, group: "end", danger: true, keywords: ["remove", "إزالة"], onSelect: say("delete") },
      ]
    : [{ id: "demo.list.export", label: ar ? "تصدير CSV" : "Export CSV", icon: Download, onSelect: say("export") }];

  return (
    <div className="flex flex-col gap-4">
      <header className="flex h-12 items-center gap-2 border-b border-border px-3">
        <span className="text-label text-foreground">{issue ? "MH-721" : ar ? "المهام" : "Issues"}</span>
        <PageActions className="ms-auto" primary={primary} actions={actions}>
          <Button variant="ghost" size="icon-sm" aria-label={ar ? "الإشعارات" : "Notifications"} className="text-muted-foreground">
            <Bell />
          </Button>
        </PageActions>
      </header>
      <div className="flex items-center gap-3 px-3">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {ar ? "افتح لوحة الأوامر" : "Open the command palette"}
        </Button>
        <span className="text-caption text-muted-foreground">
          {ar ? "كل الإجراءات مسجّلة تحت «هذه الصفحة»، مع اختصاراتها." : "Every action is listed under “This page”, with its shortcut."}
        </span>
      </div>
      <ul className="min-h-24 space-y-0.5 px-3 font-mono text-caption text-muted-foreground" dir="ltr">
        {log.map((l, i) => (
          <li key={`${l}-${i}`}>{l}</li>
        ))}
      </ul>
      <CommandPalette />
    </div>
  );
}

/** One visible primary action, the rest behind ⋯. Press C, or open the palette: the actions are there too. */
export const Default: Story = {
  render: () => (
    <CommandProvider>
      <Demo />
    </CommandProvider>
  ),
};

/** A detail page: grouped menu with a destructive action. Delete only appears in the palette once you type. */
export const DetailPage: Story = {
  render: () => (
    <CommandProvider>
      <Demo issue />
    </CommandProvider>
  ),
};
