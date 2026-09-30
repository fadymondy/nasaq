import { RegisterForm } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Register Form", component: RegisterForm } satisfies Meta<typeof RegisterForm>;
export default meta;
type Story = StoryObj;

const link = "underline underline-offset-2";

function Demo() {
  const ar = useAr();
  return (
    <div className="max-w-sm">
      <RegisterForm
        oauthProviders={["google", "github"]}
        onOAuth={() => sleep(1500)}
        terms={
          ar ? (
            <>
              أوافق على <a href="#terms" className={link}>شروط الخدمة</a> و<a href="#privacy" className={link}>سياسة الخصوصية</a>
            </>
          ) : (
            <>
              I agree to the <a href="#terms" className={link}>terms of service</a> and <a href="#privacy" className={link}>privacy policy</a>
            </>
          )
        }
        onSubmit={async (v) => {
          await sleep(900);
          if (v.email === "taken@example.com") return { fieldErrors: { email: ar ? "هذا البريد مستخدم بالفعل." : "This email is already registered." } };
        }}
      />
    </div>
  );
}

/** Type a password to move the strength meter. Submit empty to see every check and the focus move to the first problem. `taken@example.com` returns a server field error. */
export const Default: Story = { render: () => <Demo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
