import { Button, ConfirmProvider, useConfirm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Overlays/Confirm Provider", component: ConfirmProvider, parameters: { layout: "centered" } } satisfies Meta<typeof ConfirmProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

function Files() {
  const ar = useAr();
  const confirm = useConfirm();
  const [files, setFiles] = useState(["roadmap.pdf", "invoice-1042.pdf", "logo.svg"]);
  const [log, setLog] = useState<string | null>(null);

  async function remove(name: string) {
    const ok = await confirm({
      title: ar ? `حذف ${name}؟` : `Delete ${name}?`,
      description: ar ? "سيُحذف الملف نهائيًا من مساحة العمل." : "The file is removed from the workspace for good.",
      confirmLabel: ar ? "حذف" : "Delete",
    });
    setLog(ok ? (ar ? `حُذف ${name}` : `Deleted ${name}`) : ar ? "أُلغي" : "Cancelled");
    if (ok) setFiles((f) => f.filter((x) => x !== name));
  }

  async function publish() {
    const ok = await confirm({ title: ar ? "نشر التغييرات؟" : "Publish the changes?", description: ar ? "سيراها كل الزوار." : "Every visitor will see them.", confirmLabel: ar ? "نشر" : "Publish", danger: false });
    setLog(ok ? (ar ? "نُشر" : "Published") : ar ? "أُلغي" : "Cancelled");
  }

  return (
    <div className="flex w-80 flex-col gap-3">
      <ul className="overflow-hidden rounded-card border border-border">
        {files.map((f) => (
          <li key={f} className="flex items-center justify-between border-t border-border px-3 py-2 text-body-sm first:border-t-0">
            <span dir="ltr">{f}</span>
            <Button size="icon-sm" variant="ghost" aria-label={`${ar ? "حذف" : "Delete"}: ${f}`} onClick={() => remove(f)}>
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={publish}>
        {ar ? "نشر" : "Publish"}
      </Button>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {log ?? (ar ? "كل زر ينتظر الإجابة قبل أن ينفّذ." : "Each button awaits the answer before it acts.")}
      </p>
    </div>
  );
}

/** One provider, any number of `await confirm({...})` calls. A destructive confirm by default; `danger: false` for the rest. */
export const Playground: Story = {
  args: { children: null },
  render: () => (
    <ConfirmProvider>
      <Files />
    </ConfirmProvider>
  ),
};

export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
