import { ResetPasswordForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { sleep } from "./_auth";

const meta = { title: "Components/Auth/Reset Password Form", component: ResetPasswordForm } satisfies Meta<typeof ResetPasswordForm>;
export default meta;
type Story = StoryObj;

function Demo() {
  return (
    <div className="max-w-sm">
      <ResetPasswordForm signIn="#login" onSubmit={() => sleep(900)} />
    </div>
  );
}

/** With `rules` the field shows the policy checklist, the meter follows it, and submit is blocked until every rule is met. */
function WithRules() {
  return (
    <div className="max-w-sm">
      <ResetPasswordForm rules={{ minLength: 10 }} signIn="#login" onSubmit={() => sleep(900)} />
    </div>
  );
}

function Expired() {
  return (
    <div className="max-w-sm">
      <ResetPasswordForm
        requestLink="#forgot-password"
        onSubmit={async () => {
          await sleep(700);
          return { expired: true };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Requirements: Story = { render: () => <WithRules /> };

/** `onSubmit` returns `{ expired: true }`: the form swaps to the expired screen. Submit a valid password to see it. */
export const ExpiredLink: Story = { name: "Expired link", render: () => <Expired /> };

/** `defaultState="success"`: the screen after a password is changed. */
export const Success: Story = {
  render: () => (
    <div className="max-w-sm">
      <ResetPasswordForm defaultState="success" signIn="#login" onSubmit={() => {}} />
    </div>
  ),
};

/** `defaultState="expired"`: the token was checked on load and is no longer valid. */
export const ExpiredOnLoad: Story = {
  name: "Expired on load",
  render: () => (
    <div className="max-w-sm">
      <ResetPasswordForm defaultState="expired" requestLink="#forgot-password" onSubmit={() => {}} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <WithRules /> };

export const ArabicSuccess: Story = {
  name: "Arabic success",
  globals: { locale: "ar" },
  render: () => (
    <div className="max-w-sm">
      <ResetPasswordForm defaultState="success" signIn="#login" onSubmit={() => {}} />
    </div>
  ),
};
