import { UserActionsMenu, type UserActionsTarget } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { sleep, useAr } from "./_auth";

const meta = { title: "Components/Admin/User Actions Menu", component: UserActionsMenu, parameters: { layout: "padded" } } satisfies Meta<typeof UserActionsMenu>;
export default meta;
type Story = StoryObj;

const LINK = "https://app.example.com/auth/link?token=2f9c1e7a4b";

function Demo({ variant, emailed, failing }: { variant?: "menu" | "toolbar"; emailed?: boolean; failing?: boolean }) {
  const ar = useAr();
  const [user, setUser] = useState<UserActionsTarget>({
    name: ar ? "ليلى حسن" : "Layla Hassan",
    email: "layla@example.com",
    roles: ["editor"],
    permissions: ["posts:write"],
  });
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((cur) => [line, ...cur].slice(0, 5));
  const fail = { error: ar ? "الخادم غير متاح الآن." : "The server is not reachable right now." };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-card border border-border p-4">
        <div className="min-w-0">
          <p className="text-label text-foreground">{user.name}</p>
          <p className="text-caption text-muted-foreground" dir="ltr">
            {user.email} · {user.roles?.join(", ")}
          </p>
        </div>
        <UserActionsMenu
          user={user}
          variant={variant}
          roleSuggestions={["admin", "editor", "viewer", "billing"]}
          permissionSuggestions={["posts:read", "posts:write", "users:read", "billing:manage"]}
          onEdit={async (values) => {
            await sleep(700);
            if (failing) return fail;
            setUser({ ...user, ...values });
            note(`edit ${JSON.stringify(values)}`);
          }}
          onImpersonate={async () => {
            await sleep(600);
            if (failing) return fail;
            note("impersonate");
          }}
          onSetPassword={async () => {
            await sleep(700);
            if (failing) return fail;
            note("set password");
          }}
          onSendResetLink={async () => {
            await sleep(900);
            if (failing) return fail;
            note("reset link");
            return emailed ? { emailed: true } : { link: LINK.replace("link", "reset") };
          }}
          onSendMagicLink={async () => {
            await sleep(900);
            if (failing) return fail;
            note("magic link");
            return emailed ? { emailed: true, link: LINK } : { link: LINK };
          }}
          onDelete={async () => {
            await sleep(700);
            if (failing) return fail;
            note("delete");
          }}
        />
      </div>
      {log.length ? (
        <ul className="text-caption text-muted-foreground" dir="ltr">
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/** `variant="toolbar"`: the same actions as a row of buttons, for a user detail page. */
export const Toolbar: Story = { render: () => <Demo variant="toolbar" /> };

/** Links that were emailed: the result dialog says so, and still shows the link when the server returns one. */
export const Emailed: Story = { render: () => <Demo emailed /> };

/** Every handler returns `{ error }`: dialogs stay open and show it. */
export const Errors: Story = { render: () => <Demo failing /> };

/** Only some handlers: the menu offers just those actions. */
export const Partial: Story = {
  render: () => (
    <UserActionsMenu
      user={{ email: "sam@example.com" }}
      onSendResetLink={async () => {
        await sleep(800);
        return {};
      }}
      onDelete={() => sleep(600)}
    />
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };

export const ArabicToolbar: Story = { name: "Arabic toolbar", globals: { locale: "ar" }, render: () => <Demo variant="toolbar" /> };
