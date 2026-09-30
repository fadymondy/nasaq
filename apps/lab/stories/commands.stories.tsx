import {
  Button,
  type Command,
  CommandPalette,
  CommandProvider,
  type CommandSource,
  useCommandPaletteOpen,
  useNasaq,
  useRegisterCommands,
  useRegisterCommandSource,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderKanban, Inbox, Plus, Timer } from "lucide-react";
import { useMemo, useState } from "react";

const meta = { title: "Components/Utilities/Commands", component: CommandProvider, args: { children: null } } satisfies Meta<typeof CommandProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

const ISSUES = [
  { id: "MH-142", en: "Fix login redirect", ar: "إصلاح إعادة التوجيه بعد الدخول" },
  { id: "MH-143", en: "Connect the payment gateway", ar: "ربط بوابة الدفع" },
  { id: "MH-150", en: "Translate error messages", ar: "ترجمة رسائل الخطأ" },
  { id: "MH-151", en: "Accessibility review", ar: "مراجعة إمكانية الوصول" },
];

function Demo({ withSource }: { withSource: boolean }) {
  const ar = useNasaq().locale.startsWith("ar");
  const [log, setLog] = useState<string[]>([]);
  const [, setOpen] = useCommandPaletteOpen();
  const perform = (line: string) => () => setLog((l) => [line, ...l].slice(0, 6));

  const commands = useMemo<Command[]>(
    () => [
      { id: "demo.issue.new", label: ar ? "مهمة جديدة" : "New issue", section: "create", icon: Plus, shortcut: "C", keywords: ["create", "task", "إنشاء"], perform: perform("demo.issue.new") },
      { id: "demo.timer.start", label: ar ? "بدء المؤقت" : "Start timer", section: "create", icon: Timer, shortcut: "Shift T", perform: perform("demo.timer.start") },
      { id: "demo.go.inbox", label: ar ? "الانتقال إلى الوارد" : "Go to inbox", section: "navigation", icon: Inbox, shortcut: "G I", hint: ar ? "الوارد" : "Inbox", perform: perform("demo.go.inbox") },
      { id: "demo.go.projects", label: ar ? "الانتقال إلى المشاريع" : "Go to projects", section: "navigation", icon: FolderKanban, shortcut: "G P", perform: perform("demo.go.projects") },
      {
        id: "demo.status",
        label: ar ? "تغيير الحالة" : "Change status",
        section: "context",
        children: ["Todo", "In progress", "In review", "Done"].map((s) => ({ id: `demo.status.${s}`, label: s, perform: perform(`demo.status.${s}`) })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ar],
  );
  useRegisterCommands(commands);

  const source = useMemo<CommandSource | null>(
    () =>
      withSource
        ? {
            id: "demo.issues",
            minQuery: 2,
            search: async (q, signal) => {
              await new Promise((r) => setTimeout(r, 400));
              if (signal.aborted) return [];
              const n = q.toLowerCase();
              return ISSUES.filter((i) => i.id.toLowerCase().includes(n) || i.en.toLowerCase().includes(n) || i.ar.includes(q)).map(
                (i): Command => ({
                  id: `demo.open.${i.id}`,
                  label: `${i.id} ${ar ? i.ar : i.en}`,
                  section: "search",
                  hint: ar ? "مهمة" : "Issue",
                  perform: perform(`demo.open.${i.id}`),
                }),
              );
            },
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [withSource, ar],
  );
  useRegisterCommandSource(source);

  return (
    <div className="w-96 space-y-4">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "اضغط C لمهمة جديدة، أو G ثم I للوارد، أو Ctrl/⌘ K لفتح اللوحة."
          : "Press C for a new issue, G then I for the inbox, or Ctrl/⌘ K to open the palette."}
        {withSource ? (ar ? " اكتب «MH» أو «دفع» للبحث في المهام." : " Type “MH” or “payment” to search issues.") : ""}
      </p>
      <Button onClick={() => setOpen(true)}>{ar ? "فتح لوحة الأوامر" : "Open command palette"}</Button>
      <div className="rounded-md border border-border p-3">
        <div className="mb-1 text-caption font-medium text-muted-foreground">{ar ? "الأوامر المنفّذة" : "Performed commands"}</div>
        {log.length === 0 ? (
          <p className="text-caption text-muted-foreground">{ar ? "لا شيء بعد" : "Nothing yet"}</p>
        ) : (
          <ul className="space-y-0.5 font-mono text-caption" dir="ltr">
            {log.map((l, i) => (
              <li key={`${l}-${i}`}>{l}</li>
            ))}
          </ul>
        )}
      </div>
      <CommandPalette />
    </div>
  );
}

/** Components register commands while mounted; `CommandProvider` binds shortcuts and feeds the one palette. */
export const Default: Story = {
  render: () => (
    <CommandProvider>
      <Demo withSource={false} />
    </CommandProvider>
  ),
};

/** An async source runs as the user types (debounced, abortable) and lands in the "Results" section. */
export const AsyncSource: Story = {
  render: () => (
    <CommandProvider>
      <Demo withSource />
    </CommandProvider>
  ),
};
