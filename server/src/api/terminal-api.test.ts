import { beforeEach, describe, expect, it } from "vitest";
import "../jobs/worker.js";
import app from "./server.js";
import { jobStore } from "../jobs/store.js";
import { resetTerminalSessionsForTest } from "../terminal/session-store.js";
import { resetTerminalOrdersForTest } from "../terminal/orders-store.js";
import { resetOrderRoomForTest } from "../terminal/order-room-store.js";
import { resetAnchorsForTest } from "../verification/proof-anchor.js";
import { pollJobUntilTerminal } from "../test/helpers.js";

const MOCK_KEY = "sk-mock-terminal-api-layer";

describe("terminal API", () => {
  beforeEach(() => {
    process.env.VERIFICATION_MOCK = "true";
    jobStore["jobs"].clear();
    resetTerminalSessionsForTest();
    resetTerminalOrdersForTest();
    resetOrderRoomForTest();
    resetAnchorsForTest();
  });

  it("GET /terminal/health and openapi", async () => {
    const health = await app.request("/api/v1/terminal/health");
    expect(health.status).toBe(200);
    const h = (await health.json()) as { layer: string };
    expect(h.layer).toBe("terminal");

    const oa = await app.request("/api/v1/terminal/openapi.json");
    expect(oa.status).toBe(200);
  });

  it("GET /terminal/timezone uses browser header", async () => {
    const res = await app.request("/api/v1/terminal/timezone", {
      headers: { "X-Timezone": "Asia/Singapore", "X-Timezone-Source": "browser" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { effectiveTimezone: string; source: string };
    expect(body.effectiveTimezone).toBe("Asia/Singapore");
    expect(body.source).toBe("browser");
  });

  it("POST /terminal/session stores timezone", async () => {
    const sess = await app.request("/api/v1/terminal/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Timezone": "Europe/Berlin" },
      body: JSON.stringify({ client: "test", timezone: "Europe/Berlin", timezoneSource: "browser" }),
    });
    expect(sess.status).toBe(201);
    const { sessionId, timezone } = (await sess.json()) as { sessionId: string; timezone: string };
    expect(timezone).toBe("Europe/Berlin");
    const tz = await app.request("/api/v1/terminal/timezone", {
      headers: { "X-Terminal-Session": sessionId },
    });
    const tzBody = (await tz.json()) as { effectiveTimezone: string; source: string };
    expect(tzBody.effectiveTimezone).toBe("Europe/Berlin");
    expect(tzBody.source).toBe("session");
  });

  it("POST /terminal/session and listings/run", async () => {
    const sess = await app.request("/api/v1/terminal/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Wallet-Address": "0xabc" },
      body: JSON.stringify({ client: "test" }),
    });
    expect(sess.status).toBe(201);
    const { sessionId } = (await sess.json()) as { sessionId: string };

    const run = await app.request("/api/v1/terminal/listings/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Terminal-Session": sessionId,
      },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 8000,
        askPriceUsdc: 5,
        providerKind: "openai",
      }),
    });
    expect(run.status).toBe(202);
    const body = (await run.json()) as { jobId: string; terminalJobId: string; listingId: string };
    expect(body.listingId).toBeTruthy();
    expect(body.terminalJobId).toContain("tjob_");

    await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      body.jobId,
    );

    const receipt = await app.request(`/api/v1/terminal/receipt/${body.terminalJobId}`);
    expect(receipt.status).toBe(200);
    const rec = (await receipt.json()) as { job_id: string; proof_hash: string | null };
    expect(rec.job_id).toBe(body.jobId);

    const exported = await app.request(`/api/v1/terminal/receipt/${body.terminalJobId}/export`);
    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-type") ?? "").toContain("text/markdown");
  });

  it("POST /terminal/run buyback mode", async () => {
    const res = await app.request("/api/v1/terminal/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "buyback",
        provider: "openai",
        declaredQuantity: 5000,
        credential: { apiKey: MOCK_KEY },
        buybackOfferId: "BB-001",
      }),
    });
    expect(res.status).toBe(202);
    const { terminalJobId } = (await res.json()) as { terminalJobId: string };
    const job = await app.request(`/api/v1/terminal/job/${terminalJobId}`);
    expect(job.status).toBe(200);
  });

  it("POST /terminal/orders/purchase", async () => {
    const listingRes = await app.request("/api/v1/terminal/listings/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MOCK_KEY,
        quotaToSell: 1000,
        askPriceUsdc: 1,
      }),
    });
    const { listingId } = (await listingRes.json()) as { listingId: string };

    const purchase = await app.request("/api/v1/terminal/orders/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Wallet-Address": "0xbuyer" },
      body: JSON.stringify({ listingId, mode: "BUYOUT", amountUsdc: "10" }),
    });
    expect(purchase.status).toBe(201);
    const { orderId } = (await purchase.json()) as { orderId: string };
    const order = await app.request(`/api/v1/terminal/orders/${orderId}`);
    expect(order.status).toBe(200);

    const list = await app.request("/api/v1/terminal/orders");
    expect(list.status).toBe(200);
    const lbody = (await list.json()) as { orders: { orderId: string }[] };
    expect(lbody.orders.some((o) => o.orderId === orderId)).toBe(true);

    const byWallet = await app.request("/api/v1/terminal/orders?wallet=0xbuyer");
    expect(byWallet.status).toBe(200);
    const wbody = (await byWallet.json()) as { orders: { buyerWallet: string | null }[] };
    expect(wbody.orders.every((o) => o.buyerWallet === "0xbuyer")).toBe(true);
  });

  it("GET /terminal/network returns Base Sepolia config", async () => {
    const prevRpc = process.env.SETTLEMENT_RPC_URL;
    process.env.SETTLEMENT_RPC_URL = "https://sepolia.base.org";
    process.env.SETTLEMENT_CHAIN_ID = "84532";
    const res = await app.request("/api/v1/terminal/network");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      network: string;
      chainId: number;
      explorerUrl: string;
      connected?: boolean;
    };
    expect(body.network).toBe("base-sepolia");
    expect(body.chainId).toBe(84532);
    expect(body.explorerUrl).toContain("basescan");
    if (prevRpc === undefined) delete process.env.SETTLEMENT_RPC_URL;
    else process.env.SETTLEMENT_RPC_URL = prevRpc;
  });

  it("GET reputation, wallet, analytics read APIs", async () => {
    const rep = await app.request("/api/v1/terminal/reputation", {
      headers: { "X-Wallet-Address": "0xabc" },
    });
    expect(rep.status).toBe(200);
    const repBody = (await rep.json()) as {
      status: string;
      tier: string;
      composite: number | null;
      compositeDisplay: string;
      confidence: string;
      factors: unknown[];
    };
    expect(repBody.status).toBe("UNVERIFIED");
    expect(repBody.tier).toBe("NONE");
    expect(repBody.composite).toBeNull();
    expect(repBody.compositeDisplay).toBe("--");
    expect(repBody.confidence).toBeDefined();
    expect(repBody.factors.length).toBe(5);

    const ledger = await app.request("/api/v1/terminal/reputation/ledger");
    expect(ledger.status).toBe(200);

    const wallet = await app.request("/api/v1/terminal/wallet/summary");
    expect(wallet.status).toBe(200);
    const wBody = (await wallet.json()) as { balances: unknown[] };
    expect(wBody.balances.length).toBeGreaterThan(0);

    const analytics = await app.request("/api/v1/terminal/analytics/overview?mode=BUY");
    expect(analytics.status).toBe(200);
    const aBody = (await analytics.json()) as { flow: unknown[]; counterparties: unknown[] };
    expect(aBody.flow.length).toBeGreaterThan(0);
  });

  it("order room messages and actions are wired", async () => {
    const listingRes = await app.request("/api/v1/terminal/listings/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: MOCK_KEY, quotaToSell: 1000, askPriceUsdc: 1 }),
    });
    const { listingId } = (await listingRes.json()) as { listingId: string };
    const purchase = await app.request("/api/v1/terminal/orders/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Wallet-Address": "0xbuyer2" },
      body: JSON.stringify({ listingId, mode: "BUYOUT", amountUsdc: "10" }),
    });
    const { orderId } = (await purchase.json()) as { orderId: string };

    const send = await app.request(`/api/v1/terminal/orders/${orderId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "hello order room", from: "YOU" }),
    });
    expect(send.status).toBe(201);

    const action = await app.request(`/api/v1/terminal/orders/${orderId}/actions/run-reverify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: MOCK_KEY }),
    });
    expect(action.status).toBe(200);
    const actionBody = (await action.json()) as { jobId?: string };
    expect(actionBody.jobId).toBeTruthy();

    const list = await app.request(`/api/v1/terminal/orders/${orderId}/messages`);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { messages: { body: string }[] };
    expect(listBody.messages.length).toBeGreaterThan(0);
  });

  it("POST /terminal/run/{id}/cancel marks queued job cancelled", async () => {
    const job = jobStore.create({
      context: "LISTING_DRAFT",
      provider: "openai",
      apiKey: "sk-mock-cancel-job",
      declaredQuantity: 1000,
      claimedModel: "gpt-4o-mini",
      costLiability: "SELLER_PAID",
    });
    const terminalJobId = `tjob_${job.id}`;
    const cancel = await app.request(`/api/v1/terminal/run/${terminalJobId}/cancel`, {
      method: "POST",
    });
    expect(cancel.status).toBe(200);
    const body = (await cancel.json()) as { status: string };
    expect(body.status).toBe("cancelled");

    const read = await app.request(`/api/v1/terminal/job/${terminalJobId}`);
    const rbody = (await read.json()) as { status: string };
    expect(rbody.status).toBe("cancelled");
  });

  it("POST /terminal/anchor/{hash}/submit returns 502 on treasury signer misconfig", async () => {
    const prevKey = process.env.TREASURY_PRIVATE_KEY;
    const prevRpc = process.env.SETTLEMENT_RPC_URL;
    const prevContract = process.env.SETTLEMENT_CONTRACT_ADDRESS;
    const prevDry = process.env.SETTLEMENT_DRY_RUN;
    process.env.SETTLEMENT_DRY_RUN = "false";
    process.env.TREASURY_PRIVATE_KEY = "0x1234";
    process.env.SETTLEMENT_RPC_URL = "https://example-rpc.invalid";
    process.env.SETTLEMENT_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001";

    const run = await app.request("/api/v1/terminal/listings/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: MOCK_KEY, quotaToSell: 1000, askPriceUsdc: 1 }),
    });
    const { jobId } = (await run.json()) as { jobId: string };
    const finished = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );
    expect(finished.proof?.proofHash).toBeTruthy();
    const proofHash = finished.proof!.proofHash;

    const anchor = await app.request(`/api/v1/terminal/anchor/${proofHash}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminalJobId: `tjob_${jobId}` }),
    });
    expect(anchor.status).toBe(502);

    if (prevKey === undefined) delete process.env.TREASURY_PRIVATE_KEY;
    else process.env.TREASURY_PRIVATE_KEY = prevKey;
    if (prevRpc === undefined) delete process.env.SETTLEMENT_RPC_URL;
    else process.env.SETTLEMENT_RPC_URL = prevRpc;
    if (prevContract === undefined) delete process.env.SETTLEMENT_CONTRACT_ADDRESS;
    else process.env.SETTLEMENT_CONTRACT_ADDRESS = prevContract;
    if (prevDry === undefined) delete process.env.SETTLEMENT_DRY_RUN;
    else process.env.SETTLEMENT_DRY_RUN = prevDry;
  });

  it("POST /terminal/anchor/reconcile returns summary", async () => {
    const res = await app.request("/api/v1/terminal/anchor/reconcile", { method: "POST" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { checked: number; confirmed: number; failed: number };
    expect(body).toHaveProperty("checked");
    expect(body).toHaveProperty("confirmed");
    expect(body).toHaveProperty("failed");
  });

  it("POST /terminal/anchor/{hash}/submit is idempotent once anchored", async () => {
    const prevDry = process.env.SETTLEMENT_DRY_RUN;
    const prevSigner = process.env.TREASURY_PRIVATE_KEY;
    const prevRpc = process.env.SETTLEMENT_RPC_URL;
    const prevAnchorRpc = process.env.PROOF_ANCHOR_RPC_URL;
    const prevContract = process.env.SETTLEMENT_CONTRACT_ADDRESS;
    process.env.SETTLEMENT_DRY_RUN = "false";
    delete process.env.TREASURY_PRIVATE_KEY;
    delete process.env.SETTLEMENT_RPC_URL;
    delete process.env.PROOF_ANCHOR_RPC_URL;
    delete process.env.SETTLEMENT_CONTRACT_ADDRESS;

    const run = await app.request("/api/v1/terminal/listings/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: MOCK_KEY, quotaToSell: 1000, askPriceUsdc: 1 }),
    });
    const { jobId } = (await run.json()) as { jobId: string };
    const finished = await pollJobUntilTerminal(
      (id) => app.request(`/api/v1/verification/jobs/${id}`),
      jobId,
    );
    const proofHash = finished.proof!.proofHash;

    const first = await app.request(`/api/v1/terminal/anchor/${proofHash}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminalJobId: `tjob_${jobId}` }),
    });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { txHash?: string | null; anchorStatus: string };
    expect(firstBody.anchorStatus).toBe("confirmed");

    const second = await app.request(`/api/v1/terminal/anchor/${proofHash}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminalJobId: `tjob_${jobId}` }),
    });
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { idempotent?: boolean; txHash?: string | null };
    expect(secondBody.idempotent).toBe(true);
    expect(secondBody.txHash).toBe(firstBody.txHash);

    if (prevDry === undefined) delete process.env.SETTLEMENT_DRY_RUN;
    else process.env.SETTLEMENT_DRY_RUN = prevDry;
    if (prevSigner === undefined) delete process.env.TREASURY_PRIVATE_KEY;
    else process.env.TREASURY_PRIVATE_KEY = prevSigner;
    if (prevRpc === undefined) delete process.env.SETTLEMENT_RPC_URL;
    else process.env.SETTLEMENT_RPC_URL = prevRpc;
    if (prevAnchorRpc === undefined) delete process.env.PROOF_ANCHOR_RPC_URL;
    else process.env.PROOF_ANCHOR_RPC_URL = prevAnchorRpc;
    if (prevContract === undefined) delete process.env.SETTLEMENT_CONTRACT_ADDRESS;
    else process.env.SETTLEMENT_CONTRACT_ADDRESS = prevContract;
  });
});
