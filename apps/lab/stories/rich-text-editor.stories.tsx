import { Field, FieldDescription, FieldLabel, RichTextEditor, type RichTextJson } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Editors/RichTextEditor", component: RichTextEditor } satisfies Meta<typeof RichTextEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

const en = `<h2>Release notes</h2><p>Nasaq <strong>1.4</strong> adds a <em>rich text</em> editor with <a href="https://nasaq-ui.fadymondy.com">links</a>.</p><ul><li>Bullets</li><li>Numbers</li></ul><blockquote>Quotes too.</blockquote>`;
const ar = `<h2>ملاحظات الإصدار</h2><p>يضيف <strong>نسق</strong> محرر نص <em>منسقًا</em> مع الروابط.</p><ul><li>نقاط</li><li>أرقام</li></ul><blockquote>واقتباسات.</blockquote>`;
const mixed = `<p>هذه فقرة عربية تبدأ من اليمين.</p><p>This English paragraph starts from the left.</p><p>ثم عربية مرة أخرى، مع <code>code</code> داخلها.</p><ol><li>واحد</li><li>Two</li></ol>`;

/** Controlled HTML with a Field label. Follows the lab locale toolbar. */
export const Playground: Story = {
  render: () => {
    const [html, setHtml] = useState(en);
    return (
      <Field className="max-w-2xl">
        <FieldLabel id="rte-body">Body</FieldLabel>
        <RichTextEditor aria-labelledby="rte-body" value={html} onValueChange={setHtml} />
        <FieldDescription>Every paragraph picks its own direction.</FieldDescription>
        <pre dir="ltr" className="max-h-40 overflow-auto rounded-control bg-secondary p-2 text-caption">{html}</pre>
      </Field>
    );
  },
};

export const Arabic: Story = {
  render: () => {
    const [html, setHtml] = useState(ar);
    return (
      <div lang="ar" dir="rtl" className="max-w-2xl">
        <Field>
          <FieldLabel id="rte-ar">المحتوى</FieldLabel>
          <RichTextEditor aria-labelledby="rte-ar" value={html} onValueChange={setHtml} placeholder="اكتب هنا…" />
        </Field>
      </div>
    );
  },
};

/** Arabic and English paragraphs in one document, each aligned by its own first strong character. */
export const MixedDirections: Story = {
  render: () => {
    const [html, setHtml] = useState(mixed);
    return <RichTextEditor className="max-w-2xl" aria-label="Mixed direction" value={html} onValueChange={setHtml} />;
  },
};

/** Tiptap JSON in and out. */
export const JsonFormat: Story = {
  render: () => {
    const [doc, setDoc] = useState<RichTextJson>({
      type: "doc",
      content: [{ type: "paragraph", attrs: { dir: "auto" }, content: [{ type: "text", text: "Stored as JSON." }] }],
    });
    return (
      <div className="flex max-w-2xl flex-col gap-2">
        <RichTextEditor format="json" aria-label="JSON editor" value={doc} onValueChange={setDoc} />
        <pre dir="ltr" className="max-h-40 overflow-auto rounded-control bg-secondary p-2 text-caption">{JSON.stringify(doc, null, 1)}</pre>
      </div>
    );
  },
};

export const ReadOnly: Story = {
  render: () => <RichTextEditor className="max-w-2xl" aria-label="Preview" readOnly defaultValue={mixed} />,
};

/** A trimmed toolbar and an empty document, showing the placeholder. */
export const MinimalToolbar: Story = {
  render: () => (
    <RichTextEditor className="max-w-2xl" aria-label="Comment" toolbar={["bold", "italic", "link"]} placeholder="Add a comment…" minHeight="6rem" />
  ),
};
