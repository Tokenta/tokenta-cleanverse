import type { JobContext, TerminalOutcome } from "../types/verification.js";

export interface VerificationTrailEntry {
  jobId: string;
  proofHash: string;
  context: JobContext;
  terminalOutcome: TerminalOutcome;
  totalTokensUsed: number;
  failureCode?: string;
  recordedAt: string;
}

const trails = new Map<string, VerificationTrailEntry[]>();

export function appendOrderVerification(
  orderId: string,
  entry: Omit<VerificationTrailEntry, "recordedAt">,
): VerificationTrailEntry {
  const row: VerificationTrailEntry = { ...entry, recordedAt: new Date().toISOString() };
  const list = trails.get(orderId) ?? [];
  list.push(row);
  trails.set(orderId, list);
  return row;
}

export function listOrderVerification(orderId: string): VerificationTrailEntry[] {
  return [...(trails.get(orderId) ?? [])].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function resetTrailsForTest(): void {
  trails.clear();
}
