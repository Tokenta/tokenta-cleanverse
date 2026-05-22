import type { VerificationJobResponse } from "../types/verification.js";

export async function pollJobUntilTerminal(
  fetchJob: (jobId: string) => Promise<Response>,
  jobId: string,
  maxMs = 12_000,
): Promise<VerificationJobResponse & { status: string }> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetchJob(jobId);
    const body = (await res.json()) as VerificationJobResponse & { status: string };
    if (body.status === "PASSED" || body.status === "FAILED") {
      return body;
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error(`job ${jobId} did not finish within ${maxMs}ms`);
}
