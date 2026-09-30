import { ContactForm, NasaqProvider, PublicForm, contactFormDefinition, newFormRule, useNasaq, type FormDefinition, type FormValues } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useMemo, useState } from "react";
import { wait } from "./_r2-demo";

const meta = { title: "Components/Forms/Public form", component: PublicForm } satisfies Meta<typeof PublicForm>;
export default meta;
type Story = StoryObj;

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

function Sent({ data }: { data: FormValues | null }) {
  if (!data) return null;
  return (
    <pre dir="ltr" className="max-w-xl overflow-auto rounded-md border bg-muted p-3 text-caption">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function Contact() {
  const [data, setData] = useState<FormValues | null>(null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <ContactForm
        onSubmit={async (d) => {
          await wait(500);
          setData(d);
        }}
      />
      <Sent data={data} />
    </div>
  );
}

/** Name, email, topic and message. Leave it empty and send to see the errors. */
export const Default: Story = { parameters: { layout: "padded" }, render: () => <Contact /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <Contact />
    </ArabicScope>
  ),
};

function Conditional() {
  const form = useMemo<FormDefinition>(() => {
    const f = contactFormDefinition();
    f.fields.push({ id: "order", kind: "text", label: "Order number", labelAr: "رقم الطلب", required: false });
    const rule = newFormRule("show");
    const action = rule.actions[0];
    if (action) action.config = { ...action.config, target: "order" };
    rule.conditions.children = [{ kind: "condition", id: "c1", field: "topic", op: "is", value: "support" }];
    f.rules.push(rule);
    return f;
  }, []);
  const [data, setData] = useState<FormValues | null>(null);
  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <PublicForm form={form} onSubmit={(d) => setData(d)} />
      <Sent data={data} />
    </div>
  );
}

/** Pick Support as the topic and an order number field appears. Hidden answers are not sent. */
export const ConditionalField: Story = { parameters: { layout: "padded" }, render: () => <Conditional /> };

function Spam() {
  const [calls, setCalls] = useState(0);
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">The hidden trap field is pre-filled, as a bot would. Fill the form and send: you get the thank-you, and the count below stays 0.</p>
      <PublicForm form={contactFormDefinition()} onSubmit={() => setCalls((c) => c + 1)} defaultValues={{ website_url: "http://spam.example" }} />
      <p role="status" className="text-body-sm">
        onSubmit calls: {calls}
      </p>
    </div>
  );
}

export const HoneypotCaught: Story = { parameters: { layout: "padded" }, render: () => <Spam /> };

function Closed() {
  return (
    <div className="w-full max-w-xl">
      <PublicForm form={{ ...contactFormDefinition(), enabled: false }} />
    </div>
  );
}

/** A form that is switched off shows a notice, not fields. */
export const ClosedForm: Story = { parameters: { layout: "padded" }, render: () => <Closed /> };
