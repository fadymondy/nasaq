import { CodeBlockAI, CodeTabs, CommandSnippet, execTabs, packageManagerTabs } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_developer-demo";

const meta = { title: "Components/Developer/Code Block Variants", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

const API_TABS = [
  { label: "curl", language: "bash", code: `curl https://api.example.com/v1/projects \\\n  -H "Authorization: Bearer $API_KEY"` },
  { label: "JavaScript", language: "js", code: `const res = await fetch("https://api.example.com/v1/projects", {\n  headers: { Authorization: \`Bearer \${process.env.API_KEY}\` },\n});\nconst projects = await res.json();` },
  { label: "Python", language: "python", code: `import os, requests\n\nres = requests.get(\n    "https://api.example.com/v1/projects",\n    headers={"Authorization": f"Bearer {os.environ['API_KEY']}"},\n)\nprojects = res.json()` },
];

/** Package manager tabs. Blocks that share a `syncKey` switch together: pick pnpm once and both follow. */
export const PackageManagers: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <CodeTabs syncKey="pm" tabs={packageManagerTabs("@nasaq/web")} />
      <CodeTabs syncKey="pm" tabs={packageManagerTabs("typescript", { dev: true })} />
      <CodeTabs syncKey="pm-exec" tabs={execTabs("shadcn@latest init")} />
    </div>
  ),
};

/** The same request in three languages. Copy always copies the visible tab. */
export const Languages: Story = {
  render: () => <CodeTabs title="GET /v1/projects" tabs={API_TABS} lineNumbers />,
};

/** The copy button becomes a menu: Copy code, Copy as Markdown, prompts for Claude, ChatGPT and Cursor, and links that open them. */
export const CopyForAI: Story = {
  render: () => {
    const [last, setLast] = useState("");
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <CodeBlockAI
          language="ts"
          filename="retry.ts"
          instruction="Explain this retry helper and add jitter to the delay."
          onCopy={(kind, _text, target) => setLast(target ? `${kind}:${target}` : kind)}
          code={`export async function retry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {\n  for (let i = 0; ; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (i + 1 >= tries) throw err;\n      await new Promise((r) => setTimeout(r, 2 ** i * 200));\n    }\n  }\n}`}
        />
        <p className="text-caption text-muted-foreground">Last action: {last || "none yet"}</p>
        <CodeTabs aiCopy tabs={API_TABS} />
      </div>
    );
  },
};

/** A one-line command with a copy button that is always visible. A leading `$ ` is dropped from the copy. */
export const Command: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-3">
      <CommandSnippet command="npm i @nasaq/web" />
      <CommandSnippet command="$ pnpm dlx shadcn@latest add https://nasaq-ui.fadymondy.com/r/terminal.json" prompt={false} />
      <CommandSnippet command="git clone https://github.com/example/very-long-repository-name-that-scrolls-sideways.git" />
    </div>
  ),
};

/** On an Arabic page the menu and labels are translated; code, tab names and commands stay left-to-right. */
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => {
    const ar = useAr();
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-body text-foreground">{ar ? "ثبّت الحزمة بمدير الحزم الذي تفضله:" : "Install with your package manager:"}</p>
        <CodeTabs syncKey="pm-ar" aiCopy tabs={packageManagerTabs("@nasaq/web")} />
        <CommandSnippet command="npm i @nasaq/web" />
        <CodeBlockAI language="ts" filename="greet.ts" code={"export const greet = (name: string) => `Hello, ${name}`;"} />
      </div>
    );
  },
};
