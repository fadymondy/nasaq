import { Markdown, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const en = `# Release notes

Nasaq **1.4** adds a \`Markdown\` component. See the [docs](https://nasaq-ui.fadymondy.com) for more.

## What changed

- Faster search
- Task lists
  - [x] Tables
  - [ ] Footnotes

1. Install
2. Wrap your app
3. Ship

> Every block orients itself with \`dir="auto"\`.

| Component | Status |
| :-- | --: |
| CodeBlock | Stable |
| Markdown | Stable |

\`\`\`ts
export const greet = (name: string) => \`Hello, \${name}\`;
\`\`\`

---

~~Old text~~ is struck through.`;

const ar = `# ملاحظات الإصدار

يضيف **نسق** مكوّن \`Markdown\`. راجع [التوثيق](https://nasaq-ui.fadymondy.com) للمزيد.

## ما الجديد

- بحث أسرع
- قوائم المهام

1. ثبّت الحزمة
2. لفّ التطبيق
3. أطلق

> كل كتلة تحدد اتجاهها تلقائيًا.

| المكوّن | الحالة |
| :-- | --: |
| كتلة الشيفرة | مستقر |
| ماركداون | مستقر |

\`\`\`bash
pnpm add @nasaq/web
\`\`\`

This English paragraph sits inside an Arabic document and stays left-to-right.`;

const meta = { title: "Components/Typography/Markdown", component: Markdown, args: { children: en } } satisfies Meta<typeof Markdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <Markdown {...args} className="max-w-2xl" /> };

/** Follows the lab locale toolbar. */
export const EnglishAndArabic: Story = {
  render: () => {
    const isAr = useNasaq().locale.startsWith("ar");
    return <Markdown className="max-w-2xl">{isAr ? ar : en}</Markdown>;
  },
};

/** Both languages side by side, whatever the page direction. */
export const MixedDirections: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-8 md:grid-cols-2">
      <Markdown>{en}</Markdown>
      <Markdown>{ar}</Markdown>
    </div>
  ),
};

/** Raw HTML and `javascript:` links are removed, so untrusted text is safe. */
export const Sanitised: Story = {
  render: () => (
    <Markdown className="max-w-xl">
      {`Safe by default.\n\n<script>alert("x")</script><div style="color:red">raw html is dropped</div>\n\n[bad link](javascript:alert(1))`}
    </Markdown>
  ),
};
