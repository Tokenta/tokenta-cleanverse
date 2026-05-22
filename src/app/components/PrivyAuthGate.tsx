import { useEffect } from "react";
import { motion } from "motion/react";
import { Lock, Wallet } from "lucide-react";
import tokentaLogo from "../../assets/tokenta-logo.png";
import { useTokentaWallet } from "../hooks/useTokentaWallet";

export function PrivyAuthGate() {
  const { ready, login } = useTokentaWallet();

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      login();
    }, 400);
    return () => window.clearTimeout(timer);
    // Open login once when Privy is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black font-mono text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center border border-white/20 bg-black px-8 py-10">
        <img
          src={tokentaLogo}
          alt=""
          draggable={false}
          className="mb-6 h-8 w-auto object-contain select-none pointer-events-none"
        />

        <div className="mb-2 text-[10px] tracking-[0.32em] text-white/40">ACCESS CONTROL</div>
        <h1 className="text-center text-[13px] tracking-[0.22em]">TOKENTA TERMINAL</h1>
        <p className="mt-4 text-center text-[11px] leading-relaxed tracking-[0.06em] text-white/55">
          Connect your wallet via Privy to access the verifiable AI asset exchange. Authentication is required before
          entering the terminal.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            disabled={!ready}
            onClick={() => login()}
            className="flex w-full items-center justify-center gap-2 border border-white bg-white py-3 text-[11px] tracking-[0.24em] text-black transition-colors hover:bg-white/90 disabled:cursor-wait disabled:opacity-40"
          >
            <Wallet className="h-3.5 w-3.5" />
            {ready ? "CONNECT WALLET" : "INITIALIZING…"}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.18em] text-white/35">
            <Lock className="h-3 w-3" /> NON-CUSTODIAL · PRIVY SECURED
          </p>
        </div>

        <div className="mt-8 grid w-full grid-cols-3 gap-px bg-white/10 text-[9px] tracking-[0.14em]">
          {[
            ["STEP 1", "Wallet auth"],
            ["STEP 2", "Verify identity"],
            ["STEP 3", "Enter terminal"],
          ].map(([k, v]) => (
            <div key={k} className="bg-black px-2 py-2 text-center">
              <div className="text-white/35">{k}</div>
              <div className="mt-0.5 text-white/70">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
