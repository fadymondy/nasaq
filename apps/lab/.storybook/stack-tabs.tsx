import { Source } from "@storybook/addon-docs/blocks";
import { Badge, Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab, Text } from "@nasaq/web";
import { useEffect, useRef, type ReactNode } from "react";
import { exportsMap } from "virtual:nasaq-exports";
import { startAlpine } from "./alpine";

/**
 * One component, every stack: the same Tailwind classes rendered by React, the shadcn copy, Vue, Blade
 * (Laravel, Livewire, Filament) and plain HTML with Alpine. Each tab shows the code and a live preview.
 * The examples are files next to each port, so the tests run exactly what this page shows:
 *   React / shadcn   the README's "## Quick start"
 *   Vue              packages/vue/examples/<name>.vue, mounted live
 *   Blade            packages/php/examples/<name>.blade.php
 *   HTML + Alpine    packages/php/examples/rendered/<name>.html (that Blade, rendered by Laravel), run live
 */

const byName = <T,>(files: Record<string, T>, suffix: RegExp) =>
  Object.fromEntries(Object.entries(files).map(([path, v]) => [path.split("/").pop()!.replace(suffix, ""), v]));

const vueSource = byName(
  import.meta.glob<string>("../../../packages/vue/examples/*.vue", { query: "?raw", import: "default", eager: true }),
  /\.vue$/,
);
const vueModule = byName(import.meta.glob<{ default: object }>("../../../packages/vue/examples/*.vue"), /\.vue$/);
const bladeSource = byName(
  import.meta.glob<string>("../../../packages/php/examples/*.blade.php", { query: "?raw", import: "default", eager: true }),
  /\.blade\.php$/,
);
const htmlSource = byName(
  import.meta.glob<string>("../../../packages/php/examples/rendered/*.html", { query: "?raw", import: "default", eager: true }),
  /\.html$/,
);

/** The README's Quick start code, or "" when it has none. */
export function quickStart(body: string): string {
  return /\n## Quick start\s*\n+```tsx\r?\n([\s\S]*?)\r?\n```/.exec(`\n${body}`)?.[1] ?? "";
}

/** The Quick start with shadcn paths: each name imported from the package comes from the file the registry installs. */
function toShadcn(code: string): string {
  return code.replace(/import \{([^}]+)\} from "@fadymondy\/nasaq\/web";/g, (_all, names: string) => {
    const groups = new Map<string, string[]>();
    for (const n of names.split(",").map((s) => s.trim()).filter(Boolean)) {
      const path = exportsMap[n.replace(/^type\s+/, "").split(/\s+as\s+/)[0]!] ?? "@/components/ui/nasaq";
      groups.set(path, [...(groups.get(path) ?? []), n]);
    }
    return [...groups].map(([path, ns]) => `import { ${ns.join(", ")} } from "${path}";`).join("\n");
  });
}

function VueLive({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let off = false;
    let unmount: (() => void) | undefined;
    Promise.all([vueModule[name]!(), import("vue")]).then(([mod, { createApp }]) => {
      if (off || !ref.current) return;
      const app = createApp(mod.default);
      app.mount(ref.current);
      unmount = () => app.unmount();
    });
    return () => {
      off = true;
      unmount?.();
    };
  }, [name]);
  return <div ref={ref} />;
}

function HtmlLive({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const Alpine = startAlpine();
    el.innerHTML = html;
    Alpine.initTree(el);
    return () => {
      Alpine.destroyTree(el);
      el.innerHTML = "";
    };
  }, [html]);
  return <div ref={ref} />;
}

function Preview({ children }: { children: ReactNode }) {
  return <div className="flex min-h-32 items-center justify-center rounded-container border border-border bg-background p-8">{children}</div>;
}

function NotPorted({ stack }: { stack: string }) {
  return (
    <div className="flex items-center gap-2 rounded-container border border-dashed border-border p-6">
      <Badge variant="outline">Not ported yet</Badge>
      <Text as="span" variant="body-sm" className="text-muted-foreground">
        The {stack} port of this component is on the way. Use React, or the shadcn copy, until then.
      </Text>
    </div>
  );
}

export interface StackTabsProps {
  /** The component folder name (button, dialog …). */
  name: string;
  /** The README body, for the React Quick start. */
  body: string;
  /** The React preview: the page's primary story. */
  react: ReactNode;
}

export function StackTabs({ name, body, react }: StackTabsProps) {
  const tsx = quickStart(body);
  const html = htmlSource[name];
  return (
    <Tabs defaultValue="react" className="my-6">
      <TabsList>
        <TabsTab value="react">React</TabsTab>
        <TabsTab value="shadcn">shadcn</TabsTab>
        <TabsTab value="vue">Vue</TabsTab>
        <TabsTab value="blade">Blade</TabsTab>
        <TabsTab value="html">HTML + Alpine</TabsTab>
        <TabsIndicator />
      </TabsList>
      <TabsPanel value="react" keepMounted>
        {react}
        {tsx ? <Source code={`// npm i @fadymondy/nasaq\n${tsx}`} language="tsx" dark /> : null}
      </TabsPanel>
      <TabsPanel value="shadcn">
        <Source code={`npx shadcn@latest add @nasaq/${name}`} language="bash" dark />
        {tsx ? <Source code={toShadcn(tsx)} language="tsx" dark /> : null}
      </TabsPanel>
      <TabsPanel value="vue">
        {vueSource[name] ? (
          <>
            <Preview>
              <VueLive name={name} />
            </Preview>
            <Source code={vueSource[name]} language="html" dark />
          </>
        ) : (
          <NotPorted stack="Vue" />
        )}
      </TabsPanel>
      <TabsPanel value="blade">
        {bladeSource[name] ? (
          <>
            {html ? (
              <Preview>
                <HtmlLive html={html} />
              </Preview>
            ) : null}
            <Source code={`{{-- composer require fadymondy/nasaq-php --}}\n${bladeSource[name]}`} language="html" dark />
          </>
        ) : (
          <NotPorted stack="Blade" />
        )}
      </TabsPanel>
      <TabsPanel value="html">
        {html ? (
          <>
            <Preview>
              <HtmlLive html={html} />
            </Preview>
            <Source code={html} language="html" dark />
          </>
        ) : (
          <NotPorted stack="HTML" />
        )}
      </TabsPanel>
    </Tabs>
  );
}
