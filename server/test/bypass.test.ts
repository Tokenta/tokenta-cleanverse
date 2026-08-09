import { describe, it, expect, beforeAll, vi } from 'vitest';
import app from '../src/api/server.js';
import { createTerminalOrder } from '../src/terminal/orders-store.js';

vi.mock("../src/integrations/cleanverse/CVASettlementAdapter.js", () => ({
  CVASettlementAdapter: vi.fn().mockImplementation(() => ({
    evaluateSettlement: vi.fn().mockResolvedValue({ state: "APPROVED" }),
    prepareTransfer: vi.fn().mockReturnValue({ to: "0xMock", data: "0xMock", chainId: 10143 })
  })),
  SettlementState: { APPROVED: "APPROVED", POLICY_DENIED: "POLICY_DENIED" }
}));

vi.mock("../src/services/ComplianceOrchestrator.js", () => ({
  ComplianceOrchestrator: vi.fn().mockImplementation(() => ({
    evaluateTradeCompliance: vi.fn().mockImplementation(async (buyerWallet) => {
      if (buyerWallet === '0xD866adE25c35d68d3Bd9d6446cF155d6Ac9A5d41') {
        return { overallDecision: 'DENIED', reasonCodes: ['BUYER_IDENTITY_UNVERIFIED'] };
      }
      return { overallDecision: 'APPROVED' };
    })
  }))
}));

import { createTerminalOrder } from '../src/terminal/orders-store.js';

describe('Server-Side Compliance Bypass Test', () => {
  const BUYER_WALLET_UNVERIFIED = '0xD866adE25c35d68d3Bd9d6446cF155d6Ac9A5d41';
  const BUYER_WALLET_VERIFIED = '0x1111111111111111111111111111111111111111';
  const SELLER_WALLET = '0x2222222222222222222222222222222222222222';
  
  let unverifiedOrderId = '';
  let verifiedOrderId = '';

  beforeAll(() => {
    process.env.CLEANVERSE_API_ID = 'APP20260614112550LIDZXM';
    process.env.CLEANVERSE_API_KEY = 'test-cleanverse-key';

    // Mock the order for unverified buyer
    const o1 = createTerminalOrder({
      listingId: 'mock-listing',
      buyerWallet: BUYER_WALLET_UNVERIFIED,
      sellerWallet: SELLER_WALLET,
      mode: 'BUYOUT',
      quantity: 1,
      amountUsdc: '100',
    });
    unverifiedOrderId = o1.orderId;

    // Mock the order for verified buyer
    const o2 = createTerminalOrder({
      listingId: 'mock-listing',
      buyerWallet: BUYER_WALLET_VERIFIED,
      sellerWallet: SELLER_WALLET,
      mode: 'BUYOUT',
      quantity: 1,
      amountUsdc: '100',
    });
    verifiedOrderId = o2.orderId;
  });

  it('should block POST /escrow/fund for UNVERIFIED buyer', async () => {
    const res = await app.request(`/api/v1/orders/${unverifiedOrderId}/escrow/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUsdc: '100' }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Cleanverse Compliance Denied');
    expect(data.code).toBe('COMPLIANCE_DENIED');
    expect(data.compliance.overallDecision).toBe('DENIED');
  });

  it('should allow POST /escrow/fund for VERIFIED buyer', async () => {
    // This assumes the verified wallet passes Cleanverse checks in Sandbox
    const res = await app.request(`/api/v1/orders/${verifiedOrderId}/escrow/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountUsdc: '100' }),
    });

    const data = await res.json();
    if (res.status === 403) {
      console.log('UNEXPECTED 403 DATA:', JSON.stringify(data, null, 2));
    }
    
    // If it allows it, it returns 201 or fails on some other business logic
    expect(res.status).not.toBe(403);
    expect(data.code).not.toBe('COMPLIANCE_DENIED');
  });
});
