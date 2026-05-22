import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ShieldCheck, Lock, ArrowUpRight, ArrowDownRight, ChevronRight,
  MessagesSquare, Activity, KeyRound, Check,
} from "lucide-react";
import type { TradingMode } from "../trading-types";
import { useTokentaWallet } from "../hooks/useTokentaWallet";
import { useAuth } from "../auth/AuthContext";
type Role = TradingMode;
import { orders, verifyFeed } from "./tokenta-data";
import {
  purchaseListingTerminal,
  confirmTokentaBuyback,
  createPrePurchaseVerification,
  createVerificationJob,
  fetchOrderVerificationTrail,
  fetchProofAnchor,
  fetchTerminalReceipt,
  fetchVerificationProof,
  proofDownloadUrl,
  submitTerminalAnchor,
  fetchTerminalNetwork,
  explorerTxUrl,
  type ProofAnchorStatus,
  type VerificationProof,
  type VerificationTrailEntry,
} from "../api/verification";
import { VerificationJobPanel } from "./VerificationJobPanel";
import type { BuybackOffer } from "../trading-types";

type Asset = {
  id: string;
  listingId?: string;
  ticker: string;
  type: string;
  provider: string;
  supply: string;
  unit: string;
  price: string;
  verified: string;
  uptime: string;
  status: string;
};

/* ---------------- modal shell ---------------- */

function ModalShell({
  open,
  onClose,
  code,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-mono">
      <motion.div
        className="absolute inset-0 bg-black/90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col border border-white/25 bg-black text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/15 px-4 py-2">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/70">
            <span className="text-white/30">{code}</span>
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-white/30 p-1 text-white/60 hover:bg-white hover:text-black transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </motion.div>
    </div>
  );
}

function FlowField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  suffix,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: string;
}) {
  return (
    <div className="border border-white/20 px-2 py-1.5">
      <div className="text-[9px] tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        {onChange ? (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-[11px] tabular-nums outline-none placeholder:text-white/25"
          />
        ) : (
          <span className="text-[11px] tabular-nums">{value}</span>
        )}
        {suffix && <span className="shrink-0 text-[10px] text-white/40">{suffix}</span>}
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  required,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer gap-3 border border-white/15 p-3 hover:border-white/30 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 accent-white"
      />
      <span className="text-[11px] leading-relaxed tracking-[0.04em] text-white/70">
        {children}
        {required && <span className="text-white/40"> (required)</span>}
      </span>
    </label>
  );
}

/* ---------------- list API (seller) ---------------- */

export function ListApiModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: (jobId: string, listingId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const [provider, setProvider] = useState("OpenAI-compatible");
  const [apiKey, setApiKey] = useState("");
  const [quota, setQuota] = useState("5000000");
  const [price, setPrice] = useState("0.002");
  const [verifyConsent, setVerifyConsent] = useState(false);
  const [autoList, setAutoList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const declaredNum = Number(quota.replace(/,/g, "")) || 0;
  const consentCeiling = Math.min(Math.ceil(declaredNum * 0.03), 5000);

  const canSubmit = apiKey.length >= 8 && verifyConsent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!requireAuth("Listing an API for sale")) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { jobId, listingId } = await createListing({
        apiKey,
        quotaToSell: declaredNum,
        askPriceUsdc: Number(price),
        providerKind: provider,
        claimedModel: "gpt-4o-mini",
        autoListAfterVerify: autoList,
      });
      onSubmitted(jobId, listingId);
      onClose();
      setApiKey("");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Verification failed to start");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalShell open={open} onClose={onClose} code="SL.1" title="List API for Sale">
          <div className="space-y-4 p-4">
            <div className="border border-white/20 bg-white/[0.03] p-3 text-[11px] leading-relaxed tracking-[0.04em] text-white/60">
              <div className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.22em] text-white/40">
                <KeyRound className="h-3.5 w-3.5" /> SELLER ONBOARDING
              </div>
              Paste your API key and authorize a small controlled capacity sample (typically 25–75 tokens).
              Tokenta infers execution capacity — not your exact remaining balance.
            </div>

            <div>
              <div className="mb-1.5 text-[9px] tracking-[0.2em] text-white/40">API PROVIDER</div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white"
              >
                <option>OpenAI-compatible</option>
                <option>Anthropic</option>
                <option>Google AI</option>
                <option>Custom REST endpoint</option>
              </select>
            </div>

            <FlowField
              label="API KEY"
              type="password"
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-••••••••••••••••"
            />

            <div className="grid grid-cols-2 gap-2">
              <FlowField label="QUOTA TO SELL" value={quota} onChange={setQuota} suffix="tokens" />
              <FlowField label="ASK PRICE" value={price} onChange={setPrice} suffix="USDC / M" />
            </div>

            <div className="border border-white/25 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] text-white">
                <ShieldCheck className="h-3.5 w-3.5" /> VERIFICATION NOTICE
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                Tokenta runs minimal real API samples (connectivity + one capacity probe). Typical use is{" "}
                <span className="text-white">~25–75 tokens</span>. Legal authorization ceiling: up to{" "}
                <span className="text-white">{consentCeiling.toLocaleString()} tokens</span> without new consent.
              </p>
            </div>

            <CheckRow checked={verifyConsent} onChange={setVerifyConsent} required>
              I authorize Tokenta controlled sampling on my API key (typically under 100 tokens; ceiling{" "}
              {consentCeiling.toLocaleString()} tokens). I understand this checks capacity, not exact balance.
            </CheckRow>

            {submitError && (
              <p className="text-[11px] text-red-400 border border-red-400/30 px-2 py-1">{submitError}</p>
            )}

            <CheckRow checked={autoList} onChange={setAutoList}>
              After verification passes, automatically publish any remaining surplus quota at my ask price.
            </CheckRow>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="flex w-full items-center justify-center gap-2 border border-white bg-white py-2.5 text-[11px] tracking-[0.24em] text-black transition-colors disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-white/10 disabled:text-white/30"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />{" "}
              {submitting ? "STARTING VERIFY…" : "LIST API · START VERIFY"}
            </button>
          </div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
}

/* ---------------- buy API (buyer) ---------------- */

export function BuyApiModal({
  open,
  onClose,
  asset,
  onPurchased,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  onPurchased: (orderId: string) => void;
}) {
  const { shortAddress, authenticated, login } = useTokentaWallet();
  const { requireAuth } = useAuth();
  const [mode, setMode] = useState<"BUYOUT" | "PARTIAL">("BUYOUT");
  const [qty, setQty] = useState("2500000");

  const estTotal = mode === "BUYOUT" ? "Full listing" : `${(parseFloat(qty || "0") * parseFloat(asset.price) / 1_000_000).toFixed(2)} USDC`;

  return (
    <AnimatePresence>
      {open && (
        <ModalShell open={open} onClose={onClose} code="BY.1" title="Buy Verified API">
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-px bg-white/10 text-[11px]">
              {[
                ["ASSET", asset.ticker],
                ["TYPE", asset.type],
                ["VERIFIED", asset.verified],
                ["UPTIME", `${asset.uptime}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between bg-black px-3 py-2">
                  <span className="text-white/40 tracking-[0.14em]">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] tracking-[0.18em] text-white/50">
              <Lock className="h-3 w-3" />{" "}
              {authenticated ? `WALLET ${shortAddress} · CONNECTED` : "WALLET NOT CONNECTED"}
            </div>

            <p className="text-[11px] leading-relaxed text-white/60">
              This listing passed Tokenta verification. Funds lock in escrow until delivery and final proof complete.
            </p>

            <div className="flex border border-white/30 text-[10px] tracking-[0.2em]">
              <button
                type="button"
                onClick={() => setMode("BUYOUT")}
                className={`flex-1 py-2 ${mode === "BUYOUT" ? "bg-white text-black" : "text-white/60"}`}
              >
                FULL BUYOUT
              </button>
              <button
                type="button"
                onClick={() => setMode("PARTIAL")}
                className={`flex-1 border-l border-white/30 py-2 ${mode === "PARTIAL" ? "bg-white text-black" : "text-white/60"}`}
              >
                PARTIAL QUOTA
              </button>
            </div>

            {mode === "PARTIAL" && (
              <FlowField label="QUANTITY" value={qty} onChange={setQty} suffix={asset.unit} />
            )}

            <div className="flex justify-between border-t border-white/10 pt-2 text-[11px]">
              <span className="text-white/40 tracking-[0.16em]">EST. TOTAL</span>
              <span className="tabular-nums">{estTotal}</span>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!requireAuth("Purchasing verified API access")) return;
                const listingId = asset.listingId;
                if (listingId) {
                  const purchase = await purchaseListingTerminal({
                    listingId,
                    mode,
                    quantity: mode === "PARTIAL" ? Number(qty.replace(/,/g, "")) : undefined,
                  });
                  if (purchase?.orderId) {
                    onPurchased(purchase.orderId);
                    onClose();
                    return;
                  }
                }
                onPurchased("ORD-78214");
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 border border-white bg-white py-2.5 text-[11px] tracking-[0.24em] text-black hover:bg-white/90"
            >
              <ArrowDownRight className="h-3.5 w-3.5" /> BUY VERIFIED API · LOCK ESCROW
            </button>
          </div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
}

/* ---------------- market banners ---------------- */

export function MarketActionBanner({
  mode,
  onListApi,
  onBrowseVerified,
}: {
  mode: Role;
  onListApi: () => void;
  onBrowseVerified: () => void;
}) {
  if (mode === "SELL") {
    return (
      <motion.div className="border-b border-white/15 bg-white/[0.03] px-4 py-2 text-[10px] tracking-[0.18em] text-white/50">
        SELL · List on the user marketplace or use Tokenta buyback for instant liquidity
      </motion.div>
    );
  }


  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/15 bg-white/[0.03] px-4 py-2">
      <div>
        <div className="text-[10px] tracking-[0.24em] text-white/40">BUY WORKSPACE</div>
        <div className="mt-0.5 text-[11px] text-white/70">
          Purchase from user marketplace or Tokenta Direct — filter by source above
        </div>
      </div>
      <button
        type="button"
        onClick={onBrowseVerified}
        className="shrink-0 border border-white bg-white px-4 py-2 text-[10px] tracking-[0.22em] text-black hover:bg-white/90"
      >
        BUY VERIFIED API
      </button>
    </div>
  );
}

/* ---------------- order detail ---------------- */

export function OrderDetailView({
  orderId,
  mode,
  onBack,
  onOpenChat,
  onOpenVerify,
  onBuyAgain,
  onRequestPrePurchase,
  activeJobId,
}: {
  orderId: string;
  mode: Role;
  onBack: () => void;
  onOpenChat: () => void;
  onOpenVerify: () => void;
  onBuyAgain?: () => void;
  onRequestPrePurchase?: () => void;
  activeJobId?: string | null;
}) {
  const order = orders.find((o) => o.id === orderId) ?? orders[0];
  const [trail, setTrail] = useState<VerificationTrailEntry[]>([]);
  const [disputeProof, setDisputeProof] = useState<VerificationProof | null>(null);
  const [proofAnchorStatus, setProofAnchorStatus] = useState<ProofAnchorStatus | null>(null);
  const [anchoring, setAnchoring] = useState(false);
  const [networkDryRun, setNetworkDryRun] = useState(true);
  const [receiptPreview, setReceiptPreview] = useState<{
    terminalOutcome?: string;
    proofHash?: string;
    anchorTx?: string | null;
    estimatedUsdc?: string;
  } | null>(null);
  const relatedVerify = verifyFeed.filter((v) => v.asset === order.asset).slice(0, 5);

  useEffect(() => {
    void fetchTerminalNetwork().then((n) => {
      if (n) setNetworkDryRun(n.dryRun);
    });
  }, []);

  useEffect(() => {
    void fetchOrderVerificationTrail(orderId).then((entries) => {
      if (entries.length) setTrail(entries);
      const latest = entries[0];
      if (latest?.proofHash) {
        void fetchVerificationProof(latest.proofHash).then((r) => {
          if (r?.proof) setDisputeProof(r.proof);
        });
        void fetchProofAnchor(latest.proofHash).then((a) => {
          if (a) setProofAnchorStatus(a.anchor?.status ?? a.status);
        });
      }
    });
  }, [orderId, activeJobId]);

  useEffect(() => {
    if (!activeJobId) return;
    void fetchTerminalReceipt(activeJobId).then((r) => {
      if (!r) return;
      const rec = r as {
        terminal_outcome?: string;
        proof_hash?: string;
        anchor?: { anchor_tx?: string | null };
        cost?: { estimated_usdc?: string };
      };
      setReceiptPreview({
        terminalOutcome: rec.terminal_outcome,
        proofHash: rec.proof_hash,
        anchorTx: rec.anchor?.anchor_tx ?? null,
        estimatedUsdc: rec.cost?.estimated_usdc,
      });
    });
  }, [activeJobId]);

  return (
    <motion.div className="flex h-full min-h-0 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between border-b border-white/15 px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="text-[10px] tracking-[0.2em] text-white/50 hover:text-white"
        >
          ← BACK TO ORDERS
        </button>
        <span className="text-[10px] tracking-[0.22em] text-white/40">TRADE DESK · ORDER DETAIL</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12">
        <div className="col-span-8 border-r border-white/15 overflow-auto">
          <section className="border-b border-white/15 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.28em] text-white/40">ORDER ID</div>
                <div className="mt-1 text-[18px] tracking-[0.12em]">{order.id}</div>
              </div>
              <span className="border border-white/30 px-2 py-1 text-[10px] tracking-[0.18em]">{order.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px bg-white/10 text-[11px]">
              {[
                ["SIDE", order.side],
                ["ASSET", order.asset],
                ["QUANTITY", order.qty],
                ["PRICE", order.price],
                ["VALUE", `${order.value} USDC`],
                ["ESCROW", order.escrow],
                ["COUNTERPARTY", order.counterparty],
                ["MODE", mode],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between bg-black px-3 py-2">
                  <span className="text-white/40 tracking-[0.14em]">{k}</span>
                  <span className={k === "ORDER ID" ? "tracking-[0.1em]" : "tabular-nums"}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4">
            <div className="mb-3 text-[10px] tracking-[0.22em] text-white/40">VERIFICATION TRAIL (THIS ORDER)</div>
            <p className="mb-3 text-[11px] text-white/50">
              Proofs tied to this trade. For network-wide verification, open Verify Pipeline (F2).
            </p>
            <table className="w-full text-[11px]">
              <thead className="border-b border-white/15 text-white/40">
                <tr>
                  {["TIME", "CONTEXT", "OUTCOME", "TOKENS", "PROOF"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-normal tracking-[0.14em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(trail.length ? trail : []).map((v) => (
                  <tr key={v.jobId} className="border-b border-white/5">
                    <td className="px-2 py-1.5 tabular-nums text-white/60">{v.recordedAt.slice(11, 19)}</td>
                    <td className="px-2 py-1.5">{v.context}</td>
                    <td className="px-2 py-1.5">{v.terminalOutcome}</td>
                    <td className="px-2 py-1.5 tabular-nums">{v.totalTokensUsed}</td>
                    <td className="px-2 py-1.5 font-mono text-[9px]">{v.proofHash.slice(0, 12)}…</td>
                  </tr>
                ))}
                {!trail.length &&
                  relatedVerify.map((v, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-2 py-1.5 tabular-nums text-white/60">{v.ts}</td>
                      <td className="px-2 py-1.5">MOCK</td>
                      <td className="px-2 py-1.5">{v.result}</td>
                      <td className="px-2 py-1.5">—</td>
                      <td className="px-2 py-1.5 tabular-nums">{v.latency}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {disputeProof && (
              <div className="mt-3 border border-white/20 p-3 text-[10px] text-white/60 space-y-1">
                <div className="tracking-[0.18em] text-white/40">DISPUTE EVIDENCE (§14)</div>
                <div>Outcome: {disputeProof.terminalOutcome} · Burn: {disputeProof.totalTokensUsed} tokens</div>
                <div>Probes: {disputeProof.probeManifest.length} · Hash: {disputeProof.proofHash.slice(0, 16)}…</div>
                {proofAnchorStatus && proofAnchorStatus !== "NONE" && (
                  <div>Chain anchor: {proofAnchorStatus}</div>
                )}
                {disputeProof.failureCode && <div>Code: {disputeProof.failureCode}</div>}
                <a
                  href={proofDownloadUrl(disputeProof.proofHash)}
                  className="inline-block mt-2 tracking-[0.16em] text-white/80 underline hover:text-white"
                  download
                >
                  DOWNLOAD PROOF JSON
                </a>
                {disputeProof.terminalOutcome === "PASS" && proofAnchorStatus !== "ANCHORED" && (
                  <button
                    type="button"
                    disabled={anchoring}
                    onClick={async () => {
                      setAnchoring(true);
                      await submitTerminalAnchor(disputeProof.proofHash, activeJobId ?? undefined);
                      const a = await fetchProofAnchor(disputeProof.proofHash);
                      if (a) setProofAnchorStatus(a.anchor?.status ?? a.status);
                      setAnchoring(false);
                    }}
                    className="mt-2 block w-full border border-white/30 py-1.5 text-[10px] tracking-[0.18em] hover:bg-white/10 disabled:opacity-40"
                  >
                    {anchoring
                      ? "ANCHORING…"
                      : networkDryRun
                        ? "ANCHOR ON BASE SEPOLIA (DRY-RUN)"
                        : "ANCHOR ON BASE SEPOLIA"}
                  </button>
                )}
                {receiptPreview?.anchorTx?.startsWith("0x") && (
                  <a
                    href={explorerTxUrl(receiptPreview.anchorTx)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-[10px] tracking-[0.16em] text-white/80 underline hover:text-white"
                  >
                    VIEW ON BASESCAN SEPOLIA
                  </a>
                )}
              </div>
            )}
            {receiptPreview && (
              <div className="mt-3 border border-white/20 p-3 text-[10px] text-white/60 space-y-1">
                <div className="tracking-[0.18em] text-white/40">EXECUTION RECEIPT</div>
                <div>Outcome: {receiptPreview.terminalOutcome ?? "—"}</div>
                <div>Proof: {receiptPreview.proofHash ? `${receiptPreview.proofHash.slice(0, 16)}…` : "—"}</div>
                <div>Anchor tx: {receiptPreview.anchorTx ? `${receiptPreview.anchorTx.slice(0, 16)}…` : "pending"}</div>
                <div>Estimated cost: {receiptPreview.estimatedUsdc ?? "—"} USDC</div>
              </div>
            )}
          </section>
        </div>

        <div className="col-span-4 flex flex-col">
          <div className="border-b border-white/15 p-4">
            <div className="text-[10px] tracking-[0.22em] text-white/40">ACTIONS</div>
            <motion.div className="mt-3 space-y-2">
              {mode === "BUY" && order.status !== "SETTLED" && (
                <button
                  type="button"
                  onClick={onBuyAgain}
                  className="flex w-full items-center justify-between border border-white bg-white px-3 py-2 text-left text-[10px] tracking-[0.18em] text-black"
                >
                  COMPLETE PURCHASE <ChevronRight className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenChat}
                className="flex w-full items-center justify-between border border-white/30 px-3 py-2 text-left text-[10px] tracking-[0.18em] hover:bg-white hover:text-black"
              >
                <span className="flex items-center gap-2">
                  <MessagesSquare className="h-3 w-3" /> OPEN ORDER ROOM
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>
              {mode === "BUY" && onRequestPrePurchase && (
                <button
                  type="button"
                  onClick={onRequestPrePurchase}
                  className="flex w-full items-center justify-between border border-white bg-white px-3 py-2 text-left text-[10px] tracking-[0.18em] text-black"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> REQUEST NEW VERIFICATION
                  </span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenVerify}
                className="flex w-full items-center justify-between border border-white/30 px-3 py-2 text-left text-[10px] tracking-[0.18em] hover:bg-white hover:text-black"
              >
                <span className="flex items-center gap-2">
                  <Activity className="h-3 w-3" /> VIEW VERIFY PIPELINE
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>
              {activeJobId && (
                <div className="border border-white/20 p-2">
                  <VerificationJobPanel jobId={activeJobId} />
                </div>
              )}
            </motion.div>
          </div>
          <div className="flex-1 p-4 text-[11px] text-white/50 leading-relaxed">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-white/40">
              <Check className="h-3 w-3" /> WHAT IS ORDER ROOM?
            </div>
            <p className="mt-2">
              Encrypted chat with your counterparty for this order only — delivery updates, proof attachments, and
              dispute messages. It is not the global verifier; use F2 for live network proofs.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- buyer pre-purchase verify ---------------- */

export function PrePurchaseVerifyModal({
  open,
  onClose,
  orderId,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  onSubmitted: (jobId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [qty, setQty] = useState("50000");
  const [feePaid, setFeePaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!requireAuth("Buyer pre-purchase verification")) return;
    if (!feePaid || apiKey.length < 8) return;
    setError(null);
    try {
      const res = await createPrePurchaseVerification({
        orderId,
        buyerId: "buyer-demo",
        apiKey,
        declaredQuantity: Number(qty.replace(/,/g, "")) || 50_000,
        payerPaysFee: true,
      });
      onSubmitted(res.jobId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalShell open={open} onClose={onClose} code="BP.1" title="Pre-Purchase Verification">
          <div className="space-y-3 p-4 text-[11px]">
            <p className="text-white/60">
              Buyer-triggered re-verify (costLiability: BUYER_TRIGGERED). Fee gate required before L2.
              Uses only the key you provide — seller listing quota is not debited.
            </p>
            <div className="border border-white/15 bg-white/[0.03] p-2 text-[10px] text-white/50">
              Seller notification: the counterparty may receive a notice that you ran a separate
              funded capacity check on this order. No seller-stored API key is used.
            </div>
            <FlowField label="API KEY (BUYER-FUNDED TEST)" type="password" value={apiKey} onChange={setApiKey} />
            <FlowField label="DECLARED QTY" value={qty} onChange={setQty} suffix="tokens" />
            <CheckRow checked={feePaid} onChange={setFeePaid} required>
              I paid the 0.1% verification fee (escrow instruction separate).
            </CheckRow>
            {error && <p className="text-[10px] text-red-400">{error}</p>}
            <button
              type="button"
              disabled={!feePaid || apiKey.length < 8}
              onClick={() => void submit()}
              className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black disabled:opacity-40"
            >
              RUN PRE-PURCHASE VERIFY
            </button>
          </div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Tokenta buyback (3-step verify) ---------------- */

export function BuybackVerifyModal({
  open,
  onClose,
  offer,
  onConfirmed,
}: {
  open: boolean;
  onClose: () => void;
  offer: BuybackOffer;
  onConfirmed: (orderId: string) => void;
}) {
  const { requireAuth } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState("OpenAI-compatible");
  const [apiKey, setApiKey] = useState("");
  const [quantity, setQuantity] = useState("50000");
  const [verifyConsent, setVerifyConsent] = useState(false);
  const [depositAck, setDepositAck] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{
    orderId: string;
    escrowId: string;
  } | null>(null);

  const declaredNum = Number(quantity.replace(/,/g, "")) || 0;
  const consentCeiling = Math.min(Math.ceil(declaredNum * 0.03), 5000);

  const reset = () => {
    setStep(1);
    setJobId(null);
    setSubmitError(null);
    setConfirmResult(null);
    setApiKey("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const startVerify = async () => {
    if (!requireAuth("Tokenta buyback sale")) return;
    if (apiKey.length < 8 || !verifyConsent) return;
    setSubmitError(null);
    try {
      const res = await createVerificationJob({
        apiKey,
        declaredQuantity: declaredNum,
        provider,
        context: "TOKENTA_BUYBACK",
        buybackOfferId: offer.id,
        claimedModel: provider.includes("Anthropic")
          ? "claude-3-5-haiku-20241022"
          : provider.includes("Google")
            ? "gemini-1.5-flash"
            : "gpt-4o-mini",
      });
      setJobId(res.jobId);
      setStep(2);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to start buyback verification");
    }
  };

  const handleProofComplete = () => {
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!jobId || !depositAck) return;
    setConfirming(true);
    setSubmitError(null);
    try {
      const res = await confirmTokentaBuyback({
        jobId,
        buybackOfferId: offer.id,
        quantity: declaredNum,
        depositAcknowledged: true,
      });
      setConfirmResult({ orderId: res.orderId, escrowId: res.escrowId });
      onConfirmed(res.orderId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Buyback confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <ModalShell open={open} onClose={handleClose} code="BB.1" title="Sell to Tokenta · Verification">
          <div className="space-y-4 p-4">
            <div className="flex gap-2 text-[9px] tracking-[0.2em] text-white/40">
              {(["1 · KEY", "2 · VERIFY", "3 · CONFIRM"] as const).map((label, i) => (
                <span
                  key={label}
                  className={step === i + 1 ? "text-white border-b border-white" : "text-white/35"}
                >
                  {label}
                </span>
              ))}
            </div>

            {step === 1 && (
              <>
                <div className="border border-white/20 bg-white/[0.03] p-3 text-[11px] text-white/60">
                  <div className="text-[10px] tracking-[0.22em] text-white/40">TOKENTA BUYBACK · {offer.provider}</div>
                  <p className="mt-1">
                    Step 1/3: Controlled capacity sample (typically 25–75 tokens). Tokenta estimates whether your key
                    can support the quantity you declare — not your exact remaining balance.
                  </p>
                  <p className="mt-2 text-white/45">
                    Offer {offer.id} · {offer.minQty} min · {offer.buybackPrice}
                  </p>
                </div>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none"
                >
                  <option>OpenAI-compatible</option>
                  <option>Anthropic</option>
                  <option>Google AI</option>
                </select>
                <FlowField label="API KEY" type="password" value={apiKey} onChange={setApiKey} />
                <FlowField label="QUANTITY TO SELL" value={quantity} onChange={setQuantity} suffix="tokens" />
                <CheckRow checked={verifyConsent} onChange={setVerifyConsent} required>
                  I authorize a controlled verification sample. Typical burn ~25–75 tokens; legal ceiling up to{" "}
                  {consentCeiling.toLocaleString()} tokens without new consent. Seller-paid probes.
                </CheckRow>
                {submitError && <p className="text-[10px] text-red-400">{submitError}</p>}
                <button
                  type="button"
                  disabled={apiKey.length < 8 || !verifyConsent}
                  onClick={() => void startVerify()}
                  className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black disabled:opacity-40"
                >
                  START VERIFY · TEST 1/3
                </button>
              </>
            )}

            {step === 2 && jobId && (
              <>
                <p className="text-[10px] tracking-[0.18em] text-white/50">TEST 2/3 · Pipeline running</p>
                <VerificationJobPanel jobId={jobId} onComplete={handleProofComplete} />
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full border border-white/30 py-2 text-[10px] tracking-[0.18em] hover:bg-white hover:text-black"
                >
                  SKIP TO RESULT
                </button>
              </>
            )}

            {step === 3 && jobId && (
              <>
                <p className="text-[10px] tracking-[0.18em] text-white/50">TEST 3/3 · Confirm sale</p>
                <VerificationJobPanel jobId={jobId} />
                {!confirmResult ? (
                  <>
                    <CheckRow checked={depositAck} onChange={setDepositAck} required>
                      I acknowledge 200% seller deposit held 30 days, key rotation, and fraud monitoring per buyback
                      terms.
                    </CheckRow>
                    {submitError && <p className="text-[10px] text-red-400">{submitError}</p>}
                    <button
                      type="button"
                      disabled={!depositAck || confirming}
                      onClick={() => void handleConfirm()}
                      className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black disabled:opacity-40"
                    >
                      {confirming ? "CONFIRMING…" : "CONFIRM BUYBACK · ON PASS"}
                    </button>
                  </>
                ) : (
                  <div className="border border-white/25 p-3 text-[11px] space-y-1">
                    <div className="text-[10px] tracking-[0.2em] text-white/40">BUYBACK CONFIRMED</div>
                    <div>Order {confirmResult.orderId}</div>
                    <div>Escrow {confirmResult.escrowId}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </ModalShell>
      )}
    </AnimatePresence>
  );
}

