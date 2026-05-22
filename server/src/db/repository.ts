import type { VerificationProof } from "../types/verification.js";
import type { ListingRecord } from "../listings/store.js";
import type { StoredJob } from "../jobs/store.js";
import { getPrisma } from "./prisma.js";
import { getCredentialVault } from "../security/credential-vault.js";
import { ListingProviderKind, AssetStatus, VerificationJobStatus } from "@prisma/client";

const DEV_WALLET = "0x0000000000000000000000000000000000000001";

function mapProviderKind(kind: string): ListingProviderKind {
  const k = kind.toLowerCase();
  if (k.includes("anthropic")) return ListingProviderKind.ANTHROPIC;
  if (k.includes("google")) return ListingProviderKind.GOOGLE_AI;
  if (k.includes("custom")) return ListingProviderKind.CUSTOM_REST;
  return ListingProviderKind.OPENAI_COMPATIBLE;
}

function mapListingStatus(status: ListingRecord["status"]): AssetStatus {
  switch (status) {
    case "LIVE":
      return AssetStatus.LIVE;
    case "FAILED":
      return AssetStatus.DELISTED;
    case "REVIEW":
    case "DEGRADED":
      return AssetStatus.PAUSED;
    default:
      return AssetStatus.VERIFYING;
  }
}

function mapJobStatus(terminal: string | undefined): VerificationJobStatus {
  if (terminal === "FAIL") return VerificationJobStatus.FAILED;
  return VerificationJobStatus.PASSED;
}

export async function persistListingCreate(
  listing: ListingRecord,
  jobId: string,
): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  const wallet = await prisma.wallet.upsert({
    where: { address: DEV_WALLET },
    create: { address: DEV_WALLET, preferredRole: "SELLER" },
    update: {},
  });

  await prisma.apiListing.create({
    data: {
      id: listing.id,
      publicId: listing.id.slice(-12).toUpperCase(),
      sellerWalletId: wallet.id,
      providerKind: mapProviderKind(listing.providerKind),
      quotaToSell: listing.quotaToSell,
      quotaUnit: listing.quotaUnit,
      askPriceUsdc: listing.askPriceUsdc,
      verifyConsentAt: new Date(),
      autoListAfterVerify: listing.autoListAfterVerify,
      status: mapListingStatus(listing.status),
      credential: {
        create: {
          ciphertextRef:
            listing.credentialRef ??
            (getCredentialVault() ? `listing/${listing.id}` : `dev-ref-${listing.id}`),
          keyFingerprint: listing.keyFingerprint,
        },
      },
      verificationJobs: {
        create: {
          id: jobId,
          status: VerificationJobStatus.QUEUED,
          stepsTotal: 5,
          keyFingerprint: listing.keyFingerprint,
        },
      },
    },
  });
}

export async function persistJobStart(job: StoredJob): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  await prisma.verificationJob.upsert({
    where: { id: job.id },
    create: {
      id: job.id,
      listingId: job.listingId,
      status: "RUNNING",
      stepsTotal: job.stepsTotal,
      keyFingerprint: job.keyFingerprint,
      startedAt: job.startedAt ? new Date(job.startedAt) : new Date(),
    },
    update: {
      status: "RUNNING",
      startedAt: job.startedAt ? new Date(job.startedAt) : new Date(),
      keyFingerprint: job.keyFingerprint,
    },
  });
}

export async function persistJobCompletion(job: StoredJob, proof: VerificationProof): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;

  await prisma.verificationJob.upsert({
    where: { id: job.id },
    create: {
      id: job.id,
      listingId: job.listingId,
      status: mapJobStatus(proof.terminalOutcome),
      stepsCompleted: job.stepsCompleted,
      keyFingerprint: job.keyFingerprint,
      terminalOutcome: proof.terminalOutcome,
      capabilityScore: proof.capabilityScore,
      trustScore: proof.trustScore,
      complianceScore: proof.complianceScore,
      proofHash: proof.proofHash,
      proofJson: proof as object,
      costLiability: proof.costLiability,
      quotaConsumed: proof.totalTokensUsed,
      failureReason: proof.failureCode ?? proof.failureMessage,
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
    },
    update: {
      status: mapJobStatus(proof.terminalOutcome),
      stepsCompleted: job.stepsCompleted,
      keyFingerprint: job.keyFingerprint,
      terminalOutcome: proof.terminalOutcome,
      capabilityScore: proof.capabilityScore,
      trustScore: proof.trustScore,
      complianceScore: proof.complianceScore,
      proofHash: proof.proofHash,
      proofJson: proof as object,
      costLiability: proof.costLiability,
      quotaConsumed: proof.totalTokensUsed,
      failureReason: proof.failureCode ?? proof.failureMessage,
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
      completedAt: job.completedAt ? new Date(job.completedAt) : new Date(),
    },
  });

  if (!job.listingId) return;

  const listing = await prisma.apiListing.findUnique({ where: { id: job.listingId } });
  if (listing) {
    let status = AssetStatus.PAUSED;
    if (proof.terminalOutcome === "PASS" && listing.autoListAfterVerify) {
      status = AssetStatus.LIVE;
    } else if (proof.terminalOutcome === "FAIL") {
      status = AssetStatus.DELISTED;
    }
    await prisma.apiListing.update({
      where: { id: job.listingId },
      data: { status },
    });
  }
}
