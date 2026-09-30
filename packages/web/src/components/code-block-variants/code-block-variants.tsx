"use client";

import { Check, ChevronDown, Copy, ExternalLink, FileText, Sparkles } from "lucide-react";
import { type ComponentProps, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { CodeBlock, type CodeLanguage } from "../code-block";
import { copyText } from "../copy-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  type AiTarget,
  aiLink,
  buildPrompt,
  execCommand,
  type InstallOptions,
  installCommand,
  PACKAGE_MANAGERS,
  type PackageManager,
  stripPrompt,
  toMarkdown,
} from "./code-block-variants-format";

export {
  type AiTarget,
  aiLink,
  buildPrompt,
  execCommand,
  type InstallOptions,
  installCommand,
  PACKAGE_MANAGERS,
  type PackageManager,
  stripPrompt,
  toMarkdown,
} from "./code-block-variants-format";

const STRINGS = {
  en: {
    copyMenu: "Copy options",
    copyCode: "Copy code",
    copyMarkdown: "Copy as Markdown",
    promptFor: "Copy prompt for",
    openIn: "Open in",
    copiedCode: "Code copied to clipboard",
    copiedMarkdown: "Markdown copied to clipboard",
    copiedPrompt: (target: string) => `Prompt for ${target} copied to clipboard`,
    copyFailed: "Could not copy",
    tooLong: "Too long for a link. Prompt copied instead.",
    copyCommand: "Copy command",
    commandCopied: "Command copied to clipboard",
    command: "Command",
    ai: "Use with AI",
    tabsLabel: "Code variants",
  },
  ar: {
    copyMenu: "خيارات النسخ",
    copyCode: "نسخ الشيفرة",
    copyMarkdown: "نسخ بصيغة Markdown",
    promptFor: "نسخ موجّه لـ",
    openIn: "فتح في",
    copiedCode: "تم نسخ الشيفرة إلى الحافظة",
    copiedMarkdown: "تم نسخ Markdown إلى الحافظة",
    copiedPrompt: (target: string) => `تم نسخ الموجّه الخاص بـ ${target} إلى الحافظة`,
    copyFailed: "تعذر النسخ",
    tooLong: "النص أطول من أن يُفتح برابط. تم نسخ الموجّه بدلًا من ذلك.",
    copyCommand: "نسخ الأمر",
    commandCopied: "تم نسخ الأمر إلى الحافظة",
    command: "أمر",
    ai: "استخدم مع الذكاء الاصطناعي",
    tabsLabel: "صيغ الشيفرة",
  },
};

export type CodeVariantLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<CodeVariantLabels>): CodeVariantLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

/** Brand names are proper nouns: shown as text, never translated and not drawn as logos. */
const TARGET_NAME: Record<AiTarget, string> = { claude: "Claude", chatgpt: "ChatGPT", cursor: "Cursor" };
const ALL_TARGETS: readonly AiTarget[] = ["claude", "chatgpt", "cursor"];

export type CodeCopyKind = "code" | "markdown" | "prompt" | "open";

/** Shows a check for 1.5 seconds after `flash(true)`, plus the message for the live region. */
function useFlash() {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = useCallback((message: string, ok: boolean) => {
    clearTimeout(timer.current);
    setStatus(message);
    setDone(ok);
    timer.current = setTimeout(() => {
      setDone(false);
      setStatus("");
    }, 1500);
  }, []);
  return { status, done, flash };
}

// ---------------------------------------------------------------------------------------------
// Copy menu
// ---------------------------------------------------------------------------------------------

export interface CodeCopyMenuProps {
  /** The code to copy. */
  code: string;
  language?: CodeLanguage | (string & {}) | undefined;
  filename?: string | undefined;
  /** What the assistant should do with the snippet. Default depends on the target. */
  instruction?: string | undefined;
  /** Which assistants to offer. Default Claude, ChatGPT and Cursor. `[]` leaves only Copy code and Copy as Markdown. */
  targets?: readonly AiTarget[] | undefined;
  /** Also offer "Open in ..." links that open the assistant with the prompt filled in. Default true. */
  openLinks?: boolean | undefined;
  /** Called after each successful copy or open. `text` is what went to the clipboard, or the prompt that was opened. */
  onCopy?: ((kind: CodeCopyKind, text: string, target?: AiTarget) => void) | undefined;
  labels?: Partial<CodeVariantLabels> | undefined;
  className?: string | undefined;
}

/**
 * A split copy control: the button copies the code at once, the chevron opens a menu with Copy as Markdown,
 * prompts for Claude, ChatGPT and Cursor, and links that open the assistant with the prompt filled in.
 */
export function CodeCopyMenu({
  code,
  language,
  filename,
  instruction,
  targets = ALL_TARGETS,
  openLinks = true,
  onCopy,
  labels,
  className,
}: CodeCopyMenuProps) {
  const t = useLabels(labels);
  const source = code.replace(/\n$/, "");
  const { status, done, flash } = useFlash();

  const run = async (kind: CodeCopyKind, text: string, message: string, target?: AiTarget) => {
    const ok = await copyText(text);
    flash(ok ? message : t.copyFailed, ok);
    if (ok) onCopy?.(kind, text, target);
  };
  const prompt = (target: AiTarget) => buildPrompt({ code: source, language, filename, instruction, target });
  const open = async (target: AiTarget) => {
    const text = prompt(target);
    const link = aiLink(target, text);
    if (!link) return run("prompt", text, t.tooLong, target);
    window.open(link, "_blank", "noopener,noreferrer");
    onCopy?.("open", text, target);
  };

  return (
    <span data-slot="code-copy-menu" className={cn("inline-flex items-center", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t.copyCode}
        data-copied={done || undefined}
        className="data-copied:text-nq-success-text"
        onClick={() => run("code", source, t.copiedCode)}
      >
        {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={t.copyMenu} data-slot="code-copy-menu-trigger" className="-ms-1 w-5" />}
        >
          <ChevronDown aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={() => run("code", source, t.copiedCode)}>
            <Copy aria-hidden />
            {t.copyCode}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run("markdown", toMarkdown(source, language, filename), t.copiedMarkdown)}>
            <FileText aria-hidden />
            {t.copyMarkdown}
          </DropdownMenuItem>
          {targets.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t.ai}</DropdownMenuLabel>
              {targets.map((target) => (
                <DropdownMenuItem key={target} onClick={() => run("prompt", prompt(target), t.copiedPrompt(TARGET_NAME[target]), target)}>
                  <Sparkles aria-hidden />
                  <span>
                    {t.promptFor} <bdi dir="ltr">{TARGET_NAME[target]}</bdi>
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
          {openLinks && targets.length ? (
            <>
              <DropdownMenuSeparator />
              {targets.map((target) => (
                <DropdownMenuItem key={`open-${target}`} onClick={() => open(target)}>
                  <ExternalLink aria-hidden className="rtl:-scale-x-100" />
                  <span>
                    {t.openIn} <bdi dir="ltr">{TARGET_NAME[target]}</bdi>
                  </span>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// CodeBlockAI
// ---------------------------------------------------------------------------------------------

export interface CodeBlockAIProps extends Omit<ComponentProps<typeof CodeBlock>, "copyAction" | "onCopy"> {
  instruction?: string;
  targets?: readonly AiTarget[];
  openLinks?: boolean;
  onCopy?: CodeCopyMenuProps["onCopy"];
  /** Labels for the copy menu. */
  menuLabels?: Partial<CodeVariantLabels>;
}

/** A CodeBlock whose copy button is the copy menu: Copy code, Copy as Markdown, prompts for AI assistants. */
export function CodeBlockAI({ instruction, targets, openLinks, onCopy, menuLabels, code, language, filename, ...props }: CodeBlockAIProps) {
  return (
    <CodeBlock
      code={code}
      language={language}
      filename={filename}
      copyAction={
        <CodeCopyMenu
          code={code}
          language={language}
          filename={filename}
          instruction={instruction}
          targets={targets}
          openLinks={openLinks}
          onCopy={onCopy}
          labels={menuLabels}
        />
      }
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// CodeTabs
// ---------------------------------------------------------------------------------------------

export interface CodeTab {
  /** Stable id, also the key used to sync tabs across blocks. Default: the label. */
  value?: string;
  /** The tab text: `pnpm`, `curl`, `Python`. Shown left-to-right. */
  label: string;
  code: string;
  language?: CodeLanguage | (string & {});
  /** Names the code region for screen readers and the AI prompt. Default: the label. */
  filename?: string;
}

const synced = new Map<string, string>();
const listeners = new Set<() => void>();
function setSynced(key: string, value: string) {
  synced.set(key, value);
  for (const l of listeners) l();
}
function useSynced(key: string | undefined): string | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (key ? synced.get(key) : undefined),
    () => undefined,
  );
}

export interface CodeTabsProps extends Omit<ComponentProps<"div">, "children" | "dir" | "defaultValue" | "onChange"> {
  tabs: readonly CodeTab[];
  /** Controlled selected tab value. */
  value?: string;
  /** Initial tab when uncontrolled. Default the first. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Blocks with the same `syncKey` switch together (choose pnpm once, every install block follows). */
  syncKey?: string;
  /** Shown left of the tabs, e.g. a filename. Hidden on narrow screens. */
  title?: string;
  /** Use the AI copy menu instead of the plain copy button. Pass an object to configure it. */
  aiCopy?: boolean | Pick<CodeCopyMenuProps, "instruction" | "targets" | "openLinks" | "onCopy">;
  lineNumbers?: boolean;
  /** Classes for the scrolling `<pre>`. */
  preClassName?: string;
  /** Accessible name of the tab list. */
  label?: string;
  labels?: Partial<CodeVariantLabels>;
}

/**
 * The same snippet in several languages or package managers, in tabs. Each panel is a CodeBlock, so it
 * highlights lazily and stays left-to-right in Arabic pages. Copy always copies the visible tab.
 */
export function CodeTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  syncKey,
  title,
  aiCopy = false,
  lineNumbers = false,
  preClassName,
  label,
  labels,
  className,
  ...props
}: CodeTabsProps) {
  const t = useLabels(labels);
  const id = (tab: CodeTab) => tab.value ?? tab.label;
  const shared = useSynced(syncKey);
  const [local, setLocal] = useState(defaultValue ?? (tabs[0] ? id(tabs[0]) : ""));
  const wanted = value ?? shared ?? local;
  const current = tabs.find((x) => id(x) === wanted) ?? tabs[0];
  const active = current ? id(current) : "";
  const menu = typeof aiCopy === "object" ? aiCopy : {};

  return (
    <div
      data-slot="code-tabs"
      dir="ltr"
      className={cn("overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start", className)}
      {...props}
    >
      <Tabs
        value={active}
        onValueChange={(v) => {
          const next = String(v);
          setLocal(next);
          if (syncKey) setSynced(syncKey, next);
          onValueChange?.(next);
        }}
        className="gap-0"
      >
        <div className="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
          <div className="flex min-w-0 items-center gap-3">
            {title ? <span className="hidden truncate font-mono text-caption text-muted-foreground sm:block">{title}</span> : null}
            <TabsList variant="underline" aria-label={label ?? t.tabsLabel} className="h-row gap-3 border-b-0">
              {tabs.map((tab) => (
                <TabsTab key={id(tab)} value={id(tab)} className="h-row font-mono text-caption">
                  {tab.label}
                </TabsTab>
              ))}
              <TabsIndicator />
            </TabsList>
          </div>
          {current ? (
            aiCopy ? (
              <CodeCopyMenu code={current.code} language={current.language} filename={current.filename} labels={labels} {...menu} />
            ) : (
              <CopyIconButton text={current.code.replace(/\n$/, "")} label={t.copyCode} done={t.copiedCode} />
            )
          ) : null}
        </div>
        {tabs.map((tab) => (
          <TabsPanel key={id(tab)} value={id(tab)} className="outline-none">
            <CodeBlock
              code={tab.code}
              language={tab.language ?? "bash"}
              label={tab.filename ?? tab.label}
              lineNumbers={lineNumbers}
              copyable={false}
              preClassName={preClassName}
              className="rounded-none border-0 bg-transparent"
            />
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}

/** An icon button that copies `text` and shows a check, with its own live region. */
function CopyIconButton({ text, label, done: doneLabel, onCopy }: { text: string; label: string; done: string; onCopy?: (text: string) => void }) {
  const { done, flash } = useFlash();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        data-copied={done || undefined}
        className="data-copied:text-nq-success-text"
        onClick={async () => {
          const ok = await copyText(text);
          flash(doneLabel, ok);
          if (ok) onCopy?.(text);
        }}
      >
        {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {done ? doneLabel : ""}
      </span>
    </>
  );
}

/** Tabs for installing a package with pnpm, npm, yarn and bun. Give `CodeTabs` a `syncKey` so the choice sticks. */
export function packageManagerTabs(pkg: string, options?: InstallOptions & { managers?: readonly PackageManager[] }): CodeTab[] {
  return (options?.managers ?? PACKAGE_MANAGERS).map((m) => ({ label: m, value: m, language: "bash", code: installCommand(m, pkg, options) }));
}

/** Tabs for running a package binary without installing it (`pnpm dlx`, `npx`, `yarn dlx`, `bunx`). */
export function execTabs(command: string, options?: { managers?: readonly PackageManager[] }): CodeTab[] {
  return (options?.managers ?? PACKAGE_MANAGERS).map((m) => ({ label: m, value: m, language: "bash", code: execCommand(m, command) }));
}

// ---------------------------------------------------------------------------------------------
// CommandSnippet
// ---------------------------------------------------------------------------------------------

export interface CommandSnippetProps extends Omit<ComponentProps<"div">, "children" | "dir" | "onCopy"> {
  /** The command. A leading `$ ` is dropped from the copy. */
  command: string;
  /** The prompt glyph shown before the command and never copied. `false` hides it. Default `$`. */
  prompt?: string | false;
  onCopy?: (command: string) => void;
  /** Accessible name of the command region. Default "Command". */
  label?: string;
  labels?: Partial<CodeVariantLabels>;
}

/** A one-line command with a copy button that is always visible: `npm i @nasaq/web`. Long commands scroll sideways. */
export function CommandSnippet({ command, prompt = "$", onCopy, label, labels, className, ...props }: CommandSnippetProps) {
  const t = useLabels(labels);
  const clean = stripPrompt(command);
  return (
    <div
      data-slot="command-snippet"
      dir="ltr"
      className={cn(
        "flex h-control items-center gap-1 rounded-control border border-border bg-nq-surface-soft ps-3 pe-1 text-start",
        className,
      )}
      {...props}
    >
      {prompt === false ? null : (
        <span aria-hidden="true" className="select-none font-mono text-code text-muted-foreground">
          {prompt}
        </span>
      )}
      <code
        role="region"
        tabIndex={0}
        aria-label={label ?? t.command}
        className="min-w-0 flex-1 overflow-x-auto whitespace-pre py-1 font-mono text-code text-foreground outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden"
      >
        {clean}
      </code>
      <CopyIconButton text={clean} label={t.copyCommand} done={t.commandCopied} {...(onCopy ? { onCopy } : {})} />
    </div>
  );
}
