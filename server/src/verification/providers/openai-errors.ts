/** Map OpenAI-compatible provider error bodies to verification failure codes. */

export function mapOpenAiCompatibleError(httpStatus: number, errBody: string): string {
  const body = errBody.toLowerCase();
  if (httpStatus === 401) return "INVALID_KEY";
  if (httpStatus === 403) return "FORBIDDEN";
  if (httpStatus === 429) return "RATE_LIMITED";
  if (httpStatus === 402) return "QUOTA_EXHAUSTED";
  if (
    body.includes("insufficient") &&
    (body.includes("balance") || body.includes("quota") || body.includes("fund"))
  ) {
    return "QUOTA_EXHAUSTED";
  }
  if (body.includes("insufficient_quota")) return "QUOTA_EXHAUSTED";
  if (body.includes("billing") && body.includes("inactive")) return "BILLING_INACTIVE";
  if (httpStatus === 404) return "MODEL_NOT_ENTITLED";
  if (httpStatus >= 500) return "PROVIDER_ERROR";
  return "PROVIDER_ERROR";
}

export function humanizeOpenAiCompatibleError(
  errorCode: string,
  probeUrl: string,
  errBody?: string,
): string {
  switch (errorCode) {
    case "INVALID_KEY":
      return `Authentication failed at ${probeUrl}. Confirm provider selection matches your key (DeepSeek keys require provider DeepSeek).`;
    case "QUOTA_EXHAUSTED":
      return `Account balance or quota insufficient at ${probeUrl}. Top up your provider account and retry.`;
    case "BILLING_INACTIVE":
      return `Billing inactive at ${probeUrl}. Enable billing on your provider account.`;
    case "MODEL_NOT_ENTITLED":
      return `Model not available at ${probeUrl}. Check default model for this provider.`;
    case "PROVIDER_ERROR":
      return `Provider error at ${probeUrl}${errBody ? `: ${errBody.slice(0, 180)}` : ""}`;
    case "RATE_LIMITED":
      return `Rate limited at ${probeUrl}. Retry in a few minutes.`;
    default:
      return `Probe failed at ${probeUrl} (${errorCode})`;
  }
}
