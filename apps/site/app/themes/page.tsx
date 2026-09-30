import { HomeLayout } from "fumadocs-ui/layouts/home";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { baseOptions } from "@/lib/layout.shared";
import { installCommand } from "@/lib/site";

export const metadata: Metadata = { title: "Brand themes", description: "The ten Nasaq brand themes, each a one-line shadcn install." };

type Theme = { name: string; description: string; css?: Record<string, Record<string, string>> };

async function themes(): Promise<Theme[]> {
  const dir = join(process.cwd(), "..", "lab", ".registry", "r");
  const files = (await readdir(dir)).filter((f) => /^theme-.+\.json$/.test(f)).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), "utf8")) as Theme));
}

export default async function ThemesPage() {
  const list = await themes();
  return (
    <HomeLayout {...baseOptions}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Brand themes</h1>
          <p className="text-fd-muted-foreground">
            {list.length} themes. Each swaps the brand and action colours and needs the <code>nasaq</code> preset.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((t) => {
            const vars = t.css?.[":root"] ?? {};
            const swatches = [vars["--nq-brand-l"], vars["--nq-action-l"], vars["--nq-accent-brand"]].filter(Boolean) as string[];
            return (
              <li key={t.name} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{t.name.replace(/^theme-/, "")}</h2>
                  <span className="flex gap-1" aria-hidden>
                    {swatches.map((c, i) => (
                      <span key={i} className="size-5 rounded-full border" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                </div>
                <p className="text-sm text-fd-muted-foreground">{t.description}</p>
                <code className="overflow-x-auto rounded bg-fd-muted px-2 py-1 text-xs whitespace-nowrap">{installCommand(t.name)}</code>
              </li>
            );
          })}
        </ul>
      </main>
    </HomeLayout>
  );
}
