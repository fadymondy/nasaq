import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { useDebounce, useDebouncedCallback, useMediaQuery } from ".";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("hooks", () => {
  it("useDebounce follows the value after the delay", async () => {
    const q = ref("a");
    let out!: ReturnType<typeof useDebounce<string>>;
    mount(defineComponent({ setup: () => ((out = useDebounce(q, 300)), () => h("i")) }));
    expect(out.value).toBe("a");
    q.value = "ab";
    await nextTick();
    vi.advanceTimersByTime(299);
    expect(out.value).toBe("a");
    vi.advanceTimersByTime(2);
    expect(out.value).toBe("ab");
  });

  it("useDebouncedCallback runs once after calls stop and can be cancelled", () => {
    const fn = vi.fn();
    let cb!: ReturnType<typeof useDebouncedCallback<[string]>>;
    mount(defineComponent({ setup: () => ((cb = useDebouncedCallback(fn, 100)), () => h("i")) }));
    cb("a");
    cb("b");
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
    cb("c");
    cb.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("useMediaQuery tracks matchMedia changes", () => {
    let listener: (() => void) | undefined;
    const mq = { matches: false, addEventListener: (_: string, l: () => void) => (listener = l), removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", () => mq);
    let out!: ReturnType<typeof useMediaQuery>;
    mount(defineComponent({ setup: () => ((out = useMediaQuery("(max-width: 700px)")), () => h("i")) }));
    expect(out.value).toBe(false);
    mq.matches = true;
    listener?.();
    expect(out.value).toBe(true);
    vi.unstubAllGlobals();
  });
});
