import { createPublicClient, createWalletClient, http, isAddress, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { anchorProofCalldata } from "../verification/settlement-contract.js";

export function isTreasurySignerConfigured(): boolean {
  return !!(
    process.env.TREASURY_PRIVATE_KEY &&
    process.env.SETTLEMENT_RPC_URL &&
    process.env.SETTLEMENT_CONTRACT_ADDRESS
  );
}

const signerMutex = {
  busy: false,
  queue: [] as Array<() => void>,
};

const nextNonceBySigner = new Map<string, bigint>();

async function withSignerLock<T>(fn: () => Promise<T>): Promise<T> {
  if (signerMutex.busy) {
    await new Promise<void>((resolve) => signerMutex.queue.push(resolve));
  }
  signerMutex.busy = true;
  try {
    return await fn();
  } finally {
    signerMutex.busy = false;
    const wake = signerMutex.queue.shift();
    if (wake) wake();
  }
}

export async function submitAnchorWithTreasury(input: {
  proofHash: string;
}): Promise<{ ok: boolean; txHash?: string; error?: string }> {
  const privateKey = process.env.TREASURY_PRIVATE_KEY;
  const rpcUrl = process.env.SETTLEMENT_RPC_URL;
  const contract = process.env.SETTLEMENT_CONTRACT_ADDRESS;

  if (!privateKey || !rpcUrl || !contract) {
    return { ok: false, error: "treasury signer env missing" };
  }
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    return { ok: false, error: "TREASURY_PRIVATE_KEY must be 32-byte hex" };
  }
  if (!isAddress(contract)) {
    return { ok: false, error: "SETTLEMENT_CONTRACT_ADDRESS invalid" };
  }

  return withSignerLock(async () => {
    const maxRetries = Math.max(0, Number(process.env.SETTLEMENT_TX_MAX_RETRIES ?? 2));
    const backoffMs = Math.max(50, Number(process.env.SETTLEMENT_TX_RETRY_BACKOFF_MS ?? 300));
    const account = privateKeyToAccount(privateKey as Hex);
    const key = `${baseSepolia.id}:${account.address.toLowerCase()}`;
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    const data = anchorProofCalldata(input.proofHash);

    let nonce =
      nextNonceBySigner.get(key) ??
      (await publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      }));

    const bumpMultiplier = Number(process.env.SETTLEMENT_GAS_BUMP_MULTIPLIER ?? 1.25);
    let gasBumpAttempted = false;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const fees = await publicClient.estimateFeesPerGas();
        const bump =
          gasBumpAttempted && fees.maxFeePerGas
            ? (fees.maxFeePerGas * BigInt(Math.floor(bumpMultiplier * 100))) / 100n
            : undefined;

        const txHash = await walletClient.sendTransaction({
          account,
          to: contract,
          data,
          nonce,
          ...(bump
            ? {
                maxFeePerGas: bump,
                maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
              }
            : {}),
        });
        nextNonceBySigner.set(key, nonce + 1n);
        return { ok: true, txHash };
      } catch (e) {
        const error = e instanceof Error ? e.message : "treasury signer error";
        const lower = error.toLowerCase();
        const needsGasBump = lower.includes("replacement transaction underpriced");
        const nonceIssue =
          lower.includes("nonce") ||
          lower.includes("already known") ||
          needsGasBump;

        if (needsGasBump && !gasBumpAttempted) {
          gasBumpAttempted = true;
        }

        if (nonceIssue && !needsGasBump) {
          nonce = await publicClient.getTransactionCount({
            address: account.address,
            blockTag: "pending",
          });
          nextNonceBySigner.set(key, nonce);
        }
        if (attempt >= maxRetries) return { ok: false, error };
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
      }
    }
    return { ok: false, error: "anchor submit retry exhausted" };
  });
}
