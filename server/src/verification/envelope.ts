/** Mechanism spec §4G — nonlinear adaptive probe envelope */

export interface ProbeEnvelope {
  operationalMaxProbeTokens: number;
  consentDisclosureCeiling: number;
  maxProbeCalls: number;
  maxLivenessCalls: number;
  maxTokensPerProbe: number;
}

export function computeProbeEnvelope(declaredQuantity: number): ProbeEnvelope {
  const q = Math.max(0, declaredQuantity);

  let tierCeiling: number;
  let maxProbeCalls: number;
  let maxTokensPerProbe: number;

  if (q < 500) {
    tierCeiling = 12;
    maxProbeCalls = 1;
    maxTokensPerProbe = 1;
  } else if (q < 1_000) {
    tierCeiling = 20;
    maxProbeCalls = 2;
    maxTokensPerProbe = 2;
  } else if (q < 10_000) {
    tierCeiling = 40;
    maxProbeCalls = 2;
    maxTokensPerProbe = 3;
  } else if (q < 100_000) {
    tierCeiling = 75;
    maxProbeCalls = 3;
    maxTokensPerProbe = 5;
  } else if (q < 1_000_000) {
    tierCeiling = 120;
    maxProbeCalls = 3;
    maxTokensPerProbe = 5;
  } else {
    tierCeiling = 200;
    maxProbeCalls = 3;
    maxTokensPerProbe = 5;
  }

  const logScaled = q > 0 ? Math.round(10 + 15 * Math.log10(q)) : 15;
  const logScaledCap = Math.min(200, Math.max(15, logScaled));
  const operationalMaxProbeTokens = Math.min(tierCeiling, logScaledCap);
  const consentDisclosureCeiling = Math.min(Math.ceil(q * 0.03), 5000);

  return {
    operationalMaxProbeTokens,
    consentDisclosureCeiling,
    maxProbeCalls,
    maxLivenessCalls: 2,
    maxTokensPerProbe,
  };
}
