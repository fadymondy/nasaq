import { SourceBadge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Database, FileText, GitBranch, Mail, MessagesSquare, Rss } from "lucide-react";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Data Display/Source Badge", component: SourceBadge, args: { label: "GitHub", icon: GitBranch } } satisfies Meta<typeof SourceBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every source in a row of search results. The icon may carry the brand colour; the name stays in text colour. */
export const Sources: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge label="GitHub" icon={GitBranch} />
        <SourceBadge label="Slack" icon={MessagesSquare} color="#611F69" />
        <SourceBadge label={ar ? "البريد" : "Email"} icon={Mail} />
        <SourceBadge label="RSS" icon={Rss} color="#EA580C" />
        <SourceBadge label="Postgres" icon={Database} color="#336791" />
        <SourceBadge label={ar ? "مستندات" : "Docs"} icon={FileText} size="md" />
      </div>
    );
  },
};

/** Icon only, named for assistive tech and in a tooltip. */
export const Compact: Story = {
  render: () => (
    <div className="flex items-center gap-1.5">
      <SourceBadge compact label="GitHub" icon={GitBranch} />
      <SourceBadge compact label="Slack" icon={MessagesSquare} />
      <SourceBadge compact label="RSS" icon={Rss} />
    </div>
  ),
};

/** With `href` the badge is an external link. */
export const AsLink: Story = { args: { label: "github.com/fadymondy", icon: GitBranch, href: "https://github.com/fadymondy" } };

export const Arabic: Story = { ...Sources, globals: { locale: "ar" } };
