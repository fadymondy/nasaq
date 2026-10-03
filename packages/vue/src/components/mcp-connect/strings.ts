import type { McpClientId } from "./snippets";

export const STRINGS = {
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
