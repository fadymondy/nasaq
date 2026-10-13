import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// Runs before each file's own afterEach (sequence.hooks: "list"). Every mounted wrapper is unmounted after its test, so a later DOM reset never
// leaves a live component (or its teleported popper) patching detached nodes.
enableAutoUnmount(afterEach);

// Unit tests never reach the internet. NqCountryFlag fetches its SVGs from a CDN, so a combobox of every
// country fired about 250 real requests and timed out whenever the runner's route to the CDN stalled
// (MH-1297). Remote URLs get a 503, which the flag loader treats as "no flag"; local URLs pass through.
// A test that needs fetch still stubs it with vi.stubGlobal, and unstubAllGlobals restores this one.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const host = /^https?:\/\//i.test(url) ? new URL(url).hostname : "localhost";
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    return new Response("", { status: 503, statusText: "offline in tests" });
  }
  return realFetch(input, init);
}) as typeof fetch;
