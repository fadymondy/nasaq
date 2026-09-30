import {
  Field,
  FieldDescription,
  FieldLabel,
  type Mention,
  type MentionOption,
  MentionTextarea,
  NasaqProvider,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Collaboration/Mention textarea", component: MentionTextarea } satisfies Meta<typeof MentionTextarea>;
export default meta;
type Story = StoryObj;

/** Forces Arabic (RTL) regardless of the toolbar locale, so both directions are one click apart. */
function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

const EN_PEOPLE: MentionOption[] = [
  { id: "u1", name: "Sara Ali", description: "Design lead" },
  { id: "u2", name: "Omar Nasser", description: "Frontend engineer" },
  { id: "u3", name: "Lina Haddad", description: "QA" },
  { id: "u4", name: "Khaled Mansour", description: "Product manager" },
];
const AR_PEOPLE: MentionOption[] = [
  { id: "u1", name: "سارة علي", description: "قائدة التصميم" },
  { id: "u2", name: "عمر ناصر", description: "مهندس واجهات" },
  { id: "u3", name: "لينا حداد", description: "ضمان الجودة" },
  { id: "u4", name: "خالد منصور", description: "مدير المنتج" },
];

function Demo({ ar, trigger }: { ar: boolean; trigger?: string }) {
  const [mentions, setMentions] = useState<Mention[]>([]);
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <Field>
        <FieldLabel>{ar ? "تعليق" : "Comment"}</FieldLabel>
        <MentionTextarea
          rows={4}
          trigger={trigger}
          suggestions={ar ? AR_PEOPLE : EN_PEOPLE}
          placeholder={ar ? `اكتب ${trigger ?? "@"} لذكر أحد` : `Type ${trigger ?? "@"} to mention someone`}
          onValueChange={(_, m) => setMentions(m)}
        />
        <FieldDescription>{ar ? "الأسهم للتنقل، إدخال أو Tab للاختيار، Escape للإغلاق." : "Arrows to move, Enter or Tab to pick, Escape to close."}</FieldDescription>
      </Field>
      <code dir="ltr" className="whitespace-pre-wrap text-caption text-muted-foreground">
        {mentions.length ? JSON.stringify(mentions) : "mentions: []"}
      </code>
    </div>
  );
}

/** Type @ then a few letters. Works inside Field. Follows the toolbar locale. */
export const Default: Story = {
  render: () => <Demo ar={useNasaq().locale.startsWith("ar")} />,
};

/** English (LTR) and Arabic (RTL): the list opens at the caret and Arabic search folds alef, yeh and diacritics. */
export const EnglishAndArabic: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-8">
      <Demo ar={false} />
      <ArabicScope>
        <Demo ar />
      </ArabicScope>
    </div>
  ),
};

/** Any character can be the trigger, for example # for tags or channels. */
export const CustomTrigger: Story = {
  render: () => <Demo ar={useNasaq().locale.startsWith("ar")} trigger="#" />,
};
