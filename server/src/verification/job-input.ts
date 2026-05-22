import type { CreateVerificationJobRequest, VerificationStepName } from "../types/verification.js";

export type StepCallback = (step: VerificationStepName, message: string) => void;

export interface RunJobInput extends CreateVerificationJobRequest {
  jobId: string;
  onStep?: StepCallback;
}
