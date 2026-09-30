"use client";

import { Ellipsis } from "lucide-react";
import { type ElementType, isValidElement, type ReactNode } from "react";
import { Button } from "../button";
import { type ContextMenuAction, groupActions } from "../context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";

export interface ActionsMenuProps {
  actions: readonly ContextMenuAction[];
  /** Accessible name of the "…" button. */
  label: string;
  size?: "icon-sm" | "icon";
}

const glyph = (icon: ContextMenuAction["icon"]): ReactNode => {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Glyph = icon as ElementType;
  return <Glyph aria-hidden />;
};

/** The "…" menu that mirrors a `ContextMenuAction[]`, so every context-click action also has a visible button. */
export function ActionsMenu({ actions, label, size = "icon-sm" }: ActionsMenuProps) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size={size} aria-label={label}>
            <Ellipsis aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        {groupActions(actions).map((items, i) => (
          <DropdownMenuGroup key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {items.map((a) => (
              <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect}>
                {glyph(a.icon)}
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
