import { ShareButton, type SharePerson } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { wait } from "./_profile-demo";

const meta = { title: "Components/Actions/Share Button", component: ShareButton, parameters: { layout: "padded" } } satisfies Meta<typeof ShareButton>;
export default meta;
type Story = StoryObj;

const URL = "https://app.example.com/projects/q3-plan";

function Demo({ ar }: { ar?: boolean }) {
  const [people, setPeople] = useState<SharePerson[]>(
    ar
      ? [
          { id: "1", name: "ليلى حداد", email: "layla@example.com", role: "editor", owner: true },
          { id: "2", name: "عمر ناصر", email: "omar@example.com", role: "editor" },
          { id: "3", name: "نورة السعود", email: "nora@example.com", role: "viewer" },
        ]
      : [
          { id: "1", name: "Layla Haddad", email: "layla@example.com", role: "editor", owner: true },
          { id: "2", name: "Omar Nasser", email: "omar@example.com", role: "editor" },
          { id: "3", name: "Nora Al-Saud", email: "nora@example.com", role: "viewer" },
        ],
  );
  return (
    <ShareButton
      url={URL}
      title={ar ? "خطة الربع الثالث" : "Q3 plan"}
      text={ar ? "ألقِ نظرة على الخطة" : "Have a look at the plan"}
      people={people}
      onInvite={async (emails, role) => {
        await wait(700);
        if (emails.some((e) => e.startsWith("fail"))) throw new Error(ar ? "تعذّر إرسال الدعوة." : "The invitation could not be sent.");
        setPeople((prev) => [...prev, ...emails.map((email, i) => ({ id: `n${prev.length + i}`, name: email.split("@")[0] ?? email, email, role }))]);
      }}
      onRoleChange={(person, role) => setPeople((prev) => prev.map((p) => (p.id === person.id ? { ...p, role } : p)))}
      onRemove={(person) => setPeople((prev) => prev.filter((p) => p.id !== person.id))}
    />
  );
}

/** Invite by email with a role (try an address starting with "fail" to see the error), change roles, set link access and expiry. */
export const Default: Story = { render: () => <Demo /> };

/** Link sharing only: no invite or people list. */
export const LinkOnly: Story = { render: () => <ShareButton url={URL} title="Q3 plan" defaultAccess="anyone" defaultExpiry="7d" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo ar /> };
