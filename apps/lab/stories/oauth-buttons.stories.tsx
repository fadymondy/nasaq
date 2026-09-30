import { OAuthButtons, OAuthDivider } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { sleep } from "./_auth";

const meta = { title: "Components/Auth/OAuth Buttons", component: OAuthButtons } satisfies Meta<typeof OAuthButtons>;
export default meta;
type Story = StoryObj;

const all = ["google", "github", "apple", "microsoft"] as const;

function StackDemo() {
  return (
    <div className="max-w-sm">
      <OAuthButtons providers={[...all]} onSelect={() => sleep(2000)} />
    </div>
  );
}

/** Click one: it loads for two seconds and the rest are disabled. Logos are the providers' official marks. */
export const Stack: Story = { render: () => <StackDemo /> };

export const Grid: Story = {
  render: () => (
    <div className="max-w-md">
      <OAuthButtons layout="grid" providers={[...all]} intent="signup" onSelect={() => sleep(2000)} />
    </div>
  ),
};

export const IconOnly: Story = {
  name: "Icon only",
  render: () => (
    <div className="max-w-sm">
      <OAuthButtons layout="icon-only" providers={[...all]} onSelect={() => sleep(2000)} />
    </div>
  ),
};

/** A custom provider brings its own label and icon. Its label is used as written. */
export const Custom: Story = {
  render: () => (
    <div className="max-w-sm">
      <OAuthButtons providers={["google", { id: "sso", label: "Continue with company SSO", icon: <Building2 aria-hidden="true" /> }]} onSelect={() => sleep(2000)} />
    </div>
  ),
};

function DividerDemo() {
  const [last, setLast] = useState("");
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <OAuthButtons providers={["google", "apple"]} onSelect={(id) => setLast(id)} />
      <OAuthDivider />
      <p className="text-caption text-muted-foreground">Last selected: {last || "none"}</p>
    </div>
  );
}

/** Under the buttons, the "or" divider leads into an email form. */
export const WithDivider: Story = { name: "With divider", render: () => <DividerDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StackDemo /> };
