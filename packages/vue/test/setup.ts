import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// Runs before each file's own afterEach (sequence.hooks: "list"). Every mounted wrapper is unmounted after its test, so a later DOM reset never
// leaves a live component (or its teleported popper) patching detached nodes.
enableAutoUnmount(afterEach);
