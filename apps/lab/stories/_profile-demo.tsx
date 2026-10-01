/* Fake async data shared by the account-profile stories. Nothing here talks to a server. */
import { NasaqProvider, type ProfileValues, useNasaq } from "@nasaq/web";
import type { ReactNode } from "react";

export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useAr = () => useNasaq().locale.startsWith("ar");

/** Renders its children right-to-left in Arabic, whatever the toolbar says. */
export function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Usernames the fake server treats as taken. */
export const TAKEN = ["admin", "fady", "nasaq", "support"];

export const checkUsername = async (username: string) => {
  await wait(500);
  return !TAKEN.includes(username);
};

export const sampleValues = (ar: boolean): ProfileValues => ({
  name: ar ? "سارة الحربي" : "Sara Alharbi",
  username: "sara.h",
  email: "sara@example.com",
  phone: "",
  bio: ar ? "مصممة منتجات أحب الأنظمة البسيطة." : "Product designer who likes small, quiet systems.",
  locale: ar ? "ar" : "en",
  timezone: "Asia/Riyadh",
  location: ar ? "الرياض، السعودية" : "Riyadh, Saudi Arabia",
  website: "https://sara.design",
});

/** A small generated portrait so the crop has something to work with (an SVG data URL, no network). */
export const demoPhoto = (() => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="royalblue"/><stop offset="1" stop-color="rebeccapurple"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="320" cy="200" r="90" fill="khaki"/><rect x="170" y="310" width="300" height="200" rx="150" fill="khaki"/></svg>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();
