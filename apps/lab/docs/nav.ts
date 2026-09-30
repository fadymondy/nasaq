/** The order of the docs, top to bottom. Also the order of the sidebar (see storySort in .storybook/preview.tsx). */
export interface DocEntry {
  /** Storybook title. */
  title: string;
  /** Short label for prev/next links. */
  label: string;
}

export const DOCS: DocEntry[] = [
  { title: "Docs/Introduction", label: "Introduction" },
  { title: "Docs/Installation/shadcn CLI", label: "Install with the shadcn CLI" },
  { title: "Docs/Installation/npm package", label: "Install from npm" },
  { title: "Docs/Installation/Project setup", label: "Project setup" },
  { title: "Docs/Guides/Theming and brands", label: "Theming and brands" },
  { title: "Docs/Guides/Dark mode", label: "Dark mode" },
  { title: "Docs/Guides/RTL and Arabic", label: "RTL and Arabic" },
  { title: "Docs/Guides/Tokens", label: "The token system" },
  { title: "Docs/Guides/Accessibility", label: "Accessibility" },
  { title: "Docs/Guides/MCP server", label: "The MCP server" },
  { title: "Docs/Catalogue/Components", label: "Component catalogue" },
  { title: "Docs/Catalogue/Page templates", label: "Page templates" },
  { title: "Docs/Project/Contributing", label: "Contributing" },
  { title: "Docs/Project/Changelog and versioning", label: "Changelog and versioning" },
  { title: "Docs/Project/Where things live", label: "Where things live" },
];

/** Storybook's id for a title with one story called "Page": lowercase, non-alphanumerics become dashes. */
export const storyId = (title: string, name = "Page") =>
  `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}--${name.toLowerCase()}`;

/** The top-window URL that opens a story (docs pages are stories, so the view mode is `story`). */
export const storyHref = (id: string) => `/?path=/story/${id}`;
export const docsHref = (id: string) => `/?path=/docs/${id}--docs`;
