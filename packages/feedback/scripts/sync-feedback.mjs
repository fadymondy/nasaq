// Vendors @mahaam/feedback-core (MIT, github.com/fadymondy/mahaam-feedback) into src/core, byte for byte.
// The core is framework-agnostic and stays upstream's; only the React layer in src/react is Nasaq's.
//   node scripts/sync-feedback.mjs          copy from the source checkout and record its commit
//   node scripts/sync-feedback.mjs --check  fail if src/core differs from the recorded source (no checkout needed
//                                           for the hash check; with a checkout, also diff the files)
// Source: MAHAAM_FEEDBACK_DIR, default ../../../mahaam-feedback (a sibling of this repo).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(pkg, "src/core");
const lockFile = join(pkg, "feedback-core.lock.json");
const source = resolve(pkg, process.env.MAHAAM_FEEDBACK_DIR ?? "../../../mahaam-feedback");
const from = join(source, "packages/core/src");
const check = process.argv.includes("--check");

const files = (dir) => readdirSync(dir).filter((f) => f.endsWith(".ts")).sort();
const hash = (dir) => {
  const h = createHash("sha256");
  for (const f of files(dir)) h.update(f).update("\0").update(readFileSync(join(dir, f))).update("\0");
  return h.digest("hex");
};

if (check) {
  const lock = JSON.parse(readFileSync(lockFile, "utf8"));
  const problems = [];
  if (hash(dest) !== lock.sha256) problems.push("src/core was edited locally; change it upstream and re-sync");
  if (existsSync(from) && hash(from) !== lock.sha256)
    problems.push(`upstream core changed since ${lock.commit.slice(0, 7)}; run pnpm --filter @nasaq/feedback sync`);
  if (problems.length) {
    for (const p of problems) console.error(`feedback-core: ${p}`);
    process.exit(1);
  }
  console.log(`feedback-core: in sync with ${lock.commit.slice(0, 7)}`);
} else {
  if (!existsSync(from)) throw new Error(`No mahaam-feedback checkout at ${source} (set MAHAAM_FEEDBACK_DIR)`);
  const commit = execFileSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  for (const f of files(from)) writeFileSync(join(dest, f), readFileSync(join(from, f)));
  writeFileSync(
    lockFile,
    `${JSON.stringify({ source: "github.com/fadymondy/mahaam-feedback/packages/core/src", license: "MIT", commit, sha256: hash(dest) }, null, 2)}\n`,
  );
  console.log(`feedback-core: vendored ${files(dest).length} files at ${commit.slice(0, 7)}`);
}
