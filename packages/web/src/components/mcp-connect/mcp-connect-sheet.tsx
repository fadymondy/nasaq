"use client";

import { Plug } from "lucide-react";
import { type ComponentProps, type ReactElement, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../sheet";

const STRINGS = {
  en: { connect: "Connect", title: "Connect your agent", description: "Choose how you want to connect.", types: "Connection type" },
  ar: { connect: "اربط", title: "اربط وكيلك", description: "اختر طريقة الربط.", types: "نوع الربط" },
};

export type McpConnectSheetLabels = (typeof STRINGS)["en"];

/** One way to connect: a tile in the type picker and the panel it opens. */
export interface McpConnectType {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

/**
 * The call to action that opens a connect panel: a green pill with a plug, the way products say "this
 * talks to your tools". Use it on its own or let `McpConnectSheet` render it.
 */
export function ConnectButton({ className, children, ...props }: ComponentProps<typeof Button>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (
    <Button
      data-slot="connect-button"
      shape="pill"
      size="sm"
      className={cn(
        "border border-nq-success/40 bg-nq-success text-white shadow-sm hover:bg-[color-mix(in_oklab,var(--nq-success)_86%,black)]",
        className as string,
      )}
      {...props}
    >
      {children ?? (
        <>
          <Plug aria-hidden />
          {STRINGS[ar ? "ar" : "en"].connect}
        </>
      )}
    </Button>
  );
}

export interface McpConnectSheetProps {
  /** The ways to connect, shown as tiles across the top. One type hides the picker. */
  types: readonly McpConnectType[];
  /** The type open first. Default: the first. */
  defaultType?: string;
  /** Controlled type. */
  type?: string;
  onTypeChange?: (type: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** What opens the sheet. Default a `ConnectButton`. Pass `null` to open it only from `open`. */
  trigger?: ReactNode | null;
  labels?: Partial<McpConnectSheetLabels>;
  /** The edge it slides from. Default `end`. */
  side?: "start" | "end";
  className?: string;
}

/**
 * "Connect to your project" as a side-over: a title, a row of connection types (MCP, API, SDK…) as
 * tiles, and the selected type's setup below. Pair the MCP type with `<McpConnect layout="steps" />`.
 */
export function McpConnectSheet({
  types,
  defaultType,
  type,
  onTypeChange,
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  labels,
  side = "end",
  className,
}: McpConnectSheetProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [own, setOwn] = useState(defaultType ?? types[0]?.value);
  const current = type ?? own;
  const active = types.find((x) => x.value === current) ?? types[0];
  const pick = (v: string) => {
    setOwn(v);
    onTypeChange?.(v);
  };

  return (
    <Sheet open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger === null ? null : <SheetTrigger render={trigger ? (trigger as ReactElement) : <ConnectButton />} />}
      <SheetContent side={side} data-slot="mcp-connect-sheet" className={cn("w-[min(44rem,100vw)]", className)}>
        <SheetHeader>
          <SheetTitle className="text-h3">{t.title}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col">
          {types.length > 1 ? (
            <div className="border-b border-border p-4">
              <div
                role="radiogroup"
                aria-label={t.types}
                data-slot="mcp-connect-types"
                className="grid overflow-hidden rounded-card border border-border"
                style={{ gridTemplateColumns: `repeat(${types.length}, minmax(0, 1fr))` }}
              >
                {types.map((x) => {
                  const on = x.value === active?.value;
                  return (
                    <button
                      key={x.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      data-state={on ? "checked" : "unchecked"}
                      onClick={() => pick(x.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 border-e border-border px-2 py-3 text-center outline-none transition-colors last:border-e-0",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                        on ? "bg-nq-selected text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                      )}
                    >
                      {x.icon ? <span className="[&_svg]:size-4">{x.icon}</span> : null}
                      <span className="text-label">{x.label}</span>
                      {x.description ? <span className="text-caption text-muted-foreground">{x.description}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="p-4" data-slot="mcp-connect-panel" data-type={active?.value}>
            {active?.content}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
