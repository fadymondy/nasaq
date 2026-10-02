import { defineConfig } from "vitest/config";

// The Blade-example tests mount large rendered pages under real Alpine and wait on timers;
// with one worker per core they starve each other and time out at random, so cap the pool.
export default defineConfig({ test: { environment: "happy-dom", maxWorkers: 4, testTimeout: 20000 } });
