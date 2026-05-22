import { PrismaClient } from "@prisma/client";
import {
  AssetStatus,
  AssetType,
  ChatSenderType,
  EscrowStatus,
  LedgerEntryType,
  OrderBookSide,
  OrderSide,
  OrderStatus,
  PreferredRole,
  VerificationMethod,
  VerifyResult,
  VerifyStepType,
} from "@prisma/client";

const prisma = new PrismaClient();

const PROVIDERS = [
  { slug: "NEXUS-LABS", name: "Nexus Labs" },
  { slug: "ANTHROPIC-R", name: "Anthropic Reserve" },
  { slug: "META-OSS", name: "Meta OSS" },
  { slug: "CORE-WEAVE", name: "CoreWeave" },
  { slug: "OPENAI-RES", name: "OpenAI Reserve" },
  { slug: "STABILITY", name: "Stability" },
  { slug: "LAMBDA-LBS", name: "Lambda Labs" },
  { slug: "MISTRAL-AI", name: "Mistral AI" },
];

const ASSETS = [
  { publicId: "AST-001", ticker: "GPT4-CMP", type: AssetType.COMPUTE, provider: "NEXUS-LABS", supply: "12400", unit: "TFLOP-h", price: "0.0420", change: "2.41", volume: "184200", verify: VerificationMethod.ZK_PROOF, uptime: "99.97" },
  { publicId: "AST-002", ticker: "CLAUDE-API", type: AssetType.API_QUOTA, provider: "ANTHROPIC-R", supply: "8200", unit: "M-tokens", price: "0.0185", change: "-0.84", volume: "92700", verify: VerificationMethod.TEE_ATTEST, uptime: "99.99" },
  { publicId: "AST-003", ticker: "LLAMA70-W", type: AssetType.MODEL_ACCESS, provider: "META-OSS", supply: "3840", unit: "seats", price: "1.2400", change: "5.17", volume: "47300", verify: VerificationMethod.SIGNATURE, uptime: "99.84" },
  { publicId: "AST-004", ticker: "H100-PRV", type: AssetType.COMPUTE, provider: "CORE-WEAVE", supply: "640", unit: "GPU-h", price: "3.8700", change: "0.92", volume: "212000", verify: VerificationMethod.ZK_PROOF, uptime: "99.92" },
  { publicId: "AST-005", ticker: "EMBED-V3", type: AssetType.API_QUOTA, provider: "OPENAI-RES", supply: "21000", unit: "M-tokens", price: "0.0007", change: "-1.20", volume: "63400", verify: VerificationMethod.TEE_ATTEST, uptime: "99.95" },
  { publicId: "AST-006", ticker: "SDXL-INF", type: AssetType.MODEL_ACCESS, provider: "STABILITY", supply: "5200", unit: "img-1K", price: "0.0920", change: "3.04", volume: "38900", verify: VerificationMethod.SIGNATURE, uptime: "99.71" },
  { publicId: "AST-007", ticker: "A100-SPOT", type: AssetType.COMPUTE, provider: "LAMBDA-LBS", supply: "1280", unit: "GPU-h", price: "2.1400", change: "-2.18", volume: "156800", verify: VerificationMethod.ZK_PROOF, uptime: "99.88" },
  { publicId: "AST-008", ticker: "MISTRAL-L", type: AssetType.MODEL_ACCESS, provider: "MISTRAL-AI", supply: "2400", unit: "seats", price: "0.8400", change: "1.62", volume: "29100", verify: VerificationMethod.TEE_ATTEST, uptime: "99.93" },
];

const ORDERS = [
  { publicId: "ORD-78214", side: OrderSide.BUY, asset: "GPT4-CMP", qty: "2400", price: "0.0420", value: "100.80", escrow: EscrowStatus.FUNDED, status: OrderStatus.VERIFYING, buyer: "0x8afe120000000000000000000000000000000001", seller: "0x8afe120000000000000000000000000000000002" },
  { publicId: "ORD-78201", side: OrderSide.BUY, asset: "H100-PRV", qty: "12", price: "3.8700", value: "46.44", escrow: EscrowStatus.FUNDED, status: OrderStatus.DELIVERING, buyer: "0x8afe120000000000000000000000000000000001", seller: "0x8afe120000000000000000000000000000000003" },
  { publicId: "ORD-78188", side: OrderSide.SELL, asset: "CLAUDE-API", qty: "500", price: "0.0185", value: "9.25", escrow: EscrowStatus.RELEASED, status: OrderStatus.SETTLED, buyer: "0x8afe120000000000000000000000000000000004", seller: "0x8afe120000000000000000000000000000000001" },
  { publicId: "ORD-78174", side: OrderSide.BUY, asset: "LLAMA70-W", qty: "4", price: "1.2400", value: "4.96", escrow: EscrowStatus.FUNDED, status: OrderStatus.DISPUTED, buyer: "0x8afe120000000000000000000000000000000001", seller: "0x8afe120000000000000000000000000000000005" },
  { publicId: "ORD-78160", side: OrderSide.SELL, asset: "EMBED-V3", qty: "8000", price: "0.0007", value: "5.60", escrow: EscrowStatus.RELEASED, status: OrderStatus.SETTLED, buyer: "0x8afe120000000000000000000000000000000006", seller: "0x8afe120000000000000000000000000000000001" },
  { publicId: "ORD-78142", side: OrderSide.BUY, asset: "A100-SPOT", qty: "40", price: "2.1400", value: "85.60", escrow: EscrowStatus.PENDING, status: OrderStatus.MATCHING, buyer: "0x8afe120000000000000000000000000000000001", seller: null },
];

const VERIFY_FEED = [
  { asset: "GPT4-CMP", step: VerifyStepType.ZK_PROOF, hash: "0x9af241bc", result: VerifyResult.PASS, latency: 184 },
  { asset: "H100-PRV", step: VerifyStepType.ATTEST_Q, hash: "0x44d17e2a", result: VerifyResult.PASS, latency: 92 },
  { asset: "CLAUDE-API", step: VerifyStepType.QUOTA_CHK, hash: "0x10cdff09", result: VerifyResult.PASS, latency: 61 },
];

const REPUTATION = [
  { actor: "NEXUS-LABS", event: "DELIVERY-ON-TIME", delta: "0.12", score: "98.41" },
  { actor: "CORE-WEAVE", event: "UPTIME-SLA-MET", delta: "0.08", score: "97.92" },
  { actor: "STABILITY", event: "VERIFY-PASS-STREAK-100", delta: "0.40", score: "94.18" },
];

const CHAT = [
  { from: ChatSenderType.SYSTEM, body: "Order ORD-78214 escrow funded · 100.80 USDC locked" },
  { from: ChatSenderType.SELLER, body: "Acknowledged. Initiating delivery pipeline." },
  { from: ChatSenderType.SYSTEM, body: "ZK-PROOF batch #4421 submitted for verification" },
  { from: ChatSenderType.BUYER, body: "Confirmed on-chain. Awaiting quota allocation." },
];

const PRICE_SERIES = [
  0.0411, 0.0413, 0.0412, 0.0415, 0.0418, 0.0416, 0.0419, 0.0421, 0.0420, 0.0418,
  0.0417, 0.0419, 0.0422, 0.0424, 0.0423, 0.0421, 0.0420, 0.0418, 0.0419, 0.0420,
];

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.orderLifecycleEvent.deleteMany();
  await prisma.escrowEvent.deleteMany();
  await prisma.orderDispute.deleteMany();
  await prisma.walletLedgerEntry.deleteMany();
  await prisma.verificationEvent.deleteMany();
  await prisma.verificationJob.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderBookLevel.deleteMany();
  await prisma.assetPriceTick.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.apiListingCredential.deleteMany();
  await prisma.apiListing.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.reputationProfile.deleteMany();
  await prisma.platformMetricSnapshot.deleteMany();
  await prisma.walletBalance.deleteMany();
  await prisma.terminalPreference.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.apiProvider.deleteMany();

  const providerMap = new Map<string, string>();
  for (const p of PROVIDERS) {
    const row = await prisma.apiProvider.create({ data: p });
    providerMap.set(p.slug, row.id);
  }

  const assetMap = new Map<string, string>();
  for (const a of ASSETS) {
    const row = await prisma.asset.create({
      data: {
        publicId: a.publicId,
        ticker: a.ticker,
        assetType: a.type,
        providerId: providerMap.get(a.provider)!,
        supplyAmount: a.supply,
        supplyUnit: a.unit,
        priceUsdc: a.price,
        change24hPct: a.change,
        volume24hUsdc: a.volume,
        verificationMethod: a.verify,
        uptimePct: a.uptime,
        status: AssetStatus.LIVE,
      },
    });
    assetMap.set(a.ticker, row.id);

    let rank = 1;
    for (const bid of [
      { price: "0.0419", size: "1200", total: "50.28" },
      { price: "0.0418", size: "3400", total: "142.12" },
    ]) {
      if (a.ticker !== "GPT4-CMP") break;
      await prisma.orderBookLevel.create({
        data: {
          assetId: row.id,
          side: OrderBookSide.BID,
          priceUsdc: bid.price,
          sizeAmount: bid.size,
          totalUsdc: bid.total,
          levelRank: rank++,
        },
      });
    }
    rank = 1;
    for (const ask of [
      { price: "0.0421", size: "900", total: "37.89" },
      { price: "0.0422", size: "2800", total: "118.16" },
    ]) {
      if (a.ticker !== "GPT4-CMP") break;
      await prisma.orderBookLevel.create({
        data: {
          assetId: row.id,
          side: OrderBookSide.ASK,
          priceUsdc: ask.price,
          sizeAmount: ask.size,
          totalUsdc: ask.total,
          levelRank: rank++,
        },
      });
    }

    if (a.ticker === "GPT4-CMP") {
      for (const price of PRICE_SERIES) {
        await prisma.assetPriceTick.create({
          data: { assetId: row.id, priceUsdc: price },
        });
      }
    }
  }

  const demoWallet = await prisma.wallet.create({
    data: {
      address: "0x8c42af0000000000000000000000000000000001",
      preferredRole: PreferredRole.SELLER,
      balance: {
        create: {
          availableUsdc: "12484.20",
          escrowedUsdc: "247.00",
          stakedUsdc: "344.84",
          reputationBondUsdc: "344.84",
          sellerCollateralUsdc: "2100.00",
        },
      },
      terminalPreferences: { create: { tourCompleted: false, tourVersion: "tokenta-terminal-tour-v1" } },
    },
  });

  const walletByAddress = new Map<string, string>();
  walletByAddress.set(demoWallet.address, demoWallet.id);

  async function walletId(addr: string) {
    if (walletByAddress.has(addr)) return walletByAddress.get(addr)!;
    const w = await prisma.wallet.create({
      data: { address: addr, preferredRole: PreferredRole.BUYER },
    });
    walletByAddress.set(addr, w.id);
    return w.id;
  }

  for (const o of ORDERS) {
    const assetId = assetMap.get(o.asset)!;
    const buyerId = o.buyer ? await walletId(o.buyer) : null;
    const sellerId = o.seller ? await walletId(o.seller) : null;

    const order = await prisma.order.create({
      data: {
        publicId: o.publicId,
        assetId,
        buyerWalletId: buyerId,
        sellerWalletId: sellerId,
        side: o.side,
        quantity: o.qty,
        quantityUnit: ASSETS.find((a) => a.ticker === o.asset)!.unit,
        limitPriceUsdc: o.price,
        totalValueUsdc: o.value,
        escrowStatus: o.escrow,
        status: o.status,
        verifyStepsDone: o.publicId === "ORD-78214" ? 2 : o.status === OrderStatus.SETTLED ? 3 : 0,
        lifecycleEvents: {
          create:
            o.publicId === "ORD-78214"
              ? [
                  { label: "ESCROW FUNDED", statusLabel: "DONE" },
                  { label: "VERIFY STEP 1/3", statusLabel: "DONE" },
                  { label: "VERIFY STEP 2/3", statusLabel: "DONE" },
                  { label: "VERIFY STEP 3/3", statusLabel: "ACTIVE" },
                ]
              : [],
        },
        escrowEvents: {
          create:
            o.escrow === EscrowStatus.FUNDED
              ? [{ status: EscrowStatus.FUNDED, amountUsdc: o.value, note: "Escrow lock" }]
              : o.escrow === EscrowStatus.RELEASED
                ? [
                    { status: EscrowStatus.FUNDED, amountUsdc: o.value },
                    { status: EscrowStatus.RELEASED, amountUsdc: o.value },
                  ]
                : [],
        },
        chatRoom: { create: {} },
      },
    });

    if (o.publicId === "ORD-78214") {
      const room = await prisma.chatRoom.findUniqueOrThrow({ where: { orderId: order.id } });
      for (const m of CHAT) {
        await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            senderType: m.from,
            senderWalletId: m.from === ChatSenderType.BUYER ? buyerId : m.from === ChatSenderType.SELLER ? sellerId : null,
            bodyPlain: m.body,
          },
        });
      }
    }

    if (o.status === OrderStatus.DISPUTED) {
      await prisma.orderDispute.create({
        data: { orderId: order.id, reason: "Delivery SLA miss" },
      });
    }
  }

  for (const v of VERIFY_FEED) {
    await prisma.verificationEvent.create({
      data: {
        assetId: assetMap.get(v.asset)!,
        stepType: v.step,
        proofHash: v.hash,
        result: v.result,
        latencyMs: v.latency,
      },
    });
  }

  for (const r of REPUTATION) {
    const profile = await prisma.reputationProfile.create({
      data: {
        actorSlug: r.actor,
        displayName: r.actor,
        score: r.score,
      },
    });
    await prisma.reputationEvent.create({
      data: {
        profileId: profile.id,
        eventCode: r.event,
        delta: r.delta,
        scoreAfter: r.score,
      },
    });
  }

  await prisma.platformMetricSnapshot.createMany({
    data: [
      { metricKey: "VERIFY_THROUGHPUT", value: "421/s", deltaLabel: "+0.4%" },
      { metricKey: "ESCROW_TVL", value: "2.41M USDC", deltaLabel: "+1.2%" },
      { metricKey: "DISPUTE_RATIO", value: "0.21%", deltaLabel: "-0.04%" },
    ],
  });

  await prisma.walletLedgerEntry.createMany({
    data: [
      { walletId: demoWallet.id, entryType: LedgerEntryType.SETTLE, amountUsdc: "5.60", note: "ORD-78160" },
      { walletId: demoWallet.id, entryType: LedgerEntryType.ESCROW, amountUsdc: "-100.80", note: "ORD-78214" },
      { walletId: demoWallet.id, entryType: LedgerEntryType.STAKE, amountUsdc: "-344.84", note: "REP-BOND" },
    ],
  });

  console.log("Seed complete:", {
    providers: PROVIDERS.length,
    assets: ASSETS.length,
    orders: ORDERS.length,
    demoWallet: demoWallet.address,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
