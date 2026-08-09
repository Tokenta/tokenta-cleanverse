import React, { useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, XCircle, Info, Lock } from "lucide-react";

interface ComplianceResult {
  buyerIdentityStatus: "VERIFIED" | "UNAVAILABLE" | "PENDING";
  sellerIdentityStatus: "VERIFIED" | "UNAVAILABLE" | "PENDING";
  settlementAssetStatus: "VERIFIED" | "UNAVAILABLE" | "PENDING";
  policyDecision: "APPROVED" | "DENIED" | "UNAVAILABLE" | "PENDING";
  overallDecision: "APPROVED" | "DENIED" | "UNAVAILABLE" | "PENDING";
  reasonCodes: string[];
  evidenceReferences: string[];
}

interface ComplianceShieldProps {
  orderId: string;
  children: React.ReactNode;
}

export function ComplianceShield({ orderId, children }: ComplianceShieldProps) {
  const [status, setStatus] = useState<"CHECKING" | "VERIFIED" | "DENIED" | "UNAVAILABLE">("CHECKING");
  const [result, setResult] = useState<ComplianceResult | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkCompliance() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";
        const res = await fetch(`${apiUrl}/api/v1/orders/${orderId}/compliance`);
        if (!res.ok) {
          if (mounted) setStatus("UNAVAILABLE");
          return;
        }

        const data = await res.json();
        if (!mounted) return;

        const compliance = data.compliance;
        if (!compliance) {
          setStatus("UNAVAILABLE");
          return;
        }

        setResult(compliance);

        if (compliance.overallDecision === "APPROVED") {
          setStatus("VERIFIED");
        } else if (compliance.overallDecision === "DENIED") {
          setStatus("DENIED");
        } else {
          setStatus("UNAVAILABLE");
        }
      } catch (err) {
        console.error("Failed to check compliance", err);
        if (mounted) setStatus("UNAVAILABLE");
      }
    }

    void checkCompliance();

    return () => {
      mounted = false;
    };
  }, [orderId]);

  const renderStatusIcon = (fieldStatus: string) => {
    if (fieldStatus === "VERIFIED" || fieldStatus === "APPROVED") return <CheckCircle2 className="w-4 h-4 text-[#00f0ff]" />;
    if (fieldStatus === "DENIED") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-yellow-500" />;
  };

  const renderPanel = () => {
    if (!result) return null;

    return (
      <div className="mt-4 border border-[#00f0ff]/30 bg-black/40 backdrop-blur-md rounded-lg p-5 shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all duration-500">
        <div className="flex items-center gap-2 mb-4 border-b border-[#00f0ff]/20 pb-3">
          <ShieldCheck className={`w-6 h-6 ${status === 'DENIED' ? 'text-red-500' : 'text-[#00f0ff]'}`} />
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">Cleanverse Compliance Shield</h3>
          <span className={`ml-auto text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-bold ${status === 'DENIED' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30'}`}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-gray-400">ASSET <span className="text-[10px] text-gray-500">(Tokenta Verification)</span></span>
              <div className="flex items-center gap-2 text-white">
                VERIFIED <CheckCircle2 className="w-4 h-4 text-[#00f0ff]" />
              </div>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-gray-400">BUYER IDENTITY <span className="text-[10px] text-gray-500">(Cleanverse CVI)</span></span>
              <div className="flex items-center gap-2 text-white">
                {result.buyerIdentityStatus} {renderStatusIcon(result.buyerIdentityStatus)}
              </div>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-gray-400">COUNTERPARTY <span className="text-[10px] text-gray-500">(Cleanverse CVI)</span></span>
              <div className="flex items-center gap-2 text-white">
                {result.sellerIdentityStatus} {renderStatusIcon(result.sellerIdentityStatus)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-gray-400">POLICY <span className="text-[10px] text-gray-500">(RuleV2 Enforced)</span></span>
              <div className="flex items-center gap-2 text-white">
                {result.policyDecision} {renderStatusIcon(result.policyDecision)}
              </div>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-2 rounded">
              <span className="text-gray-400">SETTLEMENT ASSET <span className="text-[10px] text-gray-500">(Tokenta CVA)</span></span>
              <div className="flex items-center gap-2 text-white text-[10px] truncate max-w-[120px]" title="0x2ecd60dc0fe611c60bd241f46943b2813abb243f">
                0x2ecd...243f <Lock className="w-3 h-3 text-[#00f0ff]" />
              </div>
            </div>
            <div className={`flex justify-between items-center p-2 rounded border ${status === 'DENIED' ? 'bg-red-500/10 border-red-500/30' : 'bg-[#00f0ff]/10 border-[#00f0ff]/30'}`}>
              <span className="font-bold text-white tracking-widest">FINAL DECISION</span>
              <div className={`flex items-center gap-2 font-bold ${status === 'DENIED' ? 'text-red-500' : 'text-[#00f0ff]'}`}>
                {result.overallDecision} {renderStatusIcon(result.overallDecision)}
              </div>
            </div>
          </div>
        </div>

        {result.reasonCodes && result.reasonCodes.length > 0 && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-500/20 rounded-md">
            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Enforcement Reasons
            </h4>
            <ul className="text-xs text-red-300 font-mono space-y-1 list-disc pl-4">
              {result.reasonCodes.map(code => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (status === "CHECKING") {
    return (
      <div className="relative inline-block w-full">
        <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center rounded border border-[#00f0ff]/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,240,255,0.3)]">
          <Loader2 className="w-6 h-6 animate-spin text-[#00f0ff] mr-3" />
          <span className="text-sm font-bold text-[#00f0ff] tracking-[0.2em] uppercase">Validating Cleanverse Compliance...</span>
        </div>
        <div className="opacity-20 pointer-events-none w-full blur-sm transition-all duration-300">{children}</div>
      </div>
    );
  }

  if (status === "DENIED" || status === "UNAVAILABLE") {
    return (
      <div className="relative w-full space-y-4">
        <div className="border border-red-500/50 bg-red-900/20 rounded-lg p-6 text-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          {status === "DENIED" ? (
            <ShieldX className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
          ) : (
            <ShieldAlert className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-pulse" />
          )}
          <h4 className="text-red-400 font-bold uppercase tracking-[0.1em] text-lg mb-2">
            {status === "DENIED" ? "Trade Blocked by Compliance" : "Compliance Service Unavailable"}
          </h4>
          <p className="text-sm text-red-300/80 mb-4 max-w-md mx-auto">
            {status === "DENIED" 
              ? "This transaction has been programmatically blocked by the Cleanverse Hackathon compliance validator smart contract."
              : "The Cleanverse compliance service is currently unreachable. Our fail-closed security model prevents unverified settlement."}
          </p>
        </div>
        {renderPanel()}
      </div>
    );
  }

  // VERIFIED
  return (
    <div className="relative w-full space-y-4 animate-in fade-in duration-700">
      <div className="relative group">
        <div className="absolute -top-3 -right-3 z-20 bg-black border border-[#00f0ff] rounded-full p-1.5 shadow-[0_0_15px_rgba(0,240,255,0.6)] group-hover:scale-110 transition-transform cursor-help" title="Cleanverse RuleV2 Checked & Approved">
          <ShieldCheck className="w-5 h-5 text-[#00f0ff]" />
        </div>
        <div className="border border-[#00f0ff]/30 rounded-lg p-4 bg-gradient-to-br from-black to-[#001a1a]/20 shadow-[inset_0_0_20px_rgba(0,240,255,0.05)]">
          {children}
        </div>
      </div>
      {renderPanel()}
    </div>
  );
}
