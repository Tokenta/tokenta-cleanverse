/**
 * On-chain contract / address registry for Tokenta Terminal.
 *
 * Phase 1 (semi-onchain hybrid): we do NOT deploy a custom escrow contract yet.
 * Instead, buyers send USDC directly to a Tokenta-controlled escrow wallet (ideally
 * a Safe Multisig on Base Sepolia). The backend reconciles the on-chain transfer
 * with the order ledger and triggers settlement payouts from the same wallet on
 * release.
 *
 * Treasury wallet receives the 3% platform fee on each successful release.
 *
 * Both addresses are env-driven (VITE_ESCROW_WALLET, VITE_TREASURY_WALLET) so the
 * operator can rotate them without touching code. For local dev we fall back to
 * checksum placeholders that produce a clear "NOT CONFIGURED" state in the UI.
 */
import type { Address } from "viem";

import { baseSepolia } from "viem/chains";

export const ACTIVE_CHAIN = baseSepolia;
export const ACTIVE_CHAIN_ID = baseSepolia.id;

/** Official Circle-issued USDC test token on Base Sepolia. */
export const USDC_ADDRESS: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const USDC_DECIMALS = 6;
export const USDC_SYMBOL = "USDC";

const PLACEHOLDER: Address = "0x0000000000000000000000000000000000000000";

/** Defaults match server ESCROW_WALLET / TREASURY_WALLET when env is unset. */
const DEFAULT_ESCROW: Address = "0x4463c9f60c27ebF9A966f8cD55d54e08114afb9E";
const DEFAULT_TREASURY: Address = "0x419fe9C2e707a4Ce3613c9945f9Dca03aeDD485d";

function readEnvAddress(key: string, fallback: Address): Address {
  const raw = (import.meta.env as Record<string, string | undefined>)[key];
  if (raw && /^0x[a-fA-F0-9]{40}$/.test(raw)) return raw as Address;
  return fallback;
}

/**
 * Where the buyer sends USDC when locking escrow. In production this should be a
 * Safe Multisig (Gnosis Safe) so no single key can move funds.
 */
export const ESCROW_WALLET: Address = readEnvAddress("VITE_ESCROW_WALLET", DEFAULT_ESCROW);

/**
 * Receives the 3% platform fee on each successful escrow release. Distinct from
 * the escrow wallet so revenue and operational funds stay separated on-chain.
 */
export const TREASURY_WALLET: Address = readEnvAddress("VITE_TREASURY_WALLET", DEFAULT_TREASURY);

export function isEscrowConfigured(): boolean {
  return ESCROW_WALLET !== PLACEHOLDER;
}

export function isTreasuryConfigured(): boolean {
  return TREASURY_WALLET !== PLACEHOLDER;
}

/** Minimal ERC-20 ABI: balance, decimals, transfer. Avoids pulling in a full ABI bundle. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
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
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
