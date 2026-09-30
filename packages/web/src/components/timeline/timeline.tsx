import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { DateTime } from "../numeric";

export interface TimelineProps extends ComponentProps<"ol"> {}

/** A vertical list of events, newest first by convention, with a rail on the inline-start side. */
export function Timeline({ className, ...props }: TimelineProps) {
  return <ol data-slot="timeline" className={cn("m-0 flex list-none flex-col p-0", className)} {...props} />;
}

export interface TimelineItemProps extends Omit<ComponentProps<"li">, "title"> {
  /** Marker glyph (for example a lucide icon), drawn in a round tile. Wins over `actor`. */
  icon?: ReactNode;
  /** Who did it. Renders an avatar marker unless `icon` is given. */
  actor?: { name: string; avatar?: string };
  title: ReactNode;
  description?: ReactNode;
  /** When it happened. Rendered by `DateTime` in relative mode ("3 hours ago" / "قبل 3 ساعات"). */
  time?: Date | number | string;
  /** Extra content under the description (an attachment, a diff, actions). */
  children?: ReactNode;
}

export function TimelineItem({ icon, actor, title, description, time, children, className, ...props }: TimelineItemProps) {
  return (
    <li data-slot="timeline-item" className={cn("group/timeline grid grid-cols-[2rem_1fr] gap-x-3", className)} {...props}>
      <div className="flex flex-col items-center">
        <span data-slot="timeline-marker" className="flex size-8 shrink-0 items-center justify-center">
          {icon ? (
            <span className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
          ) : actor ? (
            <Avatar name={actor.name} src={actor.avatar} size="md" />
          ) : (
            <span aria-hidden className="size-2.5 rounded-full border-2 border-nq-line bg-background" />
          )}
        </span>
        <span aria-hidden data-slot="timeline-rail" className="my-1 w-px flex-1 bg-border group-last/timeline:hidden" />
      </div>
      <div data-slot="timeline-content" className="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-body-sm font-medium text-foreground">{title}</p>
          {time !== undefined ? <DateTime value={time} relative className="shrink-0 text-caption text-muted-foreground" /> : null}
        </div>
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </li>
  );
}
