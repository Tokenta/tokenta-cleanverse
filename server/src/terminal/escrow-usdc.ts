/**
 * USDC ERC-20 helpers for escrow fund verification and release payouts.
 */
import {
  createPublicClient,
  decodeEventLog,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";

import {
  ESCROW_WALLET,
  USDC_ADDRESS,
  USDC_DECIMALS,
} from "../config/settlement-wallets.js";
import { settlementRpcUrl } from "./network-config.js";

const ERC20_TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;

function publicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(settlementRpcUrl()),
  });
}

export interface FundTxVerification {
  ok: boolean;
  error?: string;
  from?: Address;
  to?: Address;
  amountUsdc?: string;
}

/**
 * Confirms a fund tx transferred USDC to the configured escrow wallet.
 * Soft-fails when RPC is unavailable (caller may still reconcile in dev).
 */
export async function verifyEscrowFundTx(input: {
  txHash: string;
  expectedAmountUsdc: string;
  expectedFrom?: string | null;
}): Promise<FundTxVerification> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(input.txHash)) {
    return { ok: false, error: "invalid tx hash" };
  }

  try {
    const client = publicClient();
    const receipt = await client.getTransactionReceipt({
      hash: input.txHash as Hash,
    });
    if (receipt.status !== "success") {
      return { ok: false, error: "transaction reverted" };
    }

    const expectedTo = ESCROW_WALLET.toLowerCase();
    const minAmount = parseUnits(
      Math.max(0, Number(input.expectedAmountUsdc) - 0.000001).toFixed(USDC_DECIMALS),
      USDC_DECIMALS,
    );

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== USDC_ADDRESS.toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: ERC20_TRANSFER_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Transfer") continue;
        const { from, to, value } = decoded.args;
        if (to.toLowerCase() !== expectedTo) continue;
        if (value < minAmount) continue;
        if (
          input.expectedFrom &&
          isAddress(input.expectedFrom) &&
          from.toLowerCase() !== input.expectedFrom.toLowerCase()
        ) {
          continue;
        }
        return {
          ok: true,
          from,
          to,
          amountUsdc: formatUnits(value, USDC_DECIMALS),
        };
      } catch {
        /* not a Transfer log */
      }
    }
    return {
      ok: false,
      error: `no USDC transfer to escrow wallet (${ESCROW_WALLET}) in receipt`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "RPC verification failed",
    };
  }
}

export { parseUnits, formatUnits, USDC_ADDRESS, USDC_DECIMALS };
