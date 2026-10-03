import { Markdown, Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "@nasaq/web";
import type { Meta } from "@storybook/react-vite";
import { DocPage, docComponents, docParameters } from "./doc-page";
import md from "./content/get-started.md?raw";
import react from "./content/get-started/react.md?raw";
import shadcn from "./content/get-started/shadcn.md?raw";
import inertia from "./content/get-started/inertia.md?raw";
import vue from "./content/get-started/vue.md?raw";
import laravel from "./content/get-started/laravel.md?raw";
import html from "./content/get-started/html.md?raw";

const TITLE = "Docs/Installation/Get started";

/** One tab per stack; each is a Markdown file in ./content/get-started. */
const STACKS = [
  { value: "react", label: "React", md: react },
  { value: "shadcn", label: "shadcn", md: shadcn },
  { value: "inertia", label: "Inertia", md: inertia },
  { value: "vue", label: "Vue / Nuxt", md: vue },
  { value: "laravel", label: "Laravel / Filament", md: laravel },
  { value: "html", label: "HTML + Alpine", md: html },
];

function Stacks() {
  return (
    <Tabs defaultValue="react" className="mt-4">
      <TabsList className="flex-wrap">
        {STACKS.map((s) => (
          <TabsTab key={s.value} value={s.value}>
            {s.label}
          </TabsTab>
        ))}
        <TabsIndicator />
      </TabsList>
      {STACKS.map((s) => (
        <TabsPanel key={s.value} value={s.value}>
          <Markdown className="gap-4" components={docComponents}>
            {s.md}
          </Markdown>
        </TabsPanel>
      ))}
    </Tabs>
  );
}

const meta = {
  title: TITLE,
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title={TITLE} md={md} after={<Stacks />} />,
} satisfies Meta;
export default meta;

export const Page = {};
