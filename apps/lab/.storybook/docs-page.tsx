import { Controls, Markdown, Primary, Stories, Subtitle, Title, useOf } from "@storybook/addon-docs/blocks";
import { StackTabs } from "./stack-tabs";

/**
 * Every component ships a README.md manual next to its source. The lab's Docs page renders it, so the
 * lab and the MCP catalogue read the same text. A README is matched to its stories by the `story:` id
 * in its frontmatter.
 */
const files = import.meta.glob<string>("../../../packages/web/src/components/*/README.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

interface Manual {
  name: string;
  title: string;
  summary: string;
  body: string;
}

const byStory = new Map<string, Manual>();
const storyByName = new Map<string, string>();

for (const raw of Object.values(files)) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) continue;
  const meta = Object.fromEntries(
    match[1]!.split(/\r?\n/).flatMap((line) => {
      const i = line.indexOf(":");
      return i > 0 ? [[line.slice(0, i).trim(), line.slice(i + 1).trim()]] : [];
    }),
  );
  if (!meta.story) continue;
  storyByName.set(meta.name, meta.story);
  byStory.set(meta.story, {
    name: meta.name ?? "",
    title: meta.title ?? meta.name,
    summary: meta.summary ?? "",
    body: match[2]!,
  });
}

/** Drops the H1 (the page title already shows it), the Quick start (the stack tabs show it) and the "Lab" section (you are in it). */
function prepare(body: string) {
  return (
    body
      .replace(/^# .*\r?\n/m, "")
      .replace(/\n## Quick start\b[\s\S]*?(?=\n## |$)/, "\n")
      .replace(/\n## Lab\b[\s\S]*?(?=\n## |$)/, "\n")
      // Links between manuals point at sibling READMEs; in the lab they go to that component's Docs page.
      .replace(/\]\(\.\.\/([\w-]+)\/README\.md(#[\w-]+)?\)/g, (all, name: string) => {
        const story = storyByName.get(name);
        return story ? `](?path=/docs/${story}--docs)` : all;
      })
  );
}

export function DocsPage() {
  const { preparedMeta } = useOf("meta", ["meta"]);
  const manual = byStory.get(preparedMeta.id);
  if (!manual) {
    return (
      <>
        <Title />
        <Subtitle />
        <Primary />
        <Controls />
        <Stories />
      </>
    );
  }
  // The manuals are English. The locale toolbar sets dir="rtl" on the whole document for the stories,
  // so the prose is pinned to LTR; the story canvases keep following the locale.
  return (
    <>
      <div dir="ltr" lang="en">
        <Title>{manual.title}</Title>
        <Subtitle>{manual.summary}</Subtitle>
      </div>
      {/* React, shadcn, Vue, Blade and HTML + Alpine: the same component, its code and a live preview for each stack. */}
      <StackTabs name={manual.name} body={manual.body} react={<Primary />} />
      <div dir="ltr" lang="en">
        <Markdown>{prepare(manual.body)}</Markdown>
      </div>
      <Stories title="Stories" includePrimary={false} />
    </>
  );
}
