#!/usr/bin/env node
// One command for the whole registry pipeline:
//   1. scripts/build-registry.mjs   packages/* → registry/registry.json + registry/nasaq/**
//   2. shadcn build                 → apps/lab/.registry/r/{name}.json and registry.json (gitignored)
//   3. scripts/validate-registry.mjs against the shadcn schema
// The lab build (apps/lab/scripts/build.mjs) copies apps/lab/.registry/r into storybook-static as /r and
// copies registry.json to /registry.json, so the deployed docs host serves the registry.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REGISTRY_OUT = "apps/lab/.registry/r";
const step = (cmd) => {
  console.log(`$ ${cmd}`);
  const r = spawnSync(cmd, { cwd: root, shell: true, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
step("node scripts/build-registry.mjs");
step(`pnpm exec shadcn build registry/registry.json -o ${REGISTRY_OUT}`);
step(`node scripts/validate-registry.mjs ${REGISTRY_OUT}`);
