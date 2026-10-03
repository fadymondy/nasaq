import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { LAB_URL } from "./site";

/** The official Nasaq mark (packages/brands/assets, copied to public/brand), never recoloured: one file per theme. */
function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold">
      <img src="/brand/nasaq-mark.svg" alt="" width={24} height={24} className="size-6 dark:hidden" />
      <img src="/brand/nasaq-mark-on-dark.svg" alt="" width={24} height={24} className="hidden size-6 dark:block" />
      <span>Nasaq</span>
    </span>
  );
}

export const baseOptions: BaseLayoutProps = {
  nav: { title: <Logo />, url: "/" },
  githubUrl: "https://github.com/fadymondy/nasaq",
  links: [
    { text: "Guides", url: "/guides/get-started", active: "nested-url" },
    { text: "Components", url: "/components", active: "nested-url" },
    { text: "Themes", url: "/themes" },
    { text: "Lab", url: LAB_URL, external: true },
  ],
};
