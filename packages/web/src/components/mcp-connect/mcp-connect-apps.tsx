"use client";

import { ArrowLeft, Check, Copy, ExternalLink, KeyRound, MessageCircle } from "lucide-react";
import { type ComponentType, type ReactNode, type SVGProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { ClaudeCodeLogo, ClaudeLogo, CursorLogo, McpLogo, OpenAILogo, VSCodeLogo } from "./logos";
import { type McpServerInfo, mcpSnippet } from "./snippets";

export { ClaudeCodeLogo, ClaudeLogo, CursorLogo, McpLogo, OpenAILogo, VSCodeLogo } from "./logos";

export type McpAppId = "claude" | "chatgpt" | "claude-code" | "cursor" | "vscode" | "other";

const APPS: { id: McpAppId; logo: ComponentType<SVGProps<SVGSVGElement>>; name: string; oauth: boolean }[] = [
  { id: "claude", logo: ClaudeLogo, name: "Claude", oauth: true },
  { id: "chatgpt", logo: OpenAILogo, name: "ChatGPT", oauth: true },
  { id: "claude-code", logo: ClaudeCodeLogo, name: "Claude Code", oauth: true },
  { id: "cursor", logo: CursorLogo, name: "Cursor", oauth: false },
  { id: "vscode", logo: VSCodeLogo, name: "VS Code", oauth: false },
  { id: "other", logo: McpLogo, name: "", oauth: false },
];

// {product} is the host's name ("Mahaam"); {app} the picked app.
const STRINGS = {
  en: {
    pickTitle: "Which app do you use?",
    pickHint: "Pick the AI app you want to connect to {product}. You can connect more than one.",
    other: "Another app",
    hint: {
      claude: "claude.ai or the Claude app",
      chatgpt: "chatgpt.com or the app",
      "claude-code": "In your terminal",
      cursor: "One-click install",
      vscode: "With GitHub Copilot",
      other: "Any MCP-ready app",
    } as Record<McpAppId, string>,
    back: "Choose another app",
    setupTitle: "Connect {app} to {product}",
    keyFirst: "This app needs a personal key to reach your account. Create one below; it takes a few seconds.",
    keyOnce: "Your key is shown only once. If you lose it, just create a new one.",
    copied: "Copied!",
    copyLink: "Copy the {product} link",
    copyCommand: "Copy the command",
    copyKey: "Copy your key",
    showSetup: "Show the technical setup",
    claude: [
      "Copy the {product} link.",
      "In Claude, open Settings → Connectors → Add custom connector. Name it “{product}”, paste the link and press Add.",
      "Press Connect, sign in to {product} and approve. Done!",
    ],
    chatgpt: [
      "Copy the {product} link.",
      "In ChatGPT, open Settings → Apps & Connectors → Advanced, turn on Developer mode, then press Create and paste the link.",
      "Choose OAuth, sign in to {product} and approve. Done!",
    ],
    code: ["Copy the command and paste it in your terminal.", "In Claude Code type /mcp, choose “{name}”, press Authenticate, then sign in to {product} and approve."],
    codeToken: ["Copy the command and paste it in your terminal.", "In Claude Code type /mcp and check that “{name}” is connected."],
    cursor: ["Press the button. Cursor opens and asks to add {product} — say yes.", "In Cursor Settings → MCP, make sure “{name}” is switched on."],
    cursorButton: "Add to Cursor",
    vscode: ["Press the button. VS Code opens and asks to install {product} — say yes.", "Open Copilot Chat in Agent mode; {product}'s tools appear in the tools list."],
    vscodeButton: "Install in VS Code",
    otherSteps: ["In your app, add a new MCP server and paste this link as its address.", "Where it asks for an “Authorization” header, paste your key."],
    tryTitle: "Then try asking:",
    tryHint: "",
  },
  ar: {
    pickTitle: "أي تطبيق تستخدم؟",
    pickHint: "اختر تطبيق الذكاء الاصطناعي الذي تريد ربطه بـ{product}. يمكنك ربط أكثر من تطبيق.",
    other: "تطبيق آخر",
    hint: {
      claude: "claude.ai أو تطبيق Claude",
      chatgpt: "chatgpt.com أو التطبيق",
      "claude-code": "من الطرفية",
      cursor: "تثبيت بنقرة واحدة",
      vscode: "مع GitHub Copilot",
      other: "أي تطبيق يدعم MCP",
    } as Record<McpAppId, string>,
    back: "اختر تطبيقًا آخر",
    setupTitle: "اربط {app} بـ{product}",
    keyFirst: "يحتاج هذا التطبيق إلى مفتاح شخصي للوصول إلى حسابك. أنشئه بالأسفل، يستغرق ثوانٍ.",
    keyOnce: "يظهر مفتاحك مرة واحدة فقط. إن فقدته أنشئ مفتاحًا جديدًا.",
    copied: "تم النسخ!",
    copyLink: "انسخ رابط {product}",
    copyCommand: "انسخ الأمر",
    copyKey: "انسخ مفتاحك",
    showSetup: "عرض الإعداد التقني",
    claude: [
      "انسخ رابط {product}.",
      "في Claude افتح الإعدادات ← الموصلات ← إضافة موصل مخصص. سمّه «{product}» والصق الرابط ثم اضغط إضافة.",
      "اضغط اتصال، وسجّل الدخول إلى {product} ووافق. تم!",
    ],
    chatgpt: [
      "انسخ رابط {product}.",
      "في ChatGPT افتح الإعدادات ← التطبيقات والموصلات ← متقدم، فعّل وضع المطوّر ثم اضغط إنشاء والصق الرابط.",
      "اختر OAuth، وسجّل الدخول إلى {product} ووافق. تم!",
    ],
    code: ["انسخ الأمر والصقه في الطرفية.", "في Claude Code اكتب ‎/mcp واختر «{name}» ثم اضغط Authenticate، وسجّل الدخول إلى {product} ووافق."],
    codeToken: ["انسخ الأمر والصقه في الطرفية.", "في Claude Code اكتب ‎/mcp وتأكد أن «{name}» متصل."],
    cursor: ["اضغط الزر. سيفتح Cursor ويسألك عن إضافة {product} — وافق.", "في إعدادات Cursor ← MCP تأكد أن «{name}» مفعّل."],
    cursorButton: "أضف إلى Cursor",
    vscode: ["اضغط الزر. سيفتح VS Code ويسألك عن تثبيت {product} — وافق.", "افتح Copilot Chat بوضع Agent، وستظهر أدوات {product} في قائمة الأدوات."],
    vscodeButton: "ثبّت في VS Code",
    otherSteps: ["في تطبيقك أضف خادم MCP جديدًا والصق هذا الرابط عنوانًا له.", "حيث يطلب ترويسة «Authorization» الصق مفتاحك."],
    tryTitle: "ثم جرّب أن تسأل:",
    tryHint: "",
  },
};

export type McpConnectAppsLabels = (typeof STRINGS)["en"];

export interface McpConnectAppsProps {
  /** The product people connect to, used in every sentence: "Copy the Mahaam link". */
  product: string;
  /** The server: its config key and Streamable HTTP URL. A `token` here skips the key step. */
  server: McpServerInfo;
  /**
   * The server signs clients in with OAuth (MCP authorization discovery), so Claude, ChatGPT and
   * Claude Code need only the link. Off: every app takes a key. Default true.
   */
  oauth?: boolean;
  /** Which apps to offer, in order. Default all six. */
  apps?: readonly McpAppId[];
  /**
   * Your key-minting form, for apps that need a token. Call `done(token)` with the new secret.
   * Without it, apps that need a key show the `{TOKEN}` placeholder in their setup.
   */
  renderKeyForm?: (done: (token: string) => void) => ReactNode;
  /** An example prompt for the "Then try asking" card. Empty hides the card. */
  tryHint?: ReactNode;
  labels?: Partial<McpConnectAppsLabels>;
  className?: string;
}

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

/** A rounded tile holding an app's brand mark. */
export function McpAppLogo({ app, className }: { app: McpAppId; className?: string }) {
  const Logo = APPS.find((a) => a.id === app)?.logo ?? McpLogo;
  return (
    <span
      data-slot="mcp-app-logo"
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground shadow-xs", className)}
    >
      <Logo className="size-6" />
    </span>
  );
}

function CopyBig({ value, label, copied }: { value: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="primary"
      shape="pill"
      className="w-full sm:w-auto"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {done ? copied : label}
    </Button>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((x, i) => (
        <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 ? <span aria-hidden className="absolute start-3.5 top-8 bottom-1 w-px bg-border" /> : null}
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
          >
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1 text-body-sm text-foreground">{x}</div>
        </li>
      ))}
    </ol>
  );
}

function ShowSetup({ code, label }: { code: string; label: string }) {
  return (
    <details className="rounded-card border border-border bg-card">
      <summary className="cursor-pointer px-3 py-2 text-caption text-muted-foreground">{label}</summary>
      <pre dir="ltr" className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-xs text-foreground">
        {code}
      </pre>
    </details>
  );
}

/**
 * MCP setup for people who have never heard of MCP: pick the app you use (with its real logo), then
 * two or three plain numbered steps with one big button each, then a first question to try. Apps
 * that sign in with OAuth need only the link; the rest get a key from `renderKeyForm`.
 * Sits well as the MCP panel of `McpConnectSheet`.
 */
export function McpConnectApps({ product, server, oauth = true, apps, renderKeyForm, tryHint, labels, className }: McpConnectAppsProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [app, setApp] = useState<McpAppId | null>(null);
  const [minted, setMinted] = useState<string | null>(null);
  const token = server.token ?? minted ?? undefined;
  const v = { product, name: server.name };
  const list = (apps ?? APPS.map((a) => a.id)).map((id) => APPS.find((a) => a.id === id)!).filter(Boolean);
  const appName = (id: McpAppId) => (id === "other" ? t.other : APPS.find((a) => a.id === id)!.name);
  const tryCard =
    (tryHint ?? t.tryHint) ? (
      <div className="flex items-start gap-3 rounded-card bg-muted p-4">
        <MessageCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-accent-text" />
        <div className="text-body-sm">
          <p className="font-medium text-foreground">{t.tryTitle}</p>
          <p className="text-muted-foreground">{tryHint ?? t.tryHint}</p>
        </div>
      </div>
    ) : null;

  if (!app) {
    return (
      <div data-slot="mcp-connect-apps" className={cn("flex flex-col gap-4", className)}>
        <div>
          <h3 className="text-h4 text-foreground">{t.pickTitle}</h3>
          <p className="text-body-sm text-muted-foreground">{fill(t.pickHint, v)}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setApp(a.id)}
              data-app={a.id}
              className="group flex flex-col items-start gap-2 rounded-card border border-border bg-card p-4 text-start outline-none transition-all duration-200 hover:border-primary hover:bg-nq-hover hover:shadow-md focus-visible:outline-2 focus-visible:outline-nq-focus motion-safe:hover:-translate-y-0.5"
            >
              <McpAppLogo app={a.id} className="transition-transform duration-200 motion-safe:group-hover:scale-110" />
              <span className="text-label text-foreground">{appName(a.id)}</span>
              <span className="text-caption text-muted-foreground">{t.hint[a.id]}</span>
            </button>
          ))}
        </div>
        {tryCard}
      </div>
    );
  }

  const needsKey = !(oauth && APPS.find((a) => a.id === app)!.oauth);
  const back = (
    <Button variant="ghost" size="sm" shape="pill" className="self-start" onClick={() => (setApp(null), setMinted(null))}>
      <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
      {t.back}
    </Button>
  );
  const title = (
    <div className="flex items-center gap-3">
      <McpAppLogo app={app} />
      <h3 className="text-h4 text-foreground">{fill(t.setupTitle, { ...v, app: appName(app) })}</h3>
    </div>
  );

  if (needsKey && !token && renderKeyForm) {
    return (
      <div data-slot="mcp-connect-apps" data-app={app} className={cn("flex flex-col gap-4", className)}>
        {back}
        {title}
        <Alert tone="info">
          <span className="flex items-start gap-2">
            <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.keyFirst}
          </span>
        </Alert>
        {renderKeyForm(setMinted)}
      </div>
    );
  }

  const s = (lines: string[]) => lines.map((x) => fill(x, v));
  const link = <CopyBig value={server.url} label={fill(t.copyLink, v)} copied={t.copied} />;
  const keyed = { ...server, token: needsKey ? token : undefined };
  let steps: ReactNode[];
  switch (app) {
    case "claude":
    case "chatgpt": {
      const [a, b, c] = s(t[app]);
      steps = [
        <>
          {a}
          {link}
        </>,
        b,
        c,
      ];
      break;
    }
    case "claude-code": {
      // OAuth: no header, Claude Code signs in on /mcp. Otherwise the key rides in the command.
      const cmd = needsKey ? mcpSnippet("claude-code", keyed).code : `claude mcp add --transport http ${server.name} ${server.url}`;
      const [a, b] = s(needsKey ? t.codeToken : t.code);
      steps = [
        <>
          {a}
          <CopyBig value={cmd} label={t.copyCommand} copied={t.copied} />
          <ShowSetup code={cmd} label={t.showSetup} />
        </>,
        b,
      ];
      break;
    }
    case "cursor":
    case "vscode": {
      const sn = mcpSnippet(app, keyed);
      const [a, b] = s(t[app]);
      steps = [
        <>
          {a}
          {sn.deepLink ? (
            <Button variant="primary" shape="pill" className="w-full sm:w-auto" nativeButton={false} render={<a href={sn.deepLink} />}>
              <ExternalLink aria-hidden />
              {app === "cursor" ? t.cursorButton : t.vscodeButton}
            </Button>
          ) : null}
          <ShowSetup code={sn.code} label={t.showSetup} />
        </>,
        b,
      ];
      break;
    }
    default: {
      const [a, b] = s(t.otherSteps);
      steps = [
        <>
          {a}
          {link}
        </>,
        <>
          {b}
          {token ? <CopyBig value={`Bearer ${token}`} label={t.copyKey} copied={t.copied} /> : null}
        </>,
      ];
    }
  }

  return (
    <div data-slot="mcp-connect-apps" data-app={app} className={cn("flex flex-col gap-4", className)}>
      {back}
      {title}
      {minted ? <Alert tone="warning">{t.keyOnce}</Alert> : null}
      <div className="rounded-card border border-border bg-card p-4">
        <Steps items={steps} />
      </div>
      {tryCard}
    </div>
  );
}
