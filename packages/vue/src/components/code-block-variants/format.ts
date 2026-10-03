/** Pure helpers for the CodeBlock variants: Markdown, AI prompts, deep links and package-manager commands. */

export type AiTarget = "claude" | "chatgpt" | "cursor";

export interface PromptContext {
  code: string;
  language?: string | undefined;
  filename?: string | undefined;
  /** What you want the assistant to do. Default: explain and apply the snippet. */
  instruction?: string | undefined;
  target: AiTarget;
}

const FENCE = "```";

/** A fence long enough that the code itself cannot close it. */
function fenceFor(code: string): string {
  let fence = FENCE;
  while (code.includes(fence)) fence += "`";
  return fence;
}

/** The snippet as a fenced Markdown block, with the filename as a bold line above it when there is one. */
export function toMarkdown(code: string, language?: string, filename?: string): string {
  const fence = fenceFor(code);
  const lang = language && language !== "text" ? language : "";
  const head = filename ? `**${filename}**\n\n` : "";
  return `${head}${fence}${lang}\n${code.replace(/\n$/, "")}\n${fence}`;
}

const DEFAULT_INSTRUCTION: Record<AiTarget, string> = {
  claude: "Read this snippet, explain what it does, and show how to use it in my project.",
  chatgpt: "Explain what this snippet does and how to use it in my project.",
  cursor: "Apply this snippet to my codebase. Match the existing style and keep the change small.",
};

/** A prompt for an AI assistant: the instruction, then the snippet in a fenced block. */
export function buildPrompt({ code, language, filename, instruction, target }: PromptContext): string {
  return `${instruction ?? DEFAULT_INSTRUCTION[target]}\n\n${toMarkdown(code, language, filename)}\n`;
}

/** URLs longer than this are unreliable in browsers and deep-link handlers. */
export const MAX_DEEP_LINK = 6000;

/** The link that opens an assistant with the prompt filled in. `null` when the prompt is too long for a link. */
export function aiLink(target: AiTarget, prompt: string): string | null {
  const q = encodeURIComponent(prompt);
  const url =
    target === "claude"
      ? `https://claude.ai/new?q=${q}`
      : target === "chatgpt"
        ? `https://chatgpt.com/?q=${q}`
        : `cursor://anysphere.cursor-deeplink/prompt?text=${q}`;
  return url.length > MAX_DEEP_LINK ? null : url;
}

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
export const PACKAGE_MANAGERS: readonly PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

export interface InstallOptions {
  /** Install as a dev dependency. */
  dev?: boolean;
  /** Install globally. */
  global?: boolean;
}

/** `add`/`install` command for a package in each manager. */
export function installCommand(manager: PackageManager, pkg: string, { dev = false, global = false }: InstallOptions = {}): string {
  const flag = (short: string) => (dev ? ` ${short}` : "");
  switch (manager) {
    case "pnpm":
      return `pnpm add${global ? " -g" : flag("-D")} ${pkg}`;
    case "npm":
      return `npm install${global ? " -g" : flag("-D")} ${pkg}`;
    case "yarn":
      return global ? `yarn global add ${pkg}` : `yarn add${flag("-D")} ${pkg}`;
    case "bun":
      return `bun add${global ? " -g" : flag("-d")} ${pkg}`;
  }
}

/** Run-without-installing command (`pnpm dlx`, `npx`, `yarn dlx`, `bunx`). */
export function execCommand(manager: PackageManager, command: string): string {
  switch (manager) {
    case "pnpm":
      return `pnpm dlx ${command}`;
    case "npm":
      return `npx ${command}`;
    case "yarn":
      return `yarn dlx ${command}`;
    case "bun":
      return `bunx ${command}`;
  }
}

/** Drops a leading shell prompt (`$ `, `> `, `# `) so a pasted command copies clean. */
export function stripPrompt(command: string): string {
  return command.replace(/^\s*[$>#]\s+/, "").trim();
}
