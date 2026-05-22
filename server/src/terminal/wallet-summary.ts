import { listAudit } from "../security/audit-log.js";
import { listTerminalOrders } from "./orders-store.js";
import { listEscrows } from "../orders/escrow.js";
import { jobStore } from "../jobs/store.js";

export interface WalletBalanceRow {
  asset: string;
  total: string;
  available: string;
  escrowed: string;
  staked: string;
  valueUsdc: string;
}

export interface SettlementStreamRow {
  ts: string;
  type: string;
  reference: string;
  amount: string;
  currency: string;
}

export interface WalletStakeView {
  reputationBondUsdc: string;
  sellerCollateralUsdc: string;
  validatorStakeTknt: string;
  estAprPct: string;
  slashRisk: string;
}

export interface WalletSummaryView {
  balances: WalletBalanceRow[];
  settlementStream: SettlementStreamRow[];
  stake: WalletStakeView;
  network: string;
  depositEtaSec: number;
}

function sumEscrowed(): number {
  return listEscrows()
    .filter((e) => e.status === "FUNDED")
    .reduce((s, e) => s + Number(e.amountUsdc || 0), 0);
}

export function buildWalletSummary(walletAddress?: string | null): WalletSummaryView {
  const escrows = listEscrows();
  const orders = listTerminalOrders(100);
  const walletOrders = walletAddress
    ? orders.filter((o) => o.buyerWallet?.toLowerCase() === walletAddress.toLowerCase())
    : orders;

  const escrowedTotal = sumEscrowed();
  const orderVolume = walletOrders.reduce((s, o) => s + Number(o.amountUsdc || 0), 0);
  const available = Math.max(0, 12_484.2 - escrowedTotal);
  const totalUsdc = available + escrowedTotal;

  const jobs = jobStore.listJobs();
  const apiQuotaLocked = jobs.filter((j) => j.listingId && j.status === "PASSED").length * 100;

  const balances: WalletBalanceRow[] = [
    {
      asset: "USDC",
      total: totalUsdc.toFixed(2),
      available: available.toFixed(2),
      escrowed: escrowedTotal.toFixed(2),
      staked: "344.84",
      valueUsdc: totalUsdc.toFixed(2),
    },
    {
      asset: "ETH",
      total: "4.2104",
      available: "3.9100",
      escrowed: "0.0000",
      staked: "0.3004",
      valueUsdc: "13210.18",
    },
    {
      asset: "TKNT",
      total: "18402",
      available: "12402",
      escrowed: "0",
      staked: "6000",
      valueUsdc: "9201.00",
    },
    {
      asset: "API-QUOTA",
      total: String(apiQuotaLocked || 2400),
      available: "0",
      escrowed: String(apiQuotaLocked || 2400),
      staked: "0",
      valueUsdc: orderVolume.toFixed(2),
    },
  ];

  const settlementStream: SettlementStreamRow[] = [];
  for (const entry of listAudit(30)) {
    if (entry.type === "ESCROW_FUND") {
      settlementStream.push({
        ts: entry.at.slice(11, 16),
        type: "ESCROW",
        reference: entry.orderId ?? "—",
        amount: `-${entry.amountUsdc ?? "0.00"}`,
        currency: "USDC",
      });
    } else if (entry.type === "ESCROW_RELEASE") {
      settlementStream.push({
        ts: entry.at.slice(11, 16),
        type: "RELEASE",
        reference: entry.orderId ?? "—",
        amount: `+${entry.amountUsdc ?? "0.00"}`,
        currency: "USDC",
      });
    } else if (entry.type === "BIND_VERIFICATION") {
      settlementStream.push({
        ts: entry.at.slice(11, 16),
        type: "SETTLE",
        reference: entry.listingId ?? entry.jobId ?? "—",
        amount: "+0.00",
        currency: "USDC",
      });
    }
  }

  for (const e of escrows.slice(-10)) {
    if (e.fundedAt && !settlementStream.some((s) => s.reference === e.orderId && s.type === "ESCROW")) {
      settlementStream.push({
        ts: e.fundedAt.slice(11, 16),
        type: "ESCROW",
        reference: e.orderId,
        amount: `-${e.amountUsdc}`,
        currency: "USDC",
      });
    }
    if (e.releasedAt) {
      settlementStream.push({
        ts: e.releasedAt.slice(11, 16),
        type: "RELEASE",
        reference: e.orderId,
        amount: `+${e.amountUsdc}`,
        currency: "USDC",
      });
    }
  }

  settlementStream.sort((a, b) => b.ts.localeCompare(a.ts));

  return {
    balances,
    settlementStream: settlementStream.slice(0, 20),
    stake: {
      reputationBondUsdc: "344.84",
      sellerCollateralUsdc: (escrowedTotal * 2 || 2100).toFixed(2),
      validatorStakeTknt: "6000",
      estAprPct: "11.4",
      slashRisk: escrowedTotal > 500 ? "MEDIUM" : "LOW",
    },
    network: process.env.SETTLEMENT_NETWORK ?? "base-sepolia",
    depositEtaSec: 12,
  };
}
