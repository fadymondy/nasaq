import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { LAB_URL } from "./site";

export const baseOptions: BaseLayoutProps = {
  nav: { title: "Nasaq" },
  links: [
    { text: "Docs", url: "/docs" },
    { text: "Themes", url: "/themes" },
    { text: "Lab", url: LAB_URL, external: true },
  ],
};
