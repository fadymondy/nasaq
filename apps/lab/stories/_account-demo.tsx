/* Fake async data and helpers shared by the account-security stories. Nothing here talks to a server. */
import { NasaqProvider, useNasaq } from "@nasaq/web";
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

/** Demo values only: a well-known sample secret and made-up recovery codes. */
export const OTPAUTH_URI = "otpauth://totp/Nasaq:fady%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nasaq&algorithm=SHA1&digits=6&period=30";
export const RECOVERY_CODES = [
  "4kq9-x2mf",
  "b7wd-31ha",
  "pz8r-c5ne",
  "m2ty-9vqs",
  "h6ud-0jxk",
  "a3fg-w8lb",
  "r1ce-t7oz",
  "n5vy-d4pm",
  "k9sj-e2xq",
  "y0bl-u6ha",
];
/** In the demos, this is the "right" 6-digit code and the "right" password. */
export const DEMO_CODE = "123456";
export const DEMO_PASSWORD = "correct-horse";
