/** What `onTest` resolves. */
export interface McpTestResult {
  ok: boolean;
  /** Round-trip time in milliseconds. */
  latencyMs?: number;
  /** How many tools the server listed. */
  tools?: number;
  /** Why it failed, when it did. */
  error?: string;
}
