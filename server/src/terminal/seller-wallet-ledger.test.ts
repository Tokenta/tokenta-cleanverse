import { describe, expect, it, beforeEach } from "vitest";
import {
  computeOrderAmountUsdc,
  creditSellerOnEscrowRelease,
  depositWallet,
  withdrawWallet,
  getWalletAvailableUsdc,
  resetSellerWalletLedgerForTest,
} from "./seller-wallet-ledger.js";

describe("seller-wallet-ledger", () => {
  beforeEach(() => resetSellerWalletLedgerForTest());

  it("computes partial order amount from ask price", () => {
    const amt = computeOrderAmountUsdc({
      askPriceUsdc: 5,
      quotaToSell: 1_000_000,
      mode: "PARTIAL",
      quantity: 500_000,
    });
    expect(Number(amt)).toBe(2.5);
  });

  it("credits seller on release and allows withdraw", () => {
    creditSellerOnEscrowRelease({
      sellerWallet: "0xSeller0000000000000000000000000001",
      grossUsdc: "100.00",
      orderId: "ord_test",
    });
    expect(getWalletAvailableUsdc("0xSeller0000000000000000000000000001")).toBe(97);
    const wd = withdrawWallet("0xSeller0000000000000000000000000001", "50.00");
    expect(wd.ok).toBe(true);
    expect(getWalletAvailableUsdc("0xSeller0000000000000000000000000001")).toBe(47);
  });

  it("deposit increases available balance", () => {
    depositWallet("0xBuyer00000000000000000000000000001", "200.00");
    expect(getWalletAvailableUsdc("0xBuyer00000000000000000000000000001")).toBe(200);
  });
});
