import { CodeBlock, InlineCode, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Data Display/Code Block",
  component: CodeBlock,
  args: {
    language: "tsx",
    filename: "greeting.tsx",
    lineNumbers: true,
    copyable: true,
    code: `import { Text } from "@nasaq/web";

export function Greeting({ name }: { name: string }) {
  const message = \`Hello, \${name}\`; // template string
  return <Text variant="h2">{message}</Text>;
}`,
  },
  argTypes: {
    language: { control: "select", options: ["ts", "tsx", "js", "json", "bash", "css", "html", "md", "go", "php", "python", "sql", "yaml", "text"] },
  },
} satisfies Meta<typeof CodeBlock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Emphasised lines take ranges: `"2-4,7"` or `[2, 3]`. */
export const HighlightedLines: Story = {
  args: { highlightLines: "3-4", filename: undefined },
};

/** Without a filename the copy button floats in the corner on hover or focus. */
export const Bare: Story = {
  args: {
    language: "bash",
    filename: undefined,
    lineNumbers: false,
    code: "pnpm add @nasaq/web\npnpm --filter @nasaq/web typecheck",
  },
};

export const Languages: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <CodeBlock language="json" filename="package.json" code={`{ "name": "@nasaq/web", "private": true, "version": "0.0.0" }`} />
      <CodeBlock language="sql" filename="query.sql" code={`SELECT id, name FROM users WHERE created_at > NOW() - INTERVAL '7 days';`} />
      <CodeBlock language="python" filename="app.py" code={`def greet(name: str) -> str:\n    return f"Hello, {name}"`} />
      <CodeBlock language="go" filename="main.go" code={`func main() {\n\tfmt.Println("hello")\n}`} />
      <CodeBlock language="yaml" filename="ci.yml" code={`on: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest`} />
    </div>
  ),
};

/** The block stays left-to-right on an Arabic page; the surrounding prose flows right-to-left. */
export const EnglishAndArabic: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <p className="text-body text-nq-fg-body">
          {ar ? "ثبّت الحزمة بالأمر " : "Install the package with "}
          <InlineCode>pnpm add @nasaq/web</InlineCode>
          {ar ? " ثم لفّ التطبيق بالمزوّد." : " then wrap your app in the provider."}
        </p>
        <CodeBlock
          language="tsx"
          filename="app.tsx"
          lineNumbers
          code={`<NasaqProvider defaultLocale="${ar ? "ar" : "en"}">\n  {children}\n</NasaqProvider>`}
        />
      </div>
    );
  },
};

/** A long line scrolls inside the block; a height cap scrolls vertically. */
export const Overflow: Story = {
  args: {
    language: "ts",
    preClassName: "max-h-32",
    code: Array.from({ length: 20 }, (_, i) => `export const value${i} = "${"x".repeat(i * 6)}";`).join("\n"),
  },
};
