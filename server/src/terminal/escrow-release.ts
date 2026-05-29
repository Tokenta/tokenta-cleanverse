/**
 * On-chain escrow release — sends USDC from the escrow operator wallet to:
 *   - seller (gross minus 3% platform fee)
 *   - treasury (3% platform fee)
 *
 * Requires ESCROW_OPERATOR_PRIVATE_KEY whose address holds USDC received from
 * buyers (typically the same EOA as ESCROW_WALLET, or a hot wallet that mirrors
 * the Safe). For a Gnosis Safe escrow, use Safe Transaction Service later; this
 * module covers EOA / hot-wallet MVP.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import {
  ESCROW_WALLET,
  TREASURY_WALLET,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "../config/settlement-wallets.js";
import { PLATFORM_FEE_BPS } from "./seller-wallet-ledger.js";
import { settlementRpcUrl } from "./network-config.js";

const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const signerMutex = { busy: false, queue: [] as Array<() => void> };

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

export function isEscrowReleaseSignerConfigured(): boolean {
  const key = process.env.ESCROW_OPERATOR_PRIVATE_KEY?.trim();
  return !!(key && key.startsWith("0x") && key.length === 66);
}

export function escrowOperatorAddress(): Address | null {
  const key = process.env.ESCROW_OPERATOR_PRIVATE_KEY?.trim();
  if (!key || !key.startsWith("0x") || key.length !== 66) return null;
  try {
    return privateKeyToAccount(key as Hex).address;
  } catch {
    return null;
  }
}

export interface OnChainReleaseResult {
  ok: boolean;
  error?: string;
  sellerTxHash?: Hash;
  treasuryTxHash?: Hash;
  netUsdc?: string;
  feeUsdc?: string;
  mode: "on-chain" | "skipped";
}

export async function releaseEscrowOnChain(input: {
  sellerWallet: string;
  grossUsdc: string;
  orderId: string;
}): Promise<OnChainReleaseResult> {
  const privateKey = process.env.ESCROW_OPERATOR_PRIVATE_KEY?.trim();
  if (!privateKey) {
    return { ok: true, mode: "skipped" };
  }
  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    return { ok: false, error: "ESCROW_OPERATOR_PRIVATE_KEY must be 32-byte hex", mode: "skipped" };
  }
  if (!isAddress(input.sellerWallet)) {
    return { ok: false, error: "invalid seller wallet", mode: "skipped" };
  }

  const gross = Number(input.grossUsdc);
  if (!Number.isFinite(gross) || gross <= 0) {
    return { ok: false, error: "invalid gross amount", mode: "skipped" };
  }

  const feeRaw = (gross * PLATFORM_FEE_BPS) / 10_000;
  const fee = Number(feeRaw.toFixed(USDC_DECIMALS));
  const net = Number((gross - fee).toFixed(USDC_DECIMALS));

  const netWei = parseUnits(net.toFixed(USDC_DECIMALS), USDC_DECIMALS);
  const feeWei = parseUnits(fee.toFixed(USDC_DECIMALS), USDC_DECIMALS);

  return withSignerLock(async () => {
    const rpcUrl = settlementRpcUrl();
    const account = privateKeyToAccount(privateKey as Hex);
    const operator = account.address;

    if (operator.toLowerCase() !== ESCROW_WALLET.toLowerCase()) {
      console.warn(
        `[escrow-release] operator ${operator} != ESCROW_WALLET ${ESCROW_WALLET}; ` +
          "USDC must be on the operator account for transfers to succeed.",
      );
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [operator],
    });
    const required = netWei + feeWei;
    if (balance < required) {
      return {
        ok: false,
        error: `insufficient USDC on escrow operator (have ${balance}, need ${required})`,
        mode: "on-chain",
      };
    }

    try {
      const sellerTxHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [input.sellerWallet as Address, netWei],
      });

      const treasuryTxHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [TREASURY_WALLET, feeWei],
      });

      return {
        ok: true,
        mode: "on-chain",
        sellerTxHash,
        treasuryTxHash,
        netUsdc: net.toFixed(2),
        feeUsdc: fee.toFixed(USDC_DECIMALS),
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "on-chain release failed",
        mode: "on-chain",
      };
    }
  });
}
