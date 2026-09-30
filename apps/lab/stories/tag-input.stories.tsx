import { Field, FieldDescription, FieldError, FieldLabel, NasaqProvider, TagInput, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Forms/Tag input", component: TagInput } satisfies Meta<typeof TagInput>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Enter or comma adds. Backspace on an empty input removes the last tag. Paste "a, b, c" or lines to add several. */
export const Default: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Field>
          <FieldLabel>{ar ? "الوسوم" : "Labels"}</FieldLabel>
          <TagInput defaultValue={ar ? ["واجهة", "عاجل"] : ["design", "urgent"]} />
          <FieldDescription>{ar ? "افصل بفاصلة أو اضغط Enter." : "Separate with a comma or press Enter."}</FieldDescription>
        </Field>
      </div>
    );
  },
};

/** `maxTags` and `validate`: emails only, at most three. */
export const Validation: Story = {
  render: () => {
    const ar = useAr();
    const [emails, setEmails] = useState<string[]>(["fady@example.com"]);
    return (
      <div className="w-[28rem] max-w-full">
        <Field>
          <FieldLabel>{ar ? "دعوة بالبريد" : "Invite by email"}</FieldLabel>
          <TagInput
            value={emails}
            onValueChange={setEmails}
            maxTags={3}
            placeholder="name@company.com"
            inputProps={{ dir: "ltr" }}
            validate={(tag) => /^\S+@\S+\.\S+$/.test(tag) || (ar ? `${tag} ليس بريدًا صالحًا.` : `${tag} is not a valid email.`)}
          />
          <FieldDescription>{ar ? "حتى ثلاثة عناوين." : "Up to three addresses."}</FieldDescription>
        </Field>
      </div>
    );
  },
};

/** Suggestions are filtered with `normalizeForSearch`: "اداره" finds "إدارة". Arrow keys and Enter pick. */
export const Suggestions: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Field>
          <FieldLabel>{ar ? "المهارات" : "Skills"}</FieldLabel>
          <TagInput
            suggestions={ar ? ["إدارة المشاريع", "تصميم", "برمجة", "تسويق", "محاسبة"] : ["Project management", "Design", "Engineering", "Marketing", "Accounting"]}
          />
        </Field>
      </div>
    );
  },
};

/** Inside a Field with `invalid`, the box turns danger and the FieldError is announced. */
export const InField: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Field invalid>
          <FieldLabel>{ar ? "الوسوم" : "Labels"}</FieldLabel>
          <TagInput />
          <FieldError match>{ar ? "أضف وسمًا واحدًا على الأقل." : "Add at least one label."}</FieldError>
        </Field>
      </div>
    );
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[28rem] max-w-full">
      <TagInput disabled defaultValue={["read", "only"]} />
    </div>
  ),
};

export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="w-[28rem] max-w-full">
        <Field>
          <FieldLabel>الوسوم</FieldLabel>
          <TagInput
            defaultValue={["تصميم", "Nasaq"]}
            maxTags={5}
            suggestions={["إدارة", "برمجة", "تسويق"]}
          />
          <FieldDescription>افصل بفاصلة عربية (،) أو إنجليزية أو اضغط Enter.</FieldDescription>
        </Field>
      </div>
    </ArabicScope>
  ),
};
