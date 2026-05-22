/** Terminal API layer types — docs/tokenta-terminal-api-layer-plan.txt */

export type TerminalRunMode =
  | "verify"
  | "listing"
  | "buyback"
  | "pre_purchase"
  | "rotation"
  | "live";

export type TerminalJobStatus =
  | "queued"
  | "running"
  | "verifying"
  | "anchoring"
  | "completed"
  | "failed"
  | "cancelled";

export interface TerminalSessionRecord {
  sessionId: string;
  walletAddress: string | null;
  expiresAt: string;
  createdAt: string;
  capabilities: string[];
  timezone?: string;
  timezoneSource?: "browser" | "ip" | "utc";
}

export interface TerminalJobView {
  terminalJobId: string;
  jobId: string;
  status: TerminalJobStatus;
  progress: {
    step: string | null;
    stepsCompleted: number;
    stepsTotal: number;
    percent: number;
  };
  terminalOutcome: string | null;
  proofHash: string | null;
  anchor: {
    chainId: number;
    network: string;
    status: string;
    txHash: string | null;
  };
  receiptUrl: string;
  proofUrl: string | null;
  streamUrl: string;
  startedAt: string | null;
  updatedAt: string;
  listingId?: string;
  orderId?: string;
}
