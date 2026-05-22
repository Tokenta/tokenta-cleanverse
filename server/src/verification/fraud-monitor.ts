/** Engine §4.4 — post-rotation fraud check (old key still active) */

import type { ProviderKind } from "../types/verification.js";
import { keyFingerprint } from "./fingerprint.js";
import { defaultProbeModel, runLiveness } from "./providers/router.js";

export type FraudMonitorStatus = "PENDING" | "CLEAR" | "FRAUD_SUSPECTED";

export interface FraudMonitorRecord {
  orderId: string;
  oldKeyFingerprint: string;
  provider: ProviderKind;
  status: FraudMonitorStatus;
  scheduledAt: string;
  checkedAt?: string;
  message?: string;
}

const watches = new Map<string, FraudMonitorRecord>();
const MOCK_MODE = process.env.VERIFICATION_MOCK === "true";

export function scheduleFraudMonitor(input: {
  orderId: string;
  provider: ProviderKind;
  oldApiKey: string;
  delayMs?: number;
}): FraudMonitorRecord {
  const fp = keyFingerprint(input.oldApiKey);
  const record: FraudMonitorRecord = {
    orderId: input.orderId,
    oldKeyFingerprint: fp,
    provider: input.provider,
    status: "PENDING",
    scheduledAt: new Date().toISOString(),
  };
  watches.set(input.orderId, record);

  const delay = input.delayMs ?? (MOCK_MODE ? 2_000 : 60_000);
  setTimeout(() => {
    void runFraudCheck(input.orderId, input.oldApiKey, input.provider);
  }, delay);

  return record;
}

export async function runFraudCheck(
  orderId: string,
  oldApiKey: string,
  provider: ProviderKind,
): Promise<FraudMonitorRecord | undefined> {
  const record = watches.get(orderId);
  if (!record) return undefined;

  const probeModelId = defaultProbeModel(provider);
  const result = await runLiveness(provider, {
    apiKey: oldApiKey,
    probeModelId,
    maxTokens: 1,
    mock: MOCK_MODE,
  });

  record.checkedAt = new Date().toISOString();
  if (result.ok) {
    record.status = "FRAUD_SUSPECTED";
    record.message = "Old API key still accepts requests after rotation";
  } else {
    record.status = "CLEAR";
    record.message = "Old key rejected — rotation revocation confirmed";
  }
  watches.set(orderId, record);
  return record;
}

export function getFraudMonitor(orderId: string): FraudMonitorRecord | undefined {
  return watches.get(orderId);
}

export function resetFraudMonitorForTest(): void {
  watches.clear();
}
