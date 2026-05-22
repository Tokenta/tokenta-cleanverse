import { useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { TOKENTA_CHAIN_ID } from "../chain-config";

/** Ensure Privy wallet is on Base Sepolia (84532) after login. */
export function useBaseSepoliaWallet(authenticated: boolean) {
  const { wallets } = useWallets();

  useEffect(() => {
    if (!authenticated || wallets.length === 0) return;
    const wallet = wallets[0];
    void (async () => {
      try {
        const chainId = await wallet.getChainId();
        if (chainId !== TOKENTA_CHAIN_ID) {
          await wallet.switchChain(TOKENTA_CHAIN_ID);
        }
      } catch {
        /* user may reject switch — non-fatal */
      }
    })();
  }, [authenticated, wallets]);
}
