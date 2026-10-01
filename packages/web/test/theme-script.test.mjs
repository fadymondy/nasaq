import assert from "node:assert/strict";
import test from "node:test";
import { nasaqThemeScript, nasaqThemeScriptFile, nasaqThemeScriptProps } from "../src/provider/theme-script.ts";

test("nasaqThemeScriptProps carries the nonce and the script", () => {
  const props = nasaqThemeScriptProps("dark", { nonce: "abc" });
  assert.equal(props.nonce, "abc");
  assert.equal(props.dangerouslySetInnerHTML.__html, nasaqThemeScript("dark"));
  assert.equal("nonce" in nasaqThemeScriptProps(), false);
});

test("the static file reads the default from data-default-theme", () => {
  const file = nasaqThemeScriptFile();
  assert.match(file, /data-default-theme/);
  assert.match(file, /nasaq-theme/);
});
