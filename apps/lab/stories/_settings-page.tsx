/*
 * The whole account settings screen, shared by Pages/Account/Profile and Pages/Account/Security:
 * AccountSettings with every section wired to the real components and fake async callbacks.
 * Profile: change the username to "admin" (taken), change the email with the password "secret".
 * Security: verify 2FA with 123456, confirm dangerous actions with the password correct-horse.
 * Danger zone: type the email to delete.
 */
import {
  AccountSettings,
  ChangePasswordForm,
  ConnectedAccounts,
  type ConnectedProvider,
  DangerZone,
  type Passkey,
  PasskeyList,
  ProfileForm,
  SettingsSection,
  TwoFactorSetup,
} from "@nasaq/web";
import { useState } from "react";
import { DEMO_CODE, DEMO_PASSWORD, OTPAUTH_URI, RECOVERY_CODES } from "./_account-demo";
import { NotificationsDemo } from "./_team-demo";
import { checkUsername, demoPhoto, sampleValues, useAr, wait } from "./_profile-demo";

const ago = (days: number) => Date.now() - days * 86_400_000;

export function SettingsPage({ section = "profile" }: { section?: string }) {
  const ar = useAr();
  const wrong = ar ? "كلمة المرور غير صحيحة." : "That password is not right.";
  const [values, setValues] = useState(sampleValues(ar));
  const [photo, setPhoto] = useState<string | undefined>(demoPhoto);
  const [deleted, setDeleted] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([
    { id: "1", name: "MacBook Pro", kind: "device", authenticator: "Touch ID", createdAt: ago(210), lastUsedAt: ago(0.1) },
    { id: "2", name: "iPhone", kind: "synced", authenticator: "iCloud Keychain", createdAt: ago(95), lastUsedAt: ago(6) },
  ]);
  const [accounts, setAccounts] = useState<ConnectedProvider[]>([
    { id: "google", connected: true, account: "sara@example.com" },
    { id: "github", connected: true, account: "sara-dev" },
    { id: "apple", connected: false },
    { id: "microsoft", connected: false },
  ]);
  const setLinked = (id: string, connected: boolean) =>
    setAccounts((l) => l.map((p) => (p.id === id ? { ...p, connected, account: connected ? `${id}-user@example.com` : undefined } : p)));

  if (deleted) return <p className="p-8 text-center text-body text-muted-foreground">{ar ? "تم حذف الحساب (تجريبي)." : "Account deleted (demo)."}</p>;

  return (
    <div className="p-4 sm:p-8">
      <AccountSettings defaultValue={section}>
        {(id) => {
          switch (id) {
            case "profile":
              return (
                <SettingsSection title={ar ? "الملف الشخصي" : "Profile"} description={ar ? "كيف يراك الآخرون." : "How other people see you."}>
                  <ProfileForm
                    values={values}
                    emailVerified
                    checkUsername={checkUsername}
                    onSubmit={async (next) => {
                      await wait(800);
                      setValues(next);
                    }}
                    onChangeEmail={async ({ password }) => {
                      await wait(700);
                      if (password !== "secret") return { fieldErrors: { password: wrong } };
                    }}
                    avatar={{
                      src: photo,
                      onChange: async (file) => {
                        await wait(700);
                        setPhoto(URL.createObjectURL(file));
                      },
                      onRemove: async () => {
                        await wait(400);
                        setPhoto(undefined);
                      },
                    }}
                  />
                </SettingsSection>
              );
            case "security":
              return (
                <div className="flex flex-col gap-6">
                  <SettingsSection
                    title={ar ? "كلمة المرور" : "Password"}
                    description={ar ? "اختر كلمة مرور قوية لا تستخدمها في مكان آخر." : "Choose a strong password you do not use anywhere else."}
                  >
                    <ChangePasswordForm
                      onSubmit={async (v) => {
                        await wait(800);
                        if (v.currentPassword !== DEMO_PASSWORD) return { fieldErrors: { currentPassword: wrong } };
                      }}
                    />
                  </SettingsSection>
                  <TwoFactorSetup
                    className="max-w-none"
                    otpauthUri={OTPAUTH_URI}
                    enabled={twoFactor}
                    recoveryCodesRemaining={RECOVERY_CODES.length}
                    onVerify={async (code) => {
                      await wait();
                      return code === DEMO_CODE ? { recoveryCodes: RECOVERY_CODES } : { error: ar ? "الرمز غير مطابق. جرّب 123456." : "That code did not match. Try 123456." };
                    }}
                    onComplete={() => setTwoFactor(true)}
                    onRegenerateRecoveryCodes={async (password) => {
                      await wait();
                      return password === DEMO_PASSWORD ? [...RECOVERY_CODES].reverse() : { error: wrong };
                    }}
                    onDisable={async (password) => {
                      await wait();
                      if (password !== DEMO_PASSWORD) return { error: wrong };
                      setTwoFactor(false);
                    }}
                  />
                  <PasskeyList
                    className="max-w-none"
                    passkeys={passkeys}
                    onAdd={async () => {
                      await wait(900);
                      setPasskeys((l) => [...l, { id: String(Date.now()), name: ar ? "مفتاح جديد" : "New passkey", kind: "device", createdAt: Date.now(), lastUsedAt: null }]);
                    }}
                    onRename={async (pid, name) => {
                      await wait(400);
                      setPasskeys((l) => l.map((p) => (p.id === pid ? { ...p, name } : p)));
                    }}
                    onRemove={async (pid) => {
                      await wait(600);
                      setPasskeys((l) => l.filter((p) => p.id !== pid));
                    }}
                  />
                </div>
              );
            case "connected":
              return (
                <ConnectedAccounts
                  className="max-w-none"
                  providers={accounts}
                  // The password and each passkey are also ways to sign in.
                  otherSignInMethods={1 + passkeys.length}
                  onConnect={async (pid) => {
                    await wait(800);
                    setLinked(pid, true);
                  }}
                  onDisconnect={async (pid) => {
                    await wait(600);
                    setLinked(pid, false);
                  }}
                />
              );
            case "danger":
              return (
                <DangerZone
                  confirmText="sara@example.com"
                  onDelete={async () => {
                    await wait(900);
                    setDeleted(true);
                  }}
                />
              );
            default:
              return <NotificationsDemo ar={ar} />;
          }
        }}
      </AccountSettings>
    </div>
  );
}
