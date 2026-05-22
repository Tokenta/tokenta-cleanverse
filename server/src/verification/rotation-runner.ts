/** Mechanism Paradigm F — KEY_ROTATION delivery proof */

import type { ProbeRecord, VerificationProof } from "../types/verification.js";
import { computeProbeEnvelope } from "./envelope.js";
import { keyFingerprint } from "./fingerprint.js";
import { defaultProbeModel, runLiveness } from "./providers/router.js";
import type { RunJobInput } from "./job-input.js";
import { finishFail } from "./proof-build.js";

const MOCK_MODE = process.env.VERIFICATION_MOCK === "true";

export async function runKeyRotationJob(
  input: RunJobInput,
  runStandard: (input: RunJobInput) => Promise<VerificationProof>,
): Promise<VerificationProof> {
  const oldKey = input.oldApiKey;
  if (!oldKey || oldKey.length < 8) {
    throw new Error("oldApiKey required for KEY_ROTATION");
  }

  const envelope = computeProbeEnvelope(input.declaredQuantity);
  const costLiability = input.costLiability ?? "SELLER_PAID";
  const rotationProbes: ProbeRecord[] = [];
  const probeModelId = defaultProbeModel(input.provider, input.claimedModel);
  const newFp = keyFingerprint(input.apiKey);

  input.onStep?.("CONNECTIVITY", "Paradigm F — old key revocation check");
  const mockOldStillLive = MOCK_MODE && oldKey.includes("old-active");
  const oldProbe = mockOldStillLive
    ? {
        ok: true as const,
        latencyMs: 100,
        httpStatus: 200,
        record: {
          paradigm: "F",
          endpoint: "ROTATION_OLD_KEY_LIVENESS",
          probeModelId,
          httpStatus: 200,
          latencyMs: 100,
          tokensUsed: 0,
          requestsUsed: 1,
          maxTokensUsed: 0,
          result: "PASS" as const,
          timestamp: new Date().toISOString(),
          cached: false,
        },
      }
    : await runLiveness(input.provider, {
        apiKey: oldKey,
        probeModelId,
        maxTokens: 1,
        mock: MOCK_MODE,
      });

  rotationProbes.push({
    ...oldProbe.record,
    paradigm: "F",
    endpoint: "ROTATION_OLD_KEY_LIVENESS",
  });

  if (oldProbe.ok) {
    return finishFail(
      input,
      newFp,
      envelope,
      costLiability,
      rotationProbes,
      probeModelId,
      false,
      "OLD_KEY_STILL_ACTIVE",
      "Old API key still accepts requests",
    );
  }

  const revokedOk =
    oldProbe.errorCode === "INVALID_KEY" ||
    oldProbe.httpStatus === 401 ||
    (MOCK_MODE && !mockOldStillLive);

  if (!revokedOk) {
    return finishFail(
      input,
      newFp,
      envelope,
      costLiability,
      rotationProbes,
      probeModelId,
      false,
      "OLD_KEY_AMBIGUOUS",
      "Could not confirm old key revocation",
    );
  }

  input.onStep?.("CONNECTIVITY", "Paradigm F — new key verification");
  const newProof = await runStandard({ ...input, context: "KEY_ROTATION" });

  return {
    ...newProof,
    probeManifest: [...rotationProbes, ...newProof.probeManifest],
    totalTokensUsed:
      rotationProbes.reduce((s, p) => s + p.tokensUsed, 0) + newProof.totalTokensUsed,
    totalRequestsUsed: rotationProbes.length + newProof.totalRequestsUsed,
  };
}
