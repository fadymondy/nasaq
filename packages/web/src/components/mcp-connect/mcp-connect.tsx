"use client";

import { Eye, EyeOff, ExternalLink, Plug } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button, buttonVariants } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { CodeBlock } from "../code-block";
import { CopyButton, CopyField } from "../copy-button";
import { Field, FieldLabel } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { MCP_CLIENTS, type McpClientId, type McpServerInfo, maskToken, mcpSnippet } from "./snippets";

export { MCP_CLIENTS, type McpClientId, type McpServerInfo, type McpSnippet, maskToken, mcpSnippet, TOKEN_PLACEHOLDER } from "./snippets";

const STRINGS = {
  en: {
    title: "Connect an MCP client",
    description: "Let an AI assistant use this workspace through the Model Context Protocol.",
    serverUrl: "Server URL",
    token: "Access token",
    showToken: "Show token",
    hideToken: "Hide token",
    copyToken: "Copy token",
    tokenNote: "The token is shown here so you can paste it. Treat it like a password.",
    noToken: "Create a token first, then paste it where the snippet says YOUR_TOKEN.",
    clients: "Client",
    clientNames: {
      "claude-code": "Claude Code",
      "claude-desktop": "Claude Desktop",
      cursor: "Cursor",
      vscode: "VS Code",
      generic: "Other (JSON)",
    } satisfies Record<McpClientId, string>,
    steps: {
      "claude-code": ["Open a terminal in your project.", "Run the command.", "Type /mcp in Claude Code to check it is connected."],
      "claude-desktop": [
        "Open Settings, then Developer, then Edit Config.",
        "Add this to claude_desktop_config.json. It needs Node.js for npx.",
        "Restart Claude Desktop.",
      ],
      cursor: ["Use the button, or add this to ~/.cursor/mcp.json.", "Open Cursor Settings, then MCP, and turn the server on."],
      vscode: ["Use the button, or add this to .vscode/mcp.json.", "Open Copilot Chat in Agent mode and start the server from the tools list."],
      generic: ["Add this to your client's MCP configuration.", "Clients that read mcpServers use this shape. Rename the root key if yours differs."],
    } satisfies Record<McpClientId, string[]>,
    step: (n: number) => `Step ${n}`,
    followSteps: "Follow these steps",
    copy: "Copy",
    copySnippet: (target: string) => `Copy ${target}`,
    deepLink: { cursor: "Add to Cursor", vscode: "Install in VS Code" } as Partial<Record<McpClientId, string>>,
    test: "Test connection",
    testing: "Testing…",
    testOk: "Connected",
    testOkDetail: (ms?: number, tools?: number) => {
      const parts = [ms === undefined ? null : `${ms} ms`, tools === undefined ? null : tools === 1 ? "1 tool" : `${tools} tools`].filter(Boolean);
      return parts.length ? `The server answered (${parts.join(", ")}).` : "The server answered.";
    },
    testFailed: "Could not connect",
    testFailedFallback: "The server did not answer. Check the URL and the token.",
    unexpected: "The test could not run. Try again.",
  },
  ar: {
    title: "اربط عميل MCP",
    description: "اسمح لمساعد ذكاء اصطناعي باستخدام مساحة العمل هذه عبر بروتوكول Model Context Protocol.",
    serverUrl: "رابط الخادم",
    token: "رمز الوصول",
    showToken: "إظهار الرمز",
    hideToken: "إخفاء الرمز",
    copyToken: "نسخ الرمز",
    tokenNote: "يظهر الرمز هنا لتلصقه. تعامل معه كما تتعامل مع كلمة المرور.",
    noToken: "أنشئ رمزًا أولًا، ثم الصقه مكان YOUR_TOKEN في الشيفرة.",
    clients: "العميل",
    clientNames: {
      "claude-code": "Claude Code",
      "claude-desktop": "Claude Desktop",
      cursor: "Cursor",
      vscode: "VS Code",
      generic: "أخرى (JSON)",
    } satisfies Record<McpClientId, string>,
    steps: {
      "claude-code": ["افتح الطرفية داخل مشروعك.", "شغّل الأمر.", "اكتب /mcp في Claude Code للتأكد من الاتصال."],
      "claude-desktop": [
        "افتح الإعدادات ثم المطوّر ثم تحرير الإعدادات.",
        "أضف هذا إلى claude_desktop_config.json. يلزم Node.js من أجل npx.",
        "أعد تشغيل Claude Desktop.",
      ],
      cursor: ["استخدم الزر، أو أضف هذا إلى ‎~/.cursor/mcp.json.", "افتح إعدادات Cursor ثم MCP وفعّل الخادم."],
      vscode: ["استخدم الزر، أو أضف هذا إلى ‎.vscode/mcp.json.", "افتح Copilot Chat بوضع Agent وشغّل الخادم من قائمة الأدوات."],
      generic: ["أضف هذا إلى إعدادات MCP في عميلك.", "العملاء الذين يقرؤون mcpServers يستخدمون هذا الشكل. غيّر المفتاح الجذري إن اختلف عندك."],
    } satisfies Record<McpClientId, string[]>,
    step: (n: number) => `الخطوة ${n}`,
    followSteps: "اتبع هذه الخطوات",
    copy: "نسخ",
    copySnippet: (target: string) => `نسخ ${target}`,
    deepLink: { cursor: "أضف إلى Cursor", vscode: "ثبّت في VS Code" } as Partial<Record<McpClientId, string>>,
    test: "اختبار الاتصال",
    testing: "جارٍ الاختبار…",
    testOk: "متصل",
    testOkDetail: (ms?: number, tools?: number) => {
      const parts = [ms === undefined ? null : `${ms} ms`, tools === undefined ? null : `${tools} أدوات`].filter(Boolean);
      return parts.length ? `ردّ الخادم (${parts.join("، ")}).` : "ردّ الخادم.";
    },
    testFailed: "تعذر الاتصال",
    testFailedFallback: "لم يردّ الخادم. تحقق من الرابط والرمز.",
    unexpected: "تعذر تشغيل الاختبار. حاول مرة أخرى.",
  },
};

export type McpConnectLabels = (typeof STRINGS)["en"];

/** What `onTest` resolves. */
export interface McpTestResult {
  ok: boolean;
  /** Round-trip time in milliseconds. */
  latencyMs?: number;
  /** How many tools the server listed. */
  tools?: number;
  /** Why it failed, when it did. */
  error?: string;
}

export interface McpConnectProps extends Omit<ComponentProps<"div">, "children"> {
  /** The Streamable HTTP endpoint of the server. */
  serverUrl: string;
  /** The key the server gets in each client's config. Default "nasaq". */
  serverName?: string;
  /** A bearer token to put in the snippets. Omit to show a YOUR_TOKEN placeholder. */
  token?: string;
  /** Header that carries the token. Default `Authorization` (sent as `Bearer <token>`). */
  tokenHeader?: string;
  /** Which clients get a tab, in order. Default all five. */
  clients?: readonly McpClientId[];
  /** The tab open first. Default: the first client. */
  defaultClient?: McpClientId;
  /** Check the server answers. Resolve with the outcome; a rejection shows a generic failure. Omit to hide the test. */
  onTest?: () => Promise<McpTestResult>;
  labels?: Partial<McpConnectLabels>;
  /**
   * `card` (default) frames everything in a card with one tab per client. `steps` drops the frame and the
   * title, picks the client from a select and lays the setup out as numbered steps with the snippet inline:
   * the shape to use inside a sheet or dialog, such as `McpConnectSheet`.
   */
  layout?: "card" | "steps";
}

/** The step a client's snippet belongs under (0-based): the one that says to run or add it. */
const SNIPPET_STEP: Record<McpClientId, number> = { "claude-code": 1, "claude-desktop": 1, cursor: 0, vscode: 0, generic: 0 };

type TestState = { status: "idle" } | { status: "testing" } | { status: "done"; result: McpTestResult } | { status: "error" };

function Snippet({ client, server, reveal, t }: { client: McpClientId; server: McpServerInfo; reveal: boolean; t: McpConnectLabels }) {
  const real = mcpSnippet(client, server);
  const shown = server.token && !reveal ? mcpSnippet(client, server, maskToken(server.token)) : real;
  const deepLabel = t.deepLink[client];
  return (
    <div className="flex flex-col gap-3">
      <div data-slot="mcp-snippet" className="overflow-hidden rounded-surface border border-border" dir="ltr">
        <div className="flex h-row items-center justify-between gap-2 border-b border-border bg-nq-surface-soft ps-3 pe-1.5 font-mono text-caption text-muted-foreground">
          <span className="truncate">{real.target}</span>
          <CopyButton value={real.code} label={t.copySnippet(real.target)} />
        </div>
        <CodeBlock code={shown.code} language={real.language} copyable={false} label={real.target} className="rounded-none border-0" />
      </div>
      {real.deepLink && deepLabel ? (
        <div>
          <a href={real.deepLink} data-slot="mcp-deep-link" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <ExternalLink aria-hidden />
            {deepLabel}
          </a>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Connect an MCP server to the AI clients people use. It shows the server URL and token, then one tab
 * per client (Claude Code, Claude Desktop, Cursor, VS Code, or plain JSON) with the exact snippet to copy,
 * the steps around it, and a one-click install link for Cursor and VS Code. A test button checks the
 * server answers. The snippets are pure text, so nothing here needs a backend except `onTest`.
 */
export function McpConnect({
  serverUrl,
  serverName = "nasaq",
  token,
  tokenHeader,
  clients = MCP_CLIENTS,
  defaultClient,
  onTest,
  labels,
  layout = "card",
  className,
  ...props
}: McpConnectProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [reveal, setReveal] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });
  const server: McpServerInfo = { name: serverName, url: serverUrl, token, header: tokenHeader };
  const first = defaultClient && clients.includes(defaultClient) ? defaultClient : clients[0];
  const [client, setClient] = useState<McpClientId>(first ?? "generic");

  async function run() {
    if (!onTest || test.status === "testing") return;
    setTest({ status: "testing" });
    try {
      setTest({ status: "done", result: await onTest() });
    } catch {
      setTest({ status: "error" });
    }
  }

  const credentials = (
    <>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t.serverUrl}</FieldLabel>
            <CopyField value={serverUrl} label={t.serverUrl} copyLabel={t.copy} />
          </Field>
          {token ? (
            <Field>
              <FieldLabel>{t.token}</FieldLabel>
              <InputGroup data-slot="mcp-token">
                <InputGroupInput readOnly ltr aria-label={t.token} value={reveal ? token : maskToken(token)} onFocus={(e) => e.currentTarget.select()} />
                <InputGroupAddon align="end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={reveal ? t.hideToken : t.showToken}
                    aria-pressed={reveal}
                    onClick={() => setReveal((v) => !v)}
                  >
                    {reveal ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </Button>
                  <CopyButton value={token} label={t.copyToken} />
                </InputGroupAddon>
              </InputGroup>
            </Field>
          ) : null}
        </div>
        {token ? <p className="text-caption text-muted-foreground">{t.tokenNote}</p> : <Alert tone="info">{t.noToken}</Alert>}

    </>
  );

  const testPanel = onTest ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4" data-slot="mcp-test" data-state={test.status}>
            <div>
              <Button type="button" onClick={run} loading={test.status === "testing"}>
                <Plug aria-hidden />
                {test.status === "testing" ? t.testing : t.test}
              </Button>
            </div>
            <div role="status" aria-live="polite">
              {test.status === "done" && test.result.ok ? (
                <Alert tone="success" title={t.testOk}>
                  {t.testOkDetail(test.result.latencyMs, test.result.tools)}
                </Alert>
              ) : null}
              {test.status === "done" && !test.result.ok ? (
                <Alert tone="danger" title={t.testFailed}>
                  {test.result.error ?? t.testFailedFallback}
                </Alert>
              ) : null}
              {test.status === "error" ? <Alert tone="danger">{t.unexpected}</Alert> : null}
            </div>
          </div>
        ) : null;

  if (layout === "steps") {
    const names = clients.map((c) => ({ value: c, label: t.clientNames[c] }));
    return (
      <div data-slot="mcp-connect" data-layout="steps" className={cn("flex w-full flex-col gap-5", className)} {...props}>
        <div className="grid items-center gap-2 sm:grid-cols-[10rem_1fr]">
          <span className="text-label text-foreground" id="mcp-connect-client">
            {t.clients}
          </span>
          <Select items={names} value={client} onValueChange={(v) => v && setClient(v as McpClientId)}>
            <SelectTrigger aria-labelledby="mcp-connect-client" className="w-full" data-slot="mcp-client-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {names.map((n) => (
                <SelectItem key={n.value} value={n.value}>
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {credentials}
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-label text-foreground">{t.followSteps}</h3>
          <ol className="flex flex-col" data-slot="mcp-steps">
            {t.steps[client].map((s, i, all) => (
              <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                {i < all.length - 1 ? <span aria-hidden className="absolute start-3 top-7 bottom-1 w-px bg-border" /> : null}
                <span
                  aria-hidden
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-caption tabular-nums text-muted-foreground"
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
                  <p className="text-body-sm text-foreground">
                    <span className="sr-only">{t.step(i + 1)}: </span>
                    {s}
                  </p>
                  {i === Math.min(SNIPPET_STEP[client], all.length - 1) ? <Snippet client={client} server={server} reveal={reveal} t={t} /> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
        {testPanel}
      </div>
    );
  }

  return (
    <Card data-slot="mcp-connect" className={cn("w-full max-w-3xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {credentials}
        <Tabs defaultValue={first} className="gap-4">
          <TabsList aria-label={t.clients}>
            {clients.map((c) => (
              <TabsTab key={c} value={c}>
                {t.clientNames[c]}
              </TabsTab>
            ))}
            <TabsIndicator />
          </TabsList>
          {clients.map((c) => (
            <TabsPanel key={c} value={c} className="flex flex-col gap-4">
              <ol className="flex flex-col gap-1.5 text-body-sm text-foreground">
                {t.steps[c].map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="sr-only">{t.step(i + 1)}: </span>
                    <span className="min-w-0">{s}</span>
                  </li>
                ))}
              </ol>
              <Snippet client={c} server={server} reveal={reveal} t={t} />
            </TabsPanel>
          ))}
        </Tabs>

        {testPanel}
      </CardContent>
    </Card>
  );
}
