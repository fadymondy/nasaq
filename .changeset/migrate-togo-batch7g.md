---
"@fadymondy/nasaq": minor
---

Add `TestRunStream`: a test run that streams. Run and Stop, steps appearing and updating in place as the server reports them, a live elapsed time and summary, and what the run saved with its raw data behind a toggle. `run(handlers, signal)` fits an event stream or a promise. Pure helpers `testRunStepStatus`, `upsertTestRunStep`, `settleTestRunSteps`, `testRunCounts`, `formatTestRunDuration`.
