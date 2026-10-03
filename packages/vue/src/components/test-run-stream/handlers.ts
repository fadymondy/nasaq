import type { TestRunResult, TestRunStep } from "./test-run-stream-logic";

/** What `run` gets to report progress with. Calls after the run ended or was stopped are ignored. */
export interface TestRunHandlers {
  /** A new step, or an update to one with the same id or name. */
  step: (step: TestRunStep) => void;
  /** Something the run kept. */
  result: (result: TestRunResult) => void;
  /** The run finished. Steps still running are marked skipped. */
  done: () => void;
  /** The run failed as a whole. */
  fail: (error: string) => void;
}
