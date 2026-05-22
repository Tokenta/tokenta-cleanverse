import { useEffect, useState } from "react";
import {
  bindListingVerification,
  cancelTerminalJob,
  getVerificationJob,
  signBindPayloadDev,
  subscribeJobEvents,
  terminalReceiptExportUrl,
  type VerificationJobEvent,
  type VerificationProof,
} from "../api/verification";

export function VerificationJobPanel({
  jobId,
  listingId,
  onComplete,
}: {
  jobId: string;
  listingId?: string | null;
  onComplete?: (proof: VerificationProof | undefined) => void;
}) {
  const [events, setEvents] = useState<VerificationJobEvent[]>([]);
  const [proof, setProof] = useState<VerificationProof | undefined>();
  const [bindMsg, setBindMsg] = useState<string | null>(null);
  const [binding, setBinding] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getVerificationJob(jobId).then((j) => {
      if (cancelled) return;
      setJobStatus(String(j.status ?? ""));
      if (j.events?.length) setEvents(j.events);
      if (j.proof) setProof(j.proof);
    });

    const unsub = subscribeJobEvents(
      jobId,
      (ev) => {
        setEvents((prev) => [...prev, ev]);
        if (ev.proof) setProof(ev.proof);
      },
      () => {
        void getVerificationJob(jobId).then((j) => {
          if (j.proof) {
            setProof(j.proof);
            onComplete?.(j.proof);
          }
        });
      },
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [jobId, onComplete]);

  const outcome = proof?.terminalOutcome ?? "—";
  const band = proof?.estimatedExecutableQuantityRange;

  return (
    <div className="border border-white/25 bg-white/[0.03] p-3 text-[11px] space-y-2">
      <div className="flex justify-between tracking-[0.18em] text-[10px] text-white/50">
        <span>VERIFICATION JOB</span>
        <span className="text-white">{jobId.slice(0, 20)}…</span>
      </div>
      <div className="grid grid-cols-2 gap-2 tabular-nums">
        <div>
          <span className="text-white/40">OUTCOME </span>
          <span className={outcome === "PASS" ? "text-white" : outcome === "FAIL" ? "text-red-400" : "text-amber-300"}>
            {outcome}
          </span>
        </div>
        <div>
          <span className="text-white/40">BURN </span>
          <span>{proof?.totalTokensUsed ?? "—"} tok</span>
        </div>
        <div>
          <span className="text-white/40">CAPABILITY </span>
          <span>{proof ? (proof.capabilityScore * 100).toFixed(0) + "%" : "—"}</span>
        </div>
        <div>
          <span className="text-white/40">BAND </span>
          <span>{band?.band ?? "—"}</span>
        </div>
      </div>
      {listingId && proof?.terminalOutcome === "PASS" && (
        <button
          type="button"
          disabled={binding}
          onClick={async () => {
            setBinding(true);
            setBindMsg(null);
            const sig = await signBindPayloadDev({ listingId, jobId });
            const res = await bindListingVerification(listingId, jobId, sig?.signature);
            setBinding(false);
            setBindMsg(res ? `Bound ${res.proofHash.slice(0, 14)}…` : "Bind failed — is API up?");
          }}
          className="w-full border border-white/30 py-1.5 text-[10px] tracking-[0.18em] hover:bg-white/10 disabled:opacity-40"
        >
          {binding ? "BINDING…" : "BIND VERIFICATION TO LISTING"}
        </button>
      )}
      {bindMsg && <p className="text-[10px] text-white/50">{bindMsg}</p>}
      <div className="flex flex-wrap gap-2">
        {(jobStatus === "QUEUED" || jobStatus === "queued" || jobStatus === "RUNNING" || jobStatus === "running") && (
          <button
            type="button"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              const ok = await cancelTerminalJob(jobId);
              setCancelling(false);
              setBindMsg(ok ? "Job cancelled" : "Cancel failed");
              if (ok) setJobStatus("cancelled");
            }}
            className="border border-white/30 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10 disabled:opacity-40"
          >
            {cancelling ? "CANCELLING…" : "CANCEL JOB"}
          </button>
        )}
        {proof && (
          <a
            href={terminalReceiptExportUrl(jobId)}
            className="border border-white/30 px-2 py-1 text-[9px] tracking-[0.16em] hover:bg-white/10"
            download
          >
            EXPORT RECEIPT
          </a>
        )}
      </div>
      <ul className="max-h-24 overflow-auto border border-white/10 divide-y divide-white/5">
        {events.slice(-8).map((ev, i) => (
          <li key={i} className="px-2 py-1 text-white/60">
            {ev.step ?? ev.type}: {ev.message ?? ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
