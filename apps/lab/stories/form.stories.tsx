import { Button, Form, FormField, Input, NativeSelect, Textarea, useForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Forms/Form", component: Form, parameters: { layout: "padded" } } satisfies Meta<typeof Form>;
export default meta;
type Story = StoryObj<typeof meta>;

function Contact() {
  const ar = useAr();
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { name: "", email: "", topic: "", message: "" },
    validate: (v) => ({
      ...(v.name.trim() ? {} : { name: ar ? "اكتب اسمك." : "Enter your name." }),
      ...(/^\S+@\S+\.\S+$/.test(v.email) ? {} : { email: ar ? "اكتب بريدًا صحيحًا." : "Enter a valid email." }),
      ...(v.message.trim().length >= 10 ? {} : { message: ar ? "اكتب ١٠ أحرف على الأقل." : "Write at least 10 characters." }),
    }),
    onSubmit: async (v) => {
      await wait();
      // The "server" refuses one domain, to show a field error coming back.
      if (v.email.endsWith("@example.com")) return { fieldErrors: { email: ar ? "هذا النطاق غير مقبول." : "This domain is not accepted." } };
      setSent(v.name);
    },
  });

  return (
    <Form {...form.formProps} className="max-w-md">
      <FormField name="name" label={ar ? "الاسم" : "Name"}>
        <Input {...form.register("name")} autoComplete="name" />
      </FormField>
      <FormField name="email" label={ar ? "البريد الإلكتروني" : "Email"} description={ar ? "جرّب عنوانًا من example.com لترى خطأ الخادم." : "Try an @example.com address to see a server error."}>
        <Input {...form.register("email")} type="email" dir="ltr" autoComplete="email" />
      </FormField>
      <FormField name="topic" label={ar ? "الموضوع" : "Topic"}>
        <NativeSelect
          {...form.register("topic")}
          placeholder={ar ? "اختر موضوعًا" : "Choose a topic"}
          options={[
            { value: "sales", label: ar ? "المبيعات" : "Sales" },
            { value: "support", label: ar ? "الدعم" : "Support" },
          ]}
        />
      </FormField>
      <FormField name="message" label={ar ? "الرسالة" : "Message"}>
        <Textarea {...form.register("message")} rows={4} />
      </FormField>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={form.submitting}>
          {ar ? "إرسال" : "Send"}
        </Button>
        <Button type="button" variant="ghost" disabled={!form.dirty || form.submitting} onClick={() => form.reset()}>
          {ar ? "مسح" : "Clear"}
        </Button>
        {sent ? <span className="text-body-sm text-muted-foreground">{ar ? `شكرًا، ${sent}.` : `Thanks, ${sent}.`}</span> : null}
      </div>
    </Form>
  );
}

/** Validate on submit, map server errors back to fields, show a pending button. Edit a field to clear its error. */
export const Playground: Story = { render: () => <Contact /> };

/** `errors` and `formError` from anywhere, without `useForm`. */
export const ServerErrors: Story = {
  render: () => {
    const ar = useAr();
    return (
      <Form className="max-w-md" errors={{ slug: ar ? "هذا الرابط مستخدم." : "This address is taken." }} formError={ar ? "لم يُحفظ المشروع." : "The project was not saved."}>
        <FormField name="slug" label={ar ? "رابط المشروع" : "Project address"}>
          <Input name="slug" defaultValue="billing" dir="ltr" />
        </FormField>
        <Button type="submit" variant="primary" className="self-start">
          {ar ? "حفظ" : "Save"}
        </Button>
      </Form>
    );
  },
};

export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
