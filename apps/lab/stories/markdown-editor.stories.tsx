import { MarkdownEditor } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Editors/Markdown Editor", component: MarkdownEditor, parameters: { layout: "padded" } } satisfies Meta<typeof MarkdownEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

const EN = `## Release notes

The **billing page** now shows _every_ invoice, with a filter by status.

- [x] Paid and due badges
- [ ] Export to CSV

> Plans renew on the first of the month.

Run \`togo migrate\` after you pull.`;

const AR = `## ملاحظات الإصدار

صفحة **الفوترة** تعرض الآن _كل_ الفواتير مع تصفية حسب الحالة.

- [x] شارات المدفوع والمستحق
- [ ] التصدير إلى CSV

> تتجدد الباقات في أول كل شهر.`;

function Demo({ view }: { view?: "write" | "preview" | "split" }) {
  const ar = useAr();
  const [value, setValue] = useState(ar ? AR : EN);
  return (
    <div className="flex max-w-4xl flex-col gap-2">
      <MarkdownEditor value={value} onValueChange={setValue} defaultView={view} aria-label={ar ? "ملاحظات الإصدار" : "Release notes"} />
      <p className="text-caption text-muted-foreground">
        {value.length} {ar ? "حرفًا" : "characters"}
      </p>
    </div>
  );
}

/** Select text and use the toolbar or Ctrl/⌘+B, I, K. Switch between Write, Preview and Split. */
export const Playground: Story = { render: () => <Demo /> };
export const Split: Story = { render: () => <Demo view="split" /> };
export const Empty: Story = { args: { defaultView: "split" } };
export const Disabled: Story = { args: { defaultValue: EN, disabled: true } };
export const Arabic: Story = { render: () => <Demo view="split" />, globals: { locale: "ar" } };
