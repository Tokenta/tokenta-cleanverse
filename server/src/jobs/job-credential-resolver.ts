/**
 * Resolve seller API key from listing credentialRef before worker runs (§15 ephemeral decrypt).
 */

import type { StoredJob } from "./store.js";
import { listingStore } from "../listings/store.js";
import { retrieveListingCredential } from "../security/credential-vault.js";

export async function resolveJobApiKey(job: StoredJob): Promise<boolean> {
  if (job.request.apiKey && job.request.apiKey.length >= 8) {
    return true;
  }

  const listingId = job.listingId;
  if (!listingId) return false;

  const listing = listingStore.get(listingId);
  if (!listing?.credentialRef) return false;

  const apiKey = await retrieveListingCredential(listing.credentialRef);
  if (!apiKey || apiKey.length < 8) return false;

  job.request.apiKey = apiKey;
  return true;
}
