"use client";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge, type TagHue } from "../badge";
import { DateTime, formatNumber } from "../numeric";

/** A person or organisation shown in a list: avatar or logo, a name, and a quieter second line. */
export interface EntityPerson {
  name: string;
  avatar?: string;
}

export interface EntityTag {
  label: string;
  hue?: TagHue;
}

export interface EntityIdentityProps {
  name: ReactNode;
  /** Plain-text name for the avatar fallback and its label. */
  avatarName: string;
  avatar?: string;
  /** People are round; companies and projects are square (logos are never cropped to a circle). */
  shape?: "circle" | "square";
  size?: "md" | "lg";
  /** Email, domain, job title. Left-to-right text such as an email should be wrapped in `<bdi>` by the caller. */
  subtitle?: ReactNode;
  className?: string;
}

/** The first cell of a row and the head of a card: avatar or logo, name, subtitle. */
export function EntityIdentity({ name, avatarName, avatar, shape = "circle", size = "md", subtitle, className }: EntityIdentityProps) {
  return (
    <div data-slot="entity-identity" className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar name={avatarName} src={avatar} shape={shape} size={size} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-label text-foreground">{name}</span>
        {subtitle ? <span className="truncate text-body-sm text-muted-foreground">{subtitle}</span> : null}
      </div>
    </div>
  );
}

export interface TagListProps {
  tags: readonly EntityTag[];
  /** Tags shown before "+N". Default 3. */
  max?: number;
  className?: string;
}

/** Tag chips with a "+N" overflow. The overflow chip lists the hidden tags in its title. */
export function TagList({ tags, max = 3, className }: TagListProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  if (!tags.length) return <span className="text-muted-foreground">—</span>;
  const shown = tags.slice(0, max);
  const hidden = tags.slice(max);
  return (
    <span data-slot="tag-list" className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {shown.map((tag) => (
        <Badge key={tag.label} variant="tag" hue={tag.hue ?? "gray"}>
          {tag.label}
        </Badge>
      ))}
      {hidden.length ? (
        <Badge variant="outline" title={hidden.map((tag) => tag.label).join(", ")} className="tabular-nums">
          +{formatNumber(hidden.length, locale)}
        </Badge>
      ) : null}
    </span>
  );
}

/** An owner or assignee: small avatar and name. */
export function PersonCell({ person, className }: { person?: EntityPerson | null; className?: string }) {
  if (!person) return <span className="text-muted-foreground">—</span>;
  return (
    <span data-slot="person-cell" className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar name={person.name} src={person.avatar} size="sm" />
      <span className="truncate text-body-sm">{person.name}</span>
    </span>
  );
}

/** "3 days ago", with the full date on hover. Renders a dash when there is no date. */
export function ActivityCell({ value, className }: { value?: Date | string | number | null; className?: string }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <DateTime value={value} relative className={cn("text-body-sm text-muted-foreground", className)} />;
}

export interface AvatarStackProps {
  people: readonly EntityPerson[];
  /** Avatars shown before "+N". Default 4. */
  max?: number;
  className?: string;
}

/** Overlapping avatars for a project's members, with a "+N" for the rest. */
export function AvatarStack({ people, max = 4, className }: AvatarStackProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  if (!people.length) return <span className="text-muted-foreground">—</span>;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span data-slot="avatar-stack" role="group" aria-label={people.map((p) => p.name).join(", ")} className={cn("inline-flex items-center", className)}>
      {shown.map((p) => (
        <Avatar key={p.name} name={p.name} src={p.avatar} size="sm" className="-ms-1.5 ring-2 ring-card first:ms-0" />
      ))}
      {rest > 0 ? (
        <span className="-ms-1.5 inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-medium tabular-nums text-secondary-foreground ring-2 ring-card">
          +{formatNumber(rest, locale)}
        </span>
      ) : null}
    </span>
  );
}

/** A quiet "label: value" line for card bodies. */
export function CardMeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div data-slot="card-meta" className="flex items-center justify-between gap-3 text-body-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end">{children}</span>
    </div>
  );
}
