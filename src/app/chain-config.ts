/** Base Sepolia testnet — aligned with server SETTLEMENT_* env */
import { baseSepolia } from "viem/chains";

export const TOKENTA_CHAIN = baseSepolia;
export const TOKENTA_CHAIN_ID = baseSepolia.id;
export const TOKENTA_NETWORK_SLUG = "base-sepolia";
export const TOKENTA_RPC_URL =
  (import.meta.env.VITE_SETTLEMENT_RPC_URL as string | undefined) ?? "https://sepolia.base.org";
export const TOKENTA_EXPLORER_URL =
  (import.meta.env.VITE_BLOCK_EXPLORER as string | undefined) ?? "https://sepolia.basescan.org";

export function explorerTxUrl(txHash: string): string {
  if (!txHash.startsWith("0x")) return TOKENTA_EXPLORER_URL;
  return `${TOKENTA_EXPLORER_URL}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${TOKENTA_EXPLORER_URL}/address/${address}`;
}
