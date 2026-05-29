import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import {
  ESCROW_WALLET,
  TREASURY_WALLET,
  USDC_ADDRESS,
  isEscrowWalletConfigured,
  isTreasuryWalletConfigured,
} from "../config/settlement-wallets.js";
import { escrowOperatorAddress, isEscrowReleaseSignerConfigured } from "./escrow-release.js";
import { isTreasurySignerConfigured } from "./wallet-service.js";

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC_DEFAULT = "https://sepolia.base.org";
export const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";

export interface SettlementNetworkView {
  network: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress: string | null;
  dryRun: boolean;
  treasurySignerConfigured: boolean;
  proofAnchorRpcConfigured: boolean;
  usdcAddress: string;
  escrowWallet: string;
  treasuryWallet: string;
  escrowWalletConfigured: boolean;
  treasuryWalletConfigured: boolean;
  escrowReleaseSignerConfigured: boolean;
  escrowOperatorAddress: string | null;
}

export function settlementRpcUrl(): string {
  return (
    process.env.SETTLEMENT_RPC_URL ??
    process.env.PROOF_ANCHOR_RPC_URL ??
    BASE_SEPOLIA_RPC_DEFAULT
  );
}

export function getSettlementNetworkConfig(): SettlementNetworkView {
  const chainId = Number(
    process.env.SETTLEMENT_CHAIN_ID ?? process.env.PROOF_ANCHOR_CHAIN_ID ?? BASE_SEPOLIA_CHAIN_ID,
  );
  const rpcUrl = settlementRpcUrl();
  const contract =
    process.env.SETTLEMENT_CONTRACT_ADDRESS ??
    process.env.PROOF_ANCHOR_CONTRACT_ADDRESS ??
    null;

  return {
    network: process.env.SETTLEMENT_NETWORK ?? "base-sepolia",
    chainId,
    rpcUrl,
    explorerUrl: BASE_SEPOLIA_EXPLORER,
    contractAddress: contract,
    dryRun: process.env.SETTLEMENT_DRY_RUN !== "false",
    treasurySignerConfigured: isTreasurySignerConfigured(),
    proofAnchorRpcConfigured: !!(process.env.PROOF_ANCHOR_RPC_URL || process.env.SETTLEMENT_RPC_URL),
    usdcAddress: USDC_ADDRESS,
    escrowWallet: ESCROW_WALLET,
    treasuryWallet: TREASURY_WALLET,
    escrowWalletConfigured: isEscrowWalletConfigured(),
    treasuryWalletConfigured: isTreasuryWalletConfigured(),
    escrowReleaseSignerConfigured: isEscrowReleaseSignerConfigured(),
    escrowOperatorAddress: escrowOperatorAddress(),
  };
}

export async function fetchBaseSepoliaTelemetry(): Promise<{
  blockNumber: number | null;
  gasPriceGwei: string | null;
  connected: boolean;
}> {
  const rpcUrl = settlementRpcUrl();
  try {
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
    const [blockNumber, gasPrice] = await Promise.all([
      client.getBlockNumber(),
      client.getGasPrice(),
    ]);
    const gwei = Number(gasPrice) / 1e9;
    return {
      blockNumber: Number(blockNumber),
      gasPriceGwei: gwei < 0.01 ? gwei.toFixed(4) : gwei.toFixed(2),
      connected: true,
    };
  } catch {
    return { blockNumber: null, gasPriceGwei: null, connected: false };
  }
}
