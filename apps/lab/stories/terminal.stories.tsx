import { Button, Terminal, type TerminalLine } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { bold, buildOutput, cyan, dim, fakeShell, green, red, useAr, useStreamingOutput, yellow } from "./_developer-demo";

const meta = { title: "Components/Developer/Terminal", component: Terminal, parameters: { layout: "padded" } } satisfies Meta<typeof Terminal>;
export default meta;
type Story = StoryObj;

/** Prompt lines and ANSI colours, mapped to Nasaq tokens. */
export const Static: Story = {
  render: () => {
    const ar = useAr();
    return <Terminal title="~/app" lines={buildOutput(ar)} className="max-w-3xl" />;
  },
};

/** Output arrives line by line. Scroll up to stop following; "Jump to latest" brings the tail back. */
export const Streaming: Story = {
  render: () => {
    const ar = useAr();
    const { lines, running, start, clear } = useStreamingOutput(ar);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <div>
          <Button size="sm" onClick={start} disabled={running}>
            {ar ? "تشغيل البناء" : "Run build"}
          </Button>
        </div>
        <Terminal title="~/app" lines={lines} streaming={running} onClear={clear} height="14rem" />
      </div>
    );
  },
};

/** Every ANSI style the parser understands. */
export const AnsiPalette: Story = {
  render: () => {
    const ESC = String.fromCharCode(27);
    const lines: TerminalLine[] = [
      [30, 31, 32, 33, 34, 35, 36, 37].map((c) => `${ESC}[${c}m color ${c} ${ESC}[0m`).join(""),
      [90, 91, 92, 93, 94, 95, 96, 97].map((c) => `${ESC}[${c}m bright ${c} ${ESC}[0m`).join(""),
      `${bold("bold")} ${dim("dim")} ${ESC}[3mitalic${ESC}[0m ${ESC}[4munderline${ESC}[0m ${ESC}[7minverse${ESC}[0m ${ESC}[9mstrike${ESC}[0m`,
      `${green("success")} ${red("error")} ${yellow("warning")} ${cyan("info")}`,
      `${ESC}[38;5;208m256-colour orange${ESC}[0m  ${ESC}[38;2;120;80;255mtruecolour violet${ESC}[0m`,
      "progress 10%\rprogress 60%\rprogress 100%",
    ];
    return <Terminal title="ANSI" lines={lines} lineNumbers className="max-w-3xl" height="12rem" />;
  },
};

/** An input line with history (up and down arrows). Try `help`. */
export const Interactive: Story = {
  render: () => {
    const ar = useAr();
    const [lines, setLines] = useState<TerminalLine[]>([ar ? "اكتب help للمساعدة" : "type help to see commands"]);
    return (
      <Terminal
        title="sandbox"
        lines={lines}
        height="14rem"
        className="max-w-3xl"
        onClear={() => setLines([])}
        onCommand={async (command) => {
          setLines((l) => [...l, { kind: "command", text: command }]);
          const out = await fakeShell(command, ar);
          setLines((l) => [...l, ...out]);
        }}
      />
    );
  },
};

/** Only the header, tooltips and buttons are translated; output stays left-to-right. */
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => {
    const ar = useAr();
    const { lines, running, start, clear } = useStreamingOutput(ar);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <div>
          <Button size="sm" onClick={start} disabled={running}>
            {ar ? "تشغيل البناء" : "Run build"}
          </Button>
        </div>
        <Terminal lines={lines} streaming={running} onClear={clear} height="14rem" />
      </div>
    );
  },
};
