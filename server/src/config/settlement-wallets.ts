/**
 * On-chain settlement addresses for Tokenta Terminal (Base Sepolia).
 * Loaded from server/.env — never expose private keys here.
 */
import { isAddress, type Address } from "viem";

/** Circle USDC on Base Sepolia. */
export const USDC_ADDRESS: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const USDC_DECIMALS = 6;

function readAddress(envKey: string, fallback: string): Address {
  const raw = process.env[envKey]?.trim();
  if (raw && isAddress(raw)) return raw;
  if (isAddress(fallback)) return fallback as Address;
  return "0x0000000000000000000000000000000000000000";
}

/** Buyer USDC is locked here on fund (must match VITE_ESCROW_WALLET on the frontend). */
export const ESCROW_WALLET: Address = readAddress(
  "ESCROW_WALLET",
  "0x4463c9f60c27ebF9A966f8cD55d54e08114afb9E",
);

/** Platform fee (3%) is sent here on escrow release. */
export const TREASURY_WALLET: Address = readAddress(
  "TREASURY_WALLET",
  "0x419fe9C2e707a4Ce3613c9945f9Dca03aeDD485d",
);

export function isEscrowWalletConfigured(): boolean {
  return ESCROW_WALLET !== "0x0000000000000000000000000000000000000000";
}

export function isTreasuryWalletConfigured(): boolean {
  return TREASURY_WALLET !== "0x0000000000000000000000000000000000000000";
}
