import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import { Alexandria, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { ogImage, SITE_DESCRIPTION } from "@/lib/seo";
import "./global.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const alexandria = Alexandria({ subsets: ["arabic"], variable: "--font-alexandria" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.nasaqui.com"),
  title: { default: "Nasaq Documentation", template: "%s | Nasaq" },
  description: SITE_DESCRIPTION,
  applicationName: "Nasaq",
  category: "technology",
  keywords: ["Nasaq", "design system", "shadcn", "React components", "Vue components", "Laravel Blade", "FilamentPHP", "Alpine.js", "Tailwind CSS", "RTL", "Arabic UI", "Base UI"],
  authors: [{ name: "Fady Mondy", url: "https://github.com/fadymondy" }],
  icons: { icon: "/brand/favicon.svg", apple: "/brand/app-icon.svg" },
  alternates: { canonical: "/", types: { "text/plain": "/llms.txt" } },
  openGraph: { type: "website", siteName: "Nasaq Documentation", locale: "en_US", url: "/", images: ogImage("/") },
  twitter: { card: "summary_large_image", images: ogImage("/") },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" }, // nasaq-lint-ignore
    { media: "(prefers-color-scheme: dark)", color: "#0e1a3c" }, // nasaq-lint-ignore
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${alexandria.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
