"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider/nasaq-provider";
import { useSidebarCollapsed } from "../app-shell";
import { Avatar } from "../avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";

export interface Workspace {
  id: string;
  name: string;
  /** Plan or role, e.g. "Pro" or "Owner". */
  description?: string;
  /** A ProductMark, an image avatar… Defaults to the workspace initials. */
  logo?: ReactNode;
  logoSrc?: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  value: string;
  onValueChange: (id: string) => void;
  /** Adds an "Add workspace" item. */
  onCreate?: () => void;
  labels?: { heading?: string; create?: string };
  /** Extra items (Settings, Invite members…) placed under the workspace list. */
  children?: ReactNode;
  className?: string;
}

function WorkspaceLogo({ workspace, size }: { workspace: Workspace; size: "sm" | "md" }) {
  if (workspace.logo) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-control border border-border bg-card",
          size === "md" ? "size-8" : "size-6",
        )}
      >
        {workspace.logo}
      </span>
    );
  }
  return <Avatar name={workspace.name} src={workspace.logoSrc} shape="square" size={size} />;
}

/** The organisation / team switcher at the top of the sidebar (shadcn TeamSwitcher, Linear). */
export function WorkspaceSwitcher({ workspaces, value, onValueChange, onCreate, labels, children, className }: WorkspaceSwitcherProps) {
  const collapsed = useSidebarCollapsed();
  const ar = useNasaq().locale.startsWith("ar");
  const active = workspaces.find((w) => w.id === value) ?? workspaces[0];
  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="workspace-switcher"
        aria-label={collapsed ? active.name : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-control px-1.5 text-start outline-none",
          "transition-colors duration-150 ease-nq hover:bg-nq-hover data-popup-open:bg-nq-selected",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          // Expanded: a bordered surface so the switcher reads as a control, not a nav row. A minimum
          // height, not a fixed one, so the two lines keep their padding in Arabic's larger type.
          collapsed
            ? "size-control justify-center px-0"
            : "min-h-[calc(var(--spacing-nav-row)+12px)] border border-border bg-background/60 py-1 shadow-xs hover:border-nq-line-strong",
          className,
        )}
      >
        <WorkspaceLogo workspace={active} size={collapsed ? "sm" : "md"} />
        {collapsed ? null : (
          <>
            <span className="grid min-w-0 flex-1">
              {/* leading-snug on each line: the type roles carry their own (taller, Arabic) line height, which a parent leading can't override. */}
              <span className="truncate text-label leading-snug text-foreground">{active.name}</span>
              {active.description ? <span className="truncate text-caption leading-snug text-muted-foreground">{active.description}</span> : null}
            </span>
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={collapsed ? "inline-end" : "bottom"}
        align="start"
        className={cn("w-64", !collapsed && "w-[max(16rem,var(--anchor-width))]")}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels?.heading ?? (ar ? "مساحات العمل" : "Workspaces")}</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onValueChange(workspace.id)}
              aria-current={workspace.id === active.id ? "true" : undefined}
              className="h-10 aria-[current]:font-medium"
            >
              <WorkspaceLogo workspace={workspace} size="sm" />
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              {workspace.id === active.id ? <Check aria-hidden className="text-foreground!" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {children || onCreate ? <DropdownMenuSeparator /> : null}
        {children}
        {onCreate ? (
          <DropdownMenuItem onClick={onCreate} className="text-muted-foreground">
            <span className="inline-flex size-6 items-center justify-center rounded-control border border-dashed border-border">
              <Plus className="size-3.5!" />
            </span>
            {labels?.create ?? (ar ? "إضافة مساحة عمل" : "Add workspace")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
