import { Button, type Command, CommandPalette, CommandProvider, SearchTrigger, toast, useNasaq, useRegisterCommands, useRegisterCommandSource } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useDemoCommands, useDemoIssueSource } from "./_demo";

const meta = { title: "Components/Overlays/Command Palette", component: CommandPalette } satisfies Meta<typeof CommandPalette>;
export default meta;
type Story = StoryObj<typeof meta>;

const notify = (m: string) => {
  toast(m);
};

/** Stands in for a product: it registers its commands and a search source, and knows nothing of the palette. */
function Product() {
  const { setTheme, resolvedTheme, setLocale, locale } = useNasaq();
  useRegisterCommands(useDemoCommands({ setTheme, resolvedTheme, setLocale, locale, toast: notify }));
  useRegisterCommandSource(useDemoIssueSource(notify));
  return null;
}

/** A page mounting its own contextual commands; they disappear when it unmounts. */
function DocumentPage() {
  const ar = useNasaq().locale.startsWith("ar");
  const commands = useMemo<Command[]>(
    () => [
      { id: "doc.export", section: "context", label: ar ? "تصدير المستند PDF" : "Export document as PDF", icon: FileText, perform: () => notify("PDF") },
      { id: "doc.share", section: "context", label: ar ? "نسخ رابط المشاركة" : "Copy share link", icon: FileText, shortcut: "Shift L", perform: () => notify("Link copied") },
    ],
    [ar],
  );
  useRegisterCommands(commands);
  return <p className="text-caption text-muted-foreground">{ar ? "صفحة المستند مفتوحة: أوامرها أعلى القائمة." : "Document page mounted: its commands lead the list."}</p>;
}

function Demo({ startOpen }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen ?? false);
  const [page, setPage] = useState(true);
  return (
    <CommandProvider>
      <Product />
      {page ? <DocumentPage /> : null}
      <div className="flex max-w-xs flex-col gap-3">
        <p className="text-body-sm text-muted-foreground">Press ⌘K / Ctrl+K, C, or G then D. Or:</p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open palette
        </Button>
        <Button variant="ghost" onClick={() => setPage(!page)}>
          {page ? "Unmount" : "Mount"} document page
        </Button>
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandProvider>
  );
}

/**
 * Commands come from a registry: components call `useRegisterCommands` while mounted, and async
 * sources (`useRegisterCommandSource`) add results as you type. Try "dark", "مظهر", "MH-72", or
 * open "Change theme…" and press Backspace to go back.
 */
export const Default: Story = { render: () => <Demo /> };

export const Open: Story = { render: () => <Demo startOpen /> };

/** Outside an AppShell the trigger still works as a plain button. */
export const Trigger: Story = {
  render: () => (
    <div className="flex w-60 items-center gap-2">
      <SearchTrigger onClick={() => toast("Open search")} />
      <SearchTrigger variant="icon" onClick={() => toast("Open search")} />
    </div>
  ),
};
