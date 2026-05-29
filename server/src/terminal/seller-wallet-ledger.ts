/**
 * Per-wallet USDC ledger — tracks deposits, escrow deductions, sale credits,
 * withdrawals and platform fees for both buyers and sellers.
 *
 * Fee policy:
 *   - 3% platform fee charged on sellers only, deducted at escrow release.
 *   - Fee is credited to the Tokenta treasury wallet in real-time.
 *   - Buyers pay face value; their balance is debited when they fund escrow.
 */

import { TREASURY_WALLET as TREASURY_WALLET_ADDR } from "../config/settlement-wallets.js";

/** Platform fee charged to seller on each settled trade — 3 %. */
export const PLATFORM_FEE_BPS = 300;

/** The Tokenta treasury address that receives all collected fees (from env). */
export const TREASURY_WALLET = TREASURY_WALLET_ADDR;

export type LedgerEventType =
  | "DEPOSIT"
  | "ESCROW_LOCK"      // buyer balance debited when escrow is funded
  | "ESCROW_REFUND"    // buyer balance refunded if escrow is cancelled
  | "SALE_CREDIT"      // seller receives net USDC after fee
  | "WITHDRAW"
  | "PLATFORM_FEE";    // treasury receives the 3 % fee

export interface LedgerEvent {
  id: string;
  wallet: string;
  type: LedgerEventType;
  amountUsdc: string;
  netUsdc?: string;
  orderId?: string;
  txHash?: string;
  at: string;
}

const events: LedgerEvent[] = [];
const availableByWallet = new Map<string, number>();

/** Treasury-specific ledger (fees only). */
const treasuryEvents: LedgerEvent[] = [];

function normWallet(w: string): string {
  return w.toLowerCase();
}

function addAvailable(wallet: string, delta: number): void {
  const key = normWallet(wallet);
  availableByWallet.set(key, Math.max(0, (availableByWallet.get(key) ?? 0) + delta));
}

export function computeOrderAmountUsdc(input: {
  askPriceUsdc: number;
  quotaToSell: number;
  mode: "BUYOUT" | "PARTIAL";
  quantity: number;
}): string {
  const units =
    input.mode === "BUYOUT" ? input.quotaToSell : Math.min(input.quantity, input.quotaToSell);
  const raw = (input.askPriceUsdc * units) / 1_000_000;
  return Math.max(0.01, raw).toFixed(2);
}

/**
 * Debits buyer's available balance when they fund an escrow.
 * Seeds an initial balance the first time a wallet is seen so demo/test
 * flows work without requiring a prior deposit call.
 */
export function deductBuyerFunds(
  buyerWallet: string,
  amountUsdc: string,
  orderId: string,
): { ok: boolean; error?: string } {
  const amount = Number(amountUsdc);
  if (amount <= 0) return { ok: false, error: "amount must be positive" };

  const key = normWallet(buyerWallet);
  // Seed a starting balance for new wallets so the demo flow always works.
  if (!availableByWallet.has(key)) {
    availableByWallet.set(key, 10_000);
  }
  const available = availableByWallet.get(key) ?? 0;
  if (amount > available + 0.001) {
    return {
      ok: false,
      error: `Insufficient USDC balance. Available: ${available.toFixed(2)}, required: ${amount.toFixed(2)}`,
    };
  }

  addAvailable(buyerWallet, -amount);
  const at = new Date().toISOString();
  events.push({
    id: `led_${Date.now()}_lock`,
    wallet: buyerWallet,
    type: "ESCROW_LOCK",
    amountUsdc: amount.toFixed(2),
    orderId,
    txHash: `0xescrow-lock-${orderId.slice(-8)}`,
    at,
  });
  return { ok: true };
}

/**
 * Refunds buyer if an escrow is cancelled before release.
 */
export function refundBuyer(
  buyerWallet: string,
  amountUsdc: string,
  orderId: string,
): void {
  const amount = Number(amountUsdc);
  addAvailable(buyerWallet, amount);
  events.push({
    id: `led_${Date.now()}_refund`,
    wallet: buyerWallet,
    type: "ESCROW_REFUND",
    amountUsdc: amount.toFixed(2),
    orderId,
    at: new Date().toISOString(),
  });
}

/**
 * Credits seller net USDC (gross minus 3 % fee) and credits the 3 % fee to
 * the Tokenta treasury wallet. Called after escrow release is confirmed.
 */
export function creditSellerOnEscrowRelease(input: {
  sellerWallet: string;
  grossUsdc: string;
  orderId: string;
  buyerWallet?: string | null;
  /** Real Base Sepolia tx hash for seller USDC transfer (on-chain release). */
  payoutTxHash?: string;
  /** Real Base Sepolia tx hash for treasury fee transfer. */
  feeTxHash?: string;
}): { netUsdc: string; feeUsdc: string; payoutTxHash: string; feeTxHash: string } {
  const gross = Number(input.grossUsdc);
  const feeRaw = (gross * PLATFORM_FEE_BPS) / 10_000;
  const fee = Number(feeRaw.toFixed(4));
  const net = Number((gross - fee).toFixed(2));
  const at = new Date().toISOString();
  const wallet = input.sellerWallet;
  const payoutTxHash =
    input.payoutTxHash && /^0x[a-fA-F0-9]{64}$/.test(input.payoutTxHash)
      ? input.payoutTxHash
      : `0xpayout-${input.orderId.slice(-10)}-${Date.now().toString(16)}`;
  const feeTxHash =
    input.feeTxHash && /^0x[a-fA-F0-9]{64}$/.test(input.feeTxHash)
      ? input.feeTxHash
      : `0xfee-${input.orderId.slice(-10)}-${Date.now().toString(16)}`;

  // Record fee deduction from seller perspective
  events.push({
    id: `led_${Date.now()}_fee`,
    wallet,
    type: "PLATFORM_FEE",
    amountUsdc: fee.toFixed(2),
    orderId: input.orderId,
    at,
  });

  // Credit seller net amount
  events.push({
    id: `led_${Date.now()}_sale`,
    wallet,
    type: "SALE_CREDIT",
    amountUsdc: gross.toFixed(2),
    netUsdc: net.toFixed(2),
    orderId: input.orderId,
    txHash: payoutTxHash,
    at,
  });

  addAvailable(wallet, net);

  // Credit treasury immediately — fee lands in real-time
  const feeEvent: LedgerEvent = {
    id: `led_${Date.now()}_treasury`,
    wallet: TREASURY_WALLET,
    type: "PLATFORM_FEE",
    amountUsdc: fee.toFixed(2),
    orderId: input.orderId,
    txHash: feeTxHash,
    at,
  };
  events.push(feeEvent);
  treasuryEvents.push(feeEvent);
  addAvailable(TREASURY_WALLET, fee);

  return { netUsdc: net.toFixed(2), feeUsdc: fee.toFixed(2), payoutTxHash, feeTxHash };
}

export function depositWallet(wallet: string, amountUsdc: string): LedgerEvent {
  const amount = Number(amountUsdc);
  addAvailable(wallet, amount);
  const ev: LedgerEvent = {
    id: `led_${Date.now()}_dep`,
    wallet,
    type: "DEPOSIT",
    amountUsdc: amount.toFixed(2),
    at: new Date().toISOString(),
  };
  events.push(ev);
  return ev;
}

export function withdrawWallet(
  wallet: string,
  amountUsdc: string,
): { ok: boolean; error?: string; txHash?: string; event?: LedgerEvent } {
  const amount = Number(amountUsdc);
  const key = normWallet(wallet);
  // Seed balance for first-time wallets
  if (!availableByWallet.has(key)) {
    availableByWallet.set(key, 0);
  }
  const available = availableByWallet.get(key) ?? 0;
  if (amount <= 0) return { ok: false, error: "amount must be positive" };
  if (amount > available + 0.0001) {
    return { ok: false, error: `insufficient balance (available ${available.toFixed(2)} USDC)` };
  }
  addAvailable(wallet, -amount);
  const txHash = `0xwithdraw-${wallet.slice(2, 10)}-${Date.now().toString(16)}`;
  const ev: LedgerEvent = {
    id: `led_${Date.now()}_wd`,
    wallet,
    type: "WITHDRAW",
    amountUsdc: amount.toFixed(2),
    txHash,
    at: new Date().toISOString(),
  };
  events.push(ev);
  return { ok: true, txHash, event: ev };
}

export function getWalletAvailableUsdc(wallet: string | null | undefined): number {
  if (!wallet) return 0;
  const key = normWallet(wallet);
  // Seed 10 000 USDC for first-time wallets so the demo works out of the box.
  if (!availableByWallet.has(key) && key !== normWallet(TREASURY_WALLET)) {
    availableByWallet.set(key, 10_000);
  }
  return availableByWallet.get(key) ?? 0;
}

export function getSellerIncomeSummary(wallet: string): {
  availableUsdc: string;
  lifetimeEarnedUsdc: string;
  pendingEscrowUsdc: string;
  saleCount: number;
} {
  const key = normWallet(wallet);
  const walletEvents = events.filter((e) => normWallet(e.wallet) === key);
  const sales = walletEvents.filter((e) => e.type === "SALE_CREDIT");
  const lifetime = sales.reduce((s, e) => s + Number(e.netUsdc ?? e.amountUsdc), 0);
  return {
    availableUsdc: (availableByWallet.get(key) ?? 0).toFixed(2),
    lifetimeEarnedUsdc: lifetime.toFixed(2),
    pendingEscrowUsdc: "0.00",
    saleCount: sales.length,
  };
}

export function listWalletLedgerEvents(wallet: string, limit = 30): LedgerEvent[] {
  return events
    .filter((e) => normWallet(e.wallet) === normWallet(wallet))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Returns the treasury wallet's current USDC balance. */
export function getTreasuryBalance(): number {
  return availableByWallet.get(normWallet(TREASURY_WALLET)) ?? 0;
}

/** Returns all fee events credited to the treasury, most-recent first. */
export function getTreasuryLedger(limit = 50): LedgerEvent[] {
  return [...treasuryEvents]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Total fees collected since server start. */
export function getTreasuryLifetimeFees(): number {
  return treasuryEvents.reduce((s, e) => s + Number(e.amountUsdc), 0);
}

export function resetSellerWalletLedgerForTest(): void {
  events.length = 0;
  treasuryEvents.length = 0;
  availableByWallet.clear();
}
