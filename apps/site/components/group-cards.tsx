import Link from "next/link";
import { type Group, groupIcon } from "@/lib/groups";

/** A component group's index page: one card per component, linking to its page. */
export function GroupCards({ group }: { group: Group }) {
  const Icon = groupIcon(group.key);
  return (
    <ul className="not-prose grid gap-3 sm:grid-cols-2">
      {group.items.map((it) => (
        <li key={it.name}>
          <Link
            href={`/components/${it.name}`}
            className="flex h-full flex-col gap-2 rounded-xl border bg-fd-card p-4 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
          >
            <span className="flex items-center gap-2 font-medium">
              <Icon className="size-4 shrink-0 text-fd-primary" aria-hidden />
              {it.title}
            </span>
            {it.summary ? <span className="text-sm text-fd-muted-foreground">{it.summary}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
