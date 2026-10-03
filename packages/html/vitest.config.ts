import { defineConfig } from "vitest/config";

// The Blade-example tests mount large rendered pages under real Alpine and wait on timers;
// with one worker per core they starve each other and time out at random, so cap the pool.
// CI shares its runner with the Vue suite, so a timer test gets one retry there (never locally).
export default defineConfig({ test: { environment: "happy-dom", maxWorkers: 4, testTimeout: 20000, retry: process.env.CI ? 1 : 0 } });
