import type { VerificationProof } from "../types/verification.js";
import type { ListingRecord } from "../listings/store.js";
import type { StoredJob } from "../jobs/store.js";

/** Database persistence disabled — Terminal uses in-memory stores only. */
export async function persistListingCreate(
  _listing: ListingRecord,
  _jobId: string,
): Promise<void> {}

export async function persistJobStart(_job: StoredJob): Promise<void> {}

export async function persistJobCompletion(
  _job: StoredJob,
  _proof: VerificationProof,
): Promise<void> {}
