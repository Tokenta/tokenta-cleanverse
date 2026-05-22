import { useEffect, useState } from "react";
import { fetchTerminalNetwork, type TerminalNetworkResponse } from "../api/verification";
import { TOKENTA_CHAIN_ID, TOKENTA_EXPLORER_URL, TOKENTA_NETWORK_SLUG } from "../chain-config";

const FALLBACK: TerminalNetworkResponse = {
  network: TOKENTA_NETWORK_SLUG,
  chainId: TOKENTA_CHAIN_ID,
  explorerUrl: TOKENTA_EXPLORER_URL,
  dryRun: true,
  treasurySignerConfigured: false,
  connected: false,
  blockNumber: null,
  gasPriceGwei: null,
  contractAddress: null,
};

export function useSettlementNetwork(pollMs = 15_000) {
  const [network, setNetwork] = useState<TerminalNetworkResponse>(FALLBACK);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      void fetchTerminalNetwork().then((n) => {
        if (cancelled || !n) return;
        setLive(true);
        setNetwork(n);
      });
    load();
    const t = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pollMs]);

  return { network, live };
}
