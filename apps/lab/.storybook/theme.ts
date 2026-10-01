import { create } from "storybook/theming";

// Values are the Nasaq tokens (packages/tokens/dist/tokens.css): the light and dark surfaces, the `nasaq`
// brand green, Inter and JetBrains Mono. The logo is the official mark, served unchanged from
// packages/brands/assets (see staticDirs in main.ts).
const shared = {
  brandTitle: "Nasaq",
  brandUrl: "https://nasaq-ui.fadymondy.com",
  brandTarget: "_self",
  fontBase: 'Inter, Alexandria, system-ui, sans-serif',
  fontCode: '"JetBrains Mono", ui-monospace, monospace',
  appBorderRadius: 6, // --nq-radius-control (grid expression)
  inputBorderRadius: 6,
} as const;

export const nasaqLight = create({
  ...shared,
  base: "light",
  brandImage: "/brand/nasaq-mark.svg",
  colorPrimary: "#15694A",
  colorSecondary: "#15694A",
  appBg: "#F7F4EC",
  appContentBg: "#F0EBE1",
  appPreviewBg: "#F0EBE1",
  appHoverBg: "#EDE7DB",
  appBorderColor: "#DED5C4",
  textColor: "#0E1A3C",
  textInverseColor: "#F0EBE1",
  textMutedColor: "#6E6551",
  barBg: "#F7F4EC",
  barTextColor: "#6E6551",
  barHoverColor: "#15694A",
  barSelectedColor: "#15694A",
  buttonBg: "#FAF8F3",
  buttonBorder: "#DED5C4",
  booleanBg: "#EDE7DB",
  booleanSelectedBg: "#FAF8F3",
  inputBg: "#FAF8F3",
  inputBorder: "#C7BEA9",
  inputTextColor: "#0E1A3C",
});

export const nasaqDark = create({
  ...shared,
  base: "dark",
  brandImage: "/brand/nasaq-mark-on-dark.svg",
  colorPrimary: "#4CC495",
  colorSecondary: "#4CC495",
  appBg: "#0E1A3C",
  appContentBg: "#0B1429",
  appPreviewBg: "#0B1429",
  appHoverBg: "#1A2747",
  appBorderColor: "#25355C",
  textColor: "#F0EBE1",
  textInverseColor: "#0E1A3C",
  textMutedColor: "#8A97B8",
  barBg: "#0E1A3C",
  barTextColor: "#8A97B8",
  barHoverColor: "#4CC495",
  barSelectedColor: "#4CC495",
  buttonBg: "#132147",
  buttonBorder: "#25355C",
  booleanBg: "#1A2747",
  booleanSelectedBg: "#132147",
  inputBg: "#132147",
  inputBorder: "#25355C",
  inputTextColor: "#F0EBE1",
});

