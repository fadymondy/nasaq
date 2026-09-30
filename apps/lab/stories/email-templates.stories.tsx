import { EmailTemplateEditor, EmailTemplateGallery, EmailTemplatePreview, EmailTemplates } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { emailVariables, makeEmailTemplates } from "./_builders-demo";
import { wait } from "./_profile-demo";

const meta = { title: "Components/Editors/Email Templates", component: EmailTemplates, parameters: { layout: "padded" } } satisfies Meta<typeof EmailTemplates>;
export default meta;
type Story = StoryObj;

const sender = { name: "The Nasaq team", email: "hello@nasaq.example" };
const arSender = { name: "فريق نسق", email: "hello@nasaq.example" };

/** Gallery, editor and preview together: pick a card to edit. */
export const Default: Story = {
  render: () => (
    <EmailTemplates
      templates={makeEmailTemplates("en")}
      variables={emailVariables("en")}
      sender={sender}
      recipient="sara@example.com"
      onSave={async () => wait(500)}
      onDuplicate={async () => wait(300)}
      onDelete={async () => wait(300)}
      onSendTest={async () => wait(600)}
    />
  ),
};
export const Gallery: Story = {
  render: () => (
    <EmailTemplateGallery
      templates={makeEmailTemplates("en")}
      variables={emailVariables("en")}
      onOpen={() => undefined}
      onCreate={() => undefined}
      onDuplicate={async () => wait(300)}
      onDelete={async () => wait(300)}
    />
  ),
};
export const EmptyGallery: Story = { render: () => <EmailTemplateGallery templates={[]} onCreate={() => undefined} /> };
/** Edit on one side and preview on the other; below the lg breakpoint they are tabs. */
export const Editor: Story = {
  render: () => (
    <EmailTemplateEditor
      template={makeEmailTemplates("en")[0]!}
      variables={emailVariables("en")}
      sender={sender}
      recipient="sara@example.com"
      onSave={async () => wait(500)}
      onSendTest={async () => wait(600)}
      onBack={() => undefined}
    />
  ),
};
export const Preview: Story = {
  render: () => (
    <div className="max-w-3xl">
      <EmailTemplatePreview template={makeEmailTemplates("en")[0]!} variables={emailVariables("en")} sender={sender} recipient="sara@example.com" />
    </div>
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <EmailTemplates
      templates={makeEmailTemplates("ar")}
      variables={emailVariables("ar")}
      sender={arSender}
      recipient="sara@example.com"
      onSave={async () => wait(500)}
      onDuplicate={async () => wait(300)}
      onDelete={async () => wait(300)}
      onSendTest={async () => wait(600)}
    />
  ),
};
export const ArabicEditor: Story = {
  globals: { locale: "ar" },
  render: () => (
    <EmailTemplateEditor
      template={makeEmailTemplates("ar")[0]!}
      variables={emailVariables("ar")}
      sender={arSender}
      recipient="sara@example.com"
      onSave={async () => wait(500)}
      onSendTest={async () => wait(600)}
      onBack={() => undefined}
    />
  ),
};
