import { Button, type MessageBundle, TranslationsProvider, useT } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Utilities/Translations", component: TranslationsProvider, parameters: { layout: "padded" } } satisfies Meta<typeof TranslationsProvider>;
export default meta;
type Story = StoryObj;

const messages: MessageBundle = {
  en: {
    nav: { home: "Home", inbox: "Inbox", settings: "Settings" },
    greeting: "Welcome back, {name}.",
    inbox_zero: "No new messages",
    inbox_one: "{count} new message",
    inbox_other: "{count} new messages",
    switch: "Switch language",
    onlyEnglish: "This line has no Arabic yet, so it falls back to English.",
  },
  ar: {
    nav: { home: "الرئيسية", inbox: "الوارد", settings: "الإعدادات" },
    greeting: "مرحبًا بعودتك يا {name}.",
    inbox_zero: "لا رسائل جديدة",
    inbox_one: "رسالة جديدة واحدة",
    inbox_two: "رسالتان جديدتان",
    inbox_few: "{count} رسائل جديدة",
    inbox_many: "{count} رسالة جديدة",
    inbox_other: "{count} رسالة جديدة",
    switch: "تغيير اللغة",
  },
};

function Demo() {
  const { t, locale, setLocale } = useT();
  const [count, setCount] = useState(3);
  return (
    <div className="flex max-w-md flex-col gap-4 rounded-card border border-border p-4">
      <nav className="flex gap-4 text-label text-foreground">
        <span>{t("nav.home")}</span>
        <span>{t("nav:inbox")}</span>
        <span>{t("nav.settings")}</span>
      </nav>
      <p className="text-body text-foreground">{t("greeting", { name: locale.startsWith("ar") ? "ليلى" : "Layla" })}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setCount((n) => Math.max(0, n - 1))}>
          −
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setCount((n) => n + 1)}>
          +
        </Button>
        <span className="text-body-sm text-foreground" data-testid="plural">
          {t("inbox", { count })}
        </span>
      </div>
      <p className="text-caption text-muted-foreground">{t("onlyEnglish")}</p>
      <p className="text-caption text-muted-foreground">{t("missing.key", { defaultValue: "Default text for a missing key" })}</p>
      <Button size="sm" variant="primary" className="self-start" onClick={() => setLocale(locale.startsWith("ar") ? "en" : "ar")}>
        {t("switch")}
      </Button>
    </div>
  );
}

/**
 * `t()` with nested and namespaced keys, interpolation and plurals (try 0, 1, 2, 3 and 11 in Arabic). The language
 * button calls `setLocale`, which also flips Nasaq's direction. Persistence is off here (`storageKey={null}`).
 */
export const Default: Story = {
  render: () => (
    <TranslationsProvider messages={messages} storageKey={null}>
      <Demo />
    </TranslationsProvider>
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <TranslationsProvider messages={messages} storageKey={null}>
      <Demo />
    </TranslationsProvider>
  ),
};
